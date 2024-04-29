import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
const expect = chai.expect;

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {fetchMainnetContracts, increaseCvgCycle, increaseCvgCycleMainnet} from "../../fixtures/stake-dao";
import {ethers, network} from "hardhat";
import {Signer, parseEther} from "ethers";
import {Cvg, CvgSDT} from "../../../typechain-types/contracts/Token";
import {IContractsUserMainnet, IUsers} from "../../../utils/contractInterface";
import {
    BondDepository,
    BondPositionManager,
    CvgControlTower,
    ERC20,
    LockingPositionManager,
    LockingPositionService,
    QuestAirdrop,
    SdtStakingPositionService,
    VeCVG,
    SdtUtilities,
    SdtStakingPositionManager,
    CvgOracle,
} from "../../../typechain-types";
import {MerkleNode, MerkleHelper} from "../../../utils/MerkleHelper";
import {impersonateAccount, time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {TREASURY_AIRDROP, TREASURY_DAO} from "../../../resources/treasury";
import {setStorageBalanceOfAssets, setStorageBalanceOfAssetsOwner} from "../../../scripts/deployer/unit/XX_setStorageBalanceAssets";
import {GaugeController} from "../../../typechain-types-vyper";
import {TOKEN_ADDR_CRV, TOKEN_ADDR_FRAX, TOKEN_ADDR_SDT, TOKEN_ADDR_USDC} from "../../../resources/tokens/common";
import {MINT} from "../../../resources/constant";
import {FRAX_ORACLE_PARAMS, USDC_ORACLE_PARAMS} from "../../../resources/oracle_config";

const lockDuration = 41; //TO CHANGE IF NECESSARY (ex: actual cycle = 4 => lockDuration= 44)
describe.skip("Quest User Tests", () => {
    let treasuryDao: Signer, treasuryAirdrop: Signer;
    let owner: Signer, user1: Signer, user2: Signer, user3: Signer, user4: Signer, user5: Signer;
    let cvgContract: Cvg, questAirdropContract: QuestAirdrop;
    let contractsUsers: IContractsUserMainnet, users: IUsers, merkleRoot: string;
    let whitelist: MerkleNode[];
    let cvgControlTower: CvgControlTower,
        cvgSDT: CvgSDT,
        lockingPositionService: LockingPositionService,
        lockingPositionManager: LockingPositionManager,
        bondDepository: BondDepository,
        cvgSdtStaking: SdtStakingPositionService,
        sdCRVStaking: SdtStakingPositionService,
        sdANGLEStaking: SdtStakingPositionService,
        veCvg: VeCVG,
        gaugeController: GaugeController,
        bondPositionManager: BondPositionManager,
        sdtUtilities: SdtUtilities,
        sdtStakingPositionManager: SdtStakingPositionManager,
        cvgOracle: CvgOracle;

    let crv: ERC20, frax: ERC20, sdt: ERC20;

    before(async () => {
        contractsUsers = await loadFixture(fetchMainnetContracts);
        users = contractsUsers.users;
        await setStorageBalanceOfAssets(users);

        const QuestAirdropFactory = await ethers.getContractFactory("QuestAirdrop");
        questAirdropContract = await QuestAirdropFactory.deploy(contractsUsers.base.cvgControlTower);
        await questAirdropContract.waitForDeployment();

        cvgControlTower = contractsUsers.base.cvgControlTower;
        cvgContract = contractsUsers.cvg;
        cvgSDT = contractsUsers.cvgSDT;
        crv = contractsUsers.crv;
        frax = contractsUsers.frax;
        sdt = contractsUsers.sdt;
        lockingPositionService = contractsUsers.locking.lockingPositionService;
        lockingPositionManager = contractsUsers.locking.lockingPositionManager;
        bondPositionManager = contractsUsers.bondPositionManager;
        sdtStakingPositionManager = contractsUsers.sdtStakingPositionManager;
        bondDepository = contractsUsers.bondDepository;
        cvgSdtStaking = contractsUsers.cvgSdtStaking;
        sdCRVStaking = contractsUsers.sdAssetsStaking.sdCRVStaking;
        sdANGLEStaking = contractsUsers.sdAssetsStaking.sdANGLEStaking;
        veCvg = contractsUsers.locking.veCvg;
        gaugeController = contractsUsers.locking.gaugeController;
        sdtUtilities = contractsUsers.sdtUtilities;
        cvgOracle = contractsUsers.cvgOracle;

        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        user3 = users.user3;
        user4 = users.user4;
        user5 = users.user5;

        whitelist = [
            {address: await user1.getAddress(), amount: parseEther("1")},
            {address: await user2.getAddress(), amount: parseEther("2")},
            {address: await user3.getAddress(), amount: parseEther("3")},
            {address: await user4.getAddress(), amount: parseEther("4")},
            {address: await user5.getAddress(), amount: parseEther("5")},
        ];
        merkleRoot = MerkleHelper.getRootAddressAmount(whitelist);
        const amountEth = ethers.parseEther("10");
        await user1.sendTransaction({to: TREASURY_AIRDROP, value: amountEth});
        await user1.sendTransaction({to: TREASURY_DAO, value: amountEth});
        await impersonateAccount(TREASURY_AIRDROP);
        await impersonateAccount(TREASURY_DAO);
        const fraxStableParams = {
            aggregatorOracle: FRAX_ORACLE_PARAMS.aggregatorOracle,
            deltaLimitOracle: FRAX_ORACLE_PARAMS.deltaLimitOracle,
            minPrice: FRAX_ORACLE_PARAMS.minPrice,
            maxPrice: FRAX_ORACLE_PARAMS.maxPrice,
            maxLastUpdate: 86_400_000_000,
        };
        await (await cvgOracle.connect(await ethers.getSigner(TREASURY_DAO)).setStableParams(TOKEN_ADDR_FRAX, fraxStableParams)).wait();
        const usdcStableParams = {
            aggregatorOracle: USDC_ORACLE_PARAMS.aggregatorOracle,
            deltaLimitOracle: USDC_ORACLE_PARAMS.deltaLimitOracle,
            minPrice: USDC_ORACLE_PARAMS.minPrice,
            maxPrice: USDC_ORACLE_PARAMS.maxPrice,
            maxLastUpdate: 86_400_000_000,
        };
        await (await cvgOracle.connect(await ethers.getSigner(TREASURY_DAO)).setStableParams(TOKEN_ADDR_USDC, usdcStableParams)).wait();
        const cvgCurveDuoParams = {
            isReversed: true,
            isEthPriceRelated: false,
            poolAddress: "0xa7B0E924c2dBB9B4F576CCE96ac80657E42c3e42",
            deltaLimitOracle: 1000n,
            maxLastUpdate: 86_400_000_000,
            minPrice: 200000000000000000n,
            maxPrice: 10000000000000000000n,
            stablesToCheck: [TOKEN_ADDR_USDC],
        };
        await (await cvgOracle.connect(await ethers.getSigner(TREASURY_DAO)).setCurveDuoParams(cvgContract, cvgCurveDuoParams)).wait();
    });
    it("User1: do the tasks (FULL)", async () => {
        let user = user1;
        //LOCKING
        await cvgContract.connect(user).approve(lockingPositionService, ethers.MaxUint256);
        await lockingPositionService.connect(user).mintPosition(lockDuration, ethers.parseEther("1"), 100, user, true);
        await lockingPositionService.connect(user).mintPosition(lockDuration, ethers.parseEther("30000"), 0, user, true);
        //VOTING
        const tokensOwned = await lockingPositionManager.getTokenIdsForWallet(user);
        const votesUser = [
            {
                tokenId: tokensOwned[1],
                votes: [
                    {gauge_address: sdCRVStaking, weight: "5000"},
                    {gauge_address: cvgSdtStaking, weight: "3000"},
                    {gauge_address: sdANGLEStaking, weight: "2000"},
                ],
            },
        ];
        await gaugeController.connect(user).multi_vote(votesUser);
        //BONDING
        const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 3;
        const params = [
            {
                composedFunction: 0,
                token: TOKEN_ADDR_FRAX,
                gamma: 250000,
                bondDuration: 604800,
                isPaused: false,
                scale: 5000,
                minRoi: 80000,
                maxRoi: 150000,
                percentageOneTx: 1000,
                vestingTerm: 1814000,
                cvgToSell: ethers.parseEther("40000"),
                startBondTimestamp: timestamp,
            },
        ];
        await (await bondDepository.connect(await ethers.getSigner(TREASURY_DAO)).createBond(params)).wait();
        const nextBondId = await bondDepository.nextBondId();
        await (await frax.connect(user).approve(bondDepository, ethers.MaxUint256)).wait();
        await bondDepository.connect(user).depositAndLock(nextBondId - 1n, ethers.parseEther("250"), 0, MINT, lockDuration, 50);
        await bondDepository.connect(user).deposit(nextBondId - 1n, 0, ethers.parseEther("20000"), 0, user);
        //verify amount of CVG
        // const tokens = await bondPositionManager.getTokenIdsForWallet(user);
        // console.log(await bondDepository.getBondInfosPerTokenIds([tokens[0]]));

        //STAKING
        await (await sdt.connect(user).approve(cvgSDT, ethers.MaxUint256)).wait();
        await (await cvgSDT.connect(user).mint(user, ethers.parseEther("50000"))).wait();
        await (await sdt.connect(user).approve(sdtUtilities, ethers.MaxUint256)).wait();
        await (await crv.connect(user).approve(sdtUtilities, ethers.MaxUint256)).wait();
        await (await sdtUtilities.connect(user).convertAndStakeCvgSdt(0, 0, ethers.parseEther("1"), ethers.parseEther("1"))).wait();
        await (
            await sdtUtilities.connect(user).convertAndStakeSdAsset(0, sdCRVStaking, 0, ethers.parseEther("2000000"), 0, ethers.parseEther("2000000"), false)
        ).wait();
    });
    it("User2: do the tasks (HALF)", async () => {
        let user = user2;
        //LOCKING
        await cvgContract.connect(user).approve(lockingPositionService, ethers.MaxUint256);
        await lockingPositionService.connect(user).mintPosition(lockDuration, ethers.parseEther("5000"), 0, user, true); //"deploy_2500_veCVG": false, ???
        //VOTING
        const tokensOwned = await lockingPositionManager.getTokenIdsForWallet(user);
        const votesUser = [
            {
                tokenId: tokensOwned[0],
                votes: [
                    {gauge_address: sdCRVStaking, weight: "5000"},
                    {gauge_address: cvgSdtStaking, weight: "3000"},
                ],
            },
        ];
        await (await gaugeController.connect(user).multi_vote(votesUser)).wait();
        //BONDING
        const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 3;
        const params = [
            {
                composedFunction: 0,
                token: TOKEN_ADDR_FRAX,
                gamma: 250000,
                bondDuration: 604800,
                isPaused: false,
                scale: 5000,
                minRoi: 80000,
                maxRoi: 150000,
                percentageOneTx: 1000,
                vestingTerm: 1814000,
                cvgToSell: ethers.parseEther("40000"),
                startBondTimestamp: timestamp,
            },
        ];
        await (await bondDepository.connect(await ethers.getSigner(TREASURY_DAO)).createBond(params)).wait();
        const nextBondId = await bondDepository.nextBondId();
        await (await frax.connect(user).approve(bondDepository, ethers.MaxUint256)).wait();
        await (await bondDepository.connect(user).depositAndLock(nextBondId - 1n, ethers.parseEther("250"), 0, MINT, lockDuration, 50)).wait();
        await (await bondDepository.connect(user).deposit(nextBondId - 1n, 0, ethers.parseEther("5000"), 0, user)).wait(); //"bond_7500CVG": true ! (with ROI)
        //verify amount of CVG
        // const tokens = await bondPositionManager.getTokenIdsForWallet(user);
        // console.log(await bondDepository.getBondInfosPerTokenIds([tokens[0]]));

        //STAKING
        await (await sdt.connect(user).approve(cvgSDT, ethers.MaxUint256)).wait();
        await (await cvgSDT.connect(user).mint(user, ethers.parseEther("10000"))).wait();
        await (await sdt.connect(user).approve(sdtUtilities, ethers.MaxUint256)).wait();
        await (await crv.connect(user).approve(sdtUtilities, ethers.MaxUint256)).wait();
        await (
            await sdtUtilities.connect(user).convertAndStakeSdAsset(0, sdCRVStaking, 0, ethers.parseEther("10000"), 0, ethers.parseEther("10000"), false)
        ).wait(); //"stake_5000$_during_6cycles": true (for CRV at 0.66$) => total more than 6000$
        // const tokens = await sdtStakingPositionManager.getTokenIdsForWallet(user1);
        // console.log("tokens", tokens);
        // await sdCRVStaking.connect(user1).withdraw(tokens[1], "1");
    });
    it("User3: stake", async () => {
        let user = user3;
        //STAKING
        await (await sdt.connect(user).approve(cvgSDT, ethers.MaxUint256)).wait();
        await (await cvgSDT.connect(user).mint(user, ethers.parseEther("10000"))).wait();
        await (await sdt.connect(user).approve(sdtUtilities, ethers.MaxUint256)).wait();
        await (await crv.connect(user).approve(sdtUtilities, ethers.MaxUint256)).wait();
        await (
            await sdtUtilities.connect(user).convertAndStakeSdAsset(0, sdCRVStaking, 0, ethers.parseEther("10000"), 0, ethers.parseEther("10000"), false)
        ).wait();
        const tokens = await sdtStakingPositionManager.getTokenIdsForWallet(user);
        // console.log("tokens user3", tokens);
    });
    it("User4: stake", async () => {
        let user = user4;
        //STAKING
        await (await sdt.connect(user).approve(cvgSDT, ethers.MaxUint256)).wait();
        await (await cvgSDT.connect(user).mint(user, ethers.parseEther("10000"))).wait();
        await (await sdt.connect(user).approve(sdtUtilities, ethers.MaxUint256)).wait();
        await (await crv.connect(user).approve(sdtUtilities, ethers.MaxUint256)).wait();
        await (
            await sdtUtilities.connect(user).convertAndStakeSdAsset(0, sdCRVStaking, 0, ethers.parseEther("10000"), 0, ethers.parseEther("10000"), false)
        ).wait();
        const tokens = await sdtStakingPositionManager.getTokenIdsForWallet(user);
        // console.log("tokens user4", tokens);
    });
    it("Pass 2 cycles", async () => {
        await increaseCvgCycleMainnet(contractsUsers, 2);
    });
    it("User3: unstake/stake", async () => {
        let user = user3;
        let tokenId = 302;
        //STAKING
        await (await cvgSDT.connect(user).mint(user, ethers.parseEther("10000"))).wait();
        const totalStaked = await sdCRVStaking.tokenTotalStaked(tokenId);
        await (await sdCRVStaking.connect(user).withdraw(tokenId, totalStaked)).wait();
        await (
            await sdtUtilities.connect(user).convertAndStakeSdAsset(tokenId, sdCRVStaking, 0, ethers.parseEther("10000"), 0, ethers.parseEther("10000"), false)
        ).wait();
    });

    it("Pass 4 cycles", async () => {
        await increaseCvgCycleMainnet(contractsUsers, 4);
    });
    it("User4: unstake/stake", async () => {
        let user = user4;
        let tokenId = 303;
        //STAKING
        await (await cvgSDT.connect(user).mint(user, ethers.parseEther("10000"))).wait();
        const totalStaked = await sdCRVStaking.tokenTotalStaked(tokenId);
        await (await sdCRVStaking.connect(user).withdraw(tokenId, totalStaked)).wait();
        await (
            await sdtUtilities.connect(user).convertAndStakeSdAsset(tokenId, sdCRVStaking, 0, ethers.parseEther("10000"), 0, ethers.parseEther("10000"), false)
        ).wait();
    });

    it("Pass 1 cycles", async () => {
        await increaseCvgCycleMainnet(contractsUsers, 1);
    });
});
