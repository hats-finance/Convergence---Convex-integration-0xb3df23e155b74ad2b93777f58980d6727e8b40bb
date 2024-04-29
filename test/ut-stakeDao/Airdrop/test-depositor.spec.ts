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
import {CVG} from "../../../resources/cvg-mainnet";
import {TOKEN_ADDR_sdCRV} from "../../../resources/tokens/stake-dao";

const lockDuration = 41; //TO CHANGE IF NECESSARY (ex: actual cycle = 4 => lockDuration= 44)
describe.skip("Test Depositor sdCRV", () => {
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
    it("CYCLE", async () => {
        console.log("Cycle:", await sdCRVStaking.stakingCycle());
        console.log("Cvg/Frax price", await cvgOracle.getAndVerifyTwoPrices(CVG, TOKEN_ADDR_FRAX));
        const sdCRV = await ethers.getContractAt("ISdAsset", TOKEN_ADDR_sdCRV);
        const operator = await sdCRV.operator();
        console.log("operator", operator);
        await sdtUtilities.connect(await ethers.getSigner(TREASURY_DAO)).setStablePools([{liquidLocker: TOKEN_ADDR_sdCRV, lp: ethers.ZeroAddress}]);
        await sdtUtilities.connect(await ethers.getSigner(TREASURY_DAO)).approveTokens([{token: TOKEN_ADDR_CRV, spender: operator, amount: ethers.MaxUint256}]);
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
        console.log("tokens user4", tokens);
    });
});
