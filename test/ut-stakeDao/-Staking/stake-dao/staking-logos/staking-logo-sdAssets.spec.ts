import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";
import {Signer, EventLog} from "ethers";
import {IContractsUser} from "../../../../../utils/contractInterface";
import {deploySdtStakingFixture, increaseCvgCycle} from "../../../../fixtures/stake-dao";
import {
    CvgControlTower,
    ERC20,
    ISdAsset,
    SdtBlackHole,
    SdtBuffer,
    SdtStakingLogo,
    SdtStakingPositionManager,
    SdtStakingPositionService,
} from "../../../../../typechain-types";
import {expect} from "chai";
import {CYCLE_2, CYCLE_3, SD_ASSETS_FEE_PERCENTAGE, TOKEN_2, TOKEN_3, TOKEN_6} from "../../../../../resources/constant";
import {TOKEN_ADDR_triSDT_GAUGE} from "../../../../../resources/tokens/stake-dao";
import {CRV_DUO_SDFXS_FXS, CRV_TRI_CRYPTO_SDT} from "../../../../../resources/lp";

describe("Sdt Staking Logo SdAssets", () => {
    let contractsUsers: IContractsUser;
    let owner: Signer, user1: Signer, user2: Signer, treasuryDao: Signer;
    let sdtStakingPositionManager: SdtStakingPositionManager;
    let cvgControlTower: CvgControlTower;
    let sdtBlackHole: SdtBlackHole;

    let sdtStakingLogo: SdtStakingLogo;
    let sdFrax3Crv: ERC20;
    let sdPENDLEStaking: SdtStakingPositionService, sdFXSStaking: SdtStakingPositionService, sdBALStaking: SdtStakingPositionService;
    let sdPENDLEStakingBuffer: SdtBuffer, sdFXSStakingBuffer: SdtBuffer, sdBALStakingBuffer: SdtBuffer;
    let sdPendle: ISdAsset, sdFxs: ISdAsset, sdBal: ISdAsset;
    let fxs: ERC20, usdc: ERC20;

    before(async () => {
        contractsUsers = await loadFixture(deploySdtStakingFixture);

        const contracts = contractsUsers.contracts;
        const tokens = contracts.tokens;

        const users = contractsUsers.users;
        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        treasuryDao = users.treasuryDao;

        sdtBlackHole = contractsUsers.contracts.stakeDao.sdtBlackHole;
        cvgControlTower = contracts.base.cvgControlTower;
        sdtStakingLogo = contracts.stakeDao.sdtStakingLogo;
        const cloneFactory = contracts.base.cloneFactory;
        const cvgSdtStaking = contracts.stakeDao.cvgSdtStaking;
        sdPENDLEStaking = contracts.stakeDao.sdAssetsStaking.sdPENDLEStaking;
        sdPENDLEStakingBuffer = await ethers.getContractAt("SdtBuffer", await sdPENDLEStaking.buffer());
        sdFXSStaking = contracts.stakeDao.sdAssetsStaking.sdFXSStaking;
        sdFXSStakingBuffer = await ethers.getContractAt("SdtBuffer", await sdFXSStaking.buffer());

        sdBALStaking = contracts.stakeDao.sdAssetsStaking.sdBALStaking;

        sdBALStakingBuffer = await ethers.getContractAt("SdtBuffer", await sdBALStaking.buffer());
        const sdFXNStaking = contracts.stakeDao.sdAssetsStaking.sdFXNStaking;
        const sdtUtilities = contracts.stakeDao.sdtUtilities;
        const cvgSdtBuffer = contracts.stakeDao.cvgSdtBuffer;
        const gaugeController = contracts.locking.gaugeController;
        const lockingPositionService = contracts.locking.lockingPositionService;
        const cvg = tokens.cvg;
        const cvgSdt = tokens.cvgSdt;
        const sdt = tokens.sdt;
        sdPendle = contracts.tokensStakeDao.sdPendle;
        const sdPendleGauge = contracts.tokensStakeDao.sdPendleGauge;
        sdFxs = contracts.tokensStakeDao.sdFxs;
        fxs = contracts.tokens.fxs;
        const sdFxsGauge = contracts.tokensStakeDao.sdFxsGauge;
        const sdFxn = contracts.tokensStakeDao.sdFxn;
        const sdFxnGauge = contracts.tokensStakeDao.sdFxnGauge;
        sdFrax3Crv = contracts.tokensStakeDao.sdFrax3Crv;
        usdc = contracts.tokens.usdc;

        // mint locking position and vote for cvgSdtStaking gauge
        await cvg.approve(lockingPositionService, ethers.parseEther("300000"));
        await lockingPositionService.mintPosition(47, ethers.parseEther("100000"), 0, owner, true);
        await gaugeController.simple_vote(5, cvgSdtStaking, 1000);
        await sdt.approve(cvgSdt, ethers.MaxUint256);

        sdtStakingPositionManager = contracts.stakeDao.sdtStakingPositionManager;

        //crvUSD_FRXETH_SDT
        const triSDT = await ethers.getContractAt("ERC20", CRV_TRI_CRYPTO_SDT);
        const triSDTGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_triSDT_GAUGE);
        const tx = await cloneFactory.connect(treasuryDao).createSdtStakingAndBuffer(triSDTGauge, "triSDT", true);
        const receipt = await tx.wait();
        const logs = receipt!.logs as EventLog[];
        const event = logs.find((e) => e.fragment?.name === "SdtStakingCreated");
        const triSDTStaking = await ethers.getContractAt("SdtStakingPositionService", event?.args.stakingClone);

        // mint cvgSdt
        await cvgSdt.mint(owner, ethers.parseEther("30000"));

        // transfer cvgSdt to users
        await cvgSdt.transfer(user1, ethers.parseEther("10000"));
        await cvgSdt.transfer(user2, ethers.parseEther("10000"));

        // approve cvgSdt spending from staking contract
        await cvgSdt.connect(user1).approve(cvgSdtStaking, ethers.MaxUint256);
        await cvgSdt.connect(user2).approve(cvgSdtStaking, ethers.MaxUint256);

        // deposit for user1 and user2
        await cvgSdtStaking.connect(user1).deposit(0, ethers.parseEther("5000"), ethers.ZeroAddress);

        await sdPendle.approve(sdtUtilities, ethers.MaxUint256);
        await sdFxs.approve(sdtUtilities, ethers.MaxUint256);
        await sdFxn.approve(sdtUtilities, ethers.MaxUint256);
        await triSDT.approve(sdtUtilities, ethers.MaxUint256);

        await sdtUtilities.approveTokens([
            {token: sdPendleGauge, spender: sdPENDLEStaking, amount: ethers.MaxUint256},
            {token: sdPendle, spender: sdPendleGauge, amount: ethers.MaxUint256},
            {token: sdFxsGauge, spender: sdFXSStaking, amount: ethers.MaxUint256},
            {token: sdFxs, spender: sdFxsGauge, amount: ethers.MaxUint256},
            {token: sdFxnGauge, spender: sdFXNStaking, amount: ethers.MaxUint256},
            {token: sdFxn, spender: sdFxnGauge, amount: ethers.MaxUint256},

            {token: triSDTGauge, spender: triSDTStaking, amount: ethers.MaxUint256},
            {token: triSDT, spender: await triSDTGauge.staking_token(), amount: ethers.MaxUint256},
        ]);

        await sdtUtilities.convertAndStakeSdAsset(0, sdPENDLEStaking, 0, 0, ethers.parseEther("5000"), 0, false);
        await sdtUtilities.convertAndStakeSdAsset(0, sdFXSStaking, 0, 0, ethers.parseEther("5000"), 0, false);
        await sdtUtilities.convertAndStakeSdAsset(0, sdFXNStaking, 0, 0, ethers.parseEther("5000"), 0, false);
        await sdtUtilities.convertAndStakeLpAsset(0, triSDTStaking, 0, ethers.parseEther("5000"), false);
    });

    it("Success : Processing rewards & update cvg cycle to 2", async () => {
        await increaseCvgCycle(contractsUsers, 1);

        expect(await sdFXSStaking.stakingCycle()).to.be.equal(2);
        expect((await sdFXSStaking.cycleInfo(1)).cvgRewardsAmount).to.be.equal(0);
    });
    it("Success : Adding a bribe reward on the sdtBlackHole linked to the buffer", async () => {
        await sdtBlackHole.setBribeTokens([{token: sdFxs, fee: SD_ASSETS_FEE_PERCENTAGE}], sdFXSStakingBuffer);
        const bribesTokens = await sdtBlackHole.getBribeTokensForBuffer(sdFXSStakingBuffer);
        expect(bribesTokens[0]).to.be.deep.equal([await sdFxs.getAddress(), SD_ASSETS_FEE_PERCENTAGE]);
    });
    it("Success : Processing cvg rewards for cycle 2 & update cycle to 3", async () => {
        await increaseCvgCycle(contractsUsers, 1);
        expect(await sdFXSStaking.stakingCycle()).to.be.equal(CYCLE_3);
        expect((await sdFXSStaking.cycleInfo(CYCLE_2)).cvgRewardsAmount).to.be.equal(1187782805429864479811n);
    });

    it("Success : Sending bribes to the SdtBlackHole", async () => {
        let sdFxsBribeCycle2 = ethers.parseEther("5000");
        await sdFxs.transfer(sdtBlackHole, sdFxsBribeCycle2);
    });

    it("Success : Sends 10k USDC to buffer sdBAL", async () => {
        await usdc.transfer(sdtBlackHole, ethers.parseUnits("10000", 6));
    });
    it("Success : Processing SDT rewards for cycle 2", async () => {
        await sdFXSStaking.processSdtRewards();
        await sdBALStaking.processSdtRewards();
    });
    it("Fail: setSdAssetInfos with random user", async () => {
        await sdtStakingLogo
            .setSdAssetInfos([{sdAsset: sdFxs, asset: fxs, curvePool: CRV_DUO_SDFXS_FXS}])
            .should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("check erroneousAmount with sdFxs not setted", async () => {
        const logoInfo = await sdtStakingLogo.getLogoInfo(TOKEN_6);
        expect(logoInfo.erroneousAmount).to.be.true;
    });

    it("Success: setSdAssetInfos", async () => {
        await sdtStakingLogo.connect(treasuryDao).setSdAssetInfos([{sdAsset: sdFxs, asset: fxs, curvePool: CRV_DUO_SDFXS_FXS}]);
    });

    it("check erroneousAmount with sdFxs setted", async () => {
        const logoInfo = await sdtStakingLogo.getLogoInfo(TOKEN_6);
        expect(logoInfo.erroneousAmount).to.be.false;
    });
});
