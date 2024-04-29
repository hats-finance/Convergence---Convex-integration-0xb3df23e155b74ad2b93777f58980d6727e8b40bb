import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";
import {Signer, EventLog} from "ethers";
import {IContractsUser} from "../../../../../utils/contractInterface";
import {deploySdtStakingFixture, increaseCvgCycle} from "../../../../fixtures/stake-dao";
import {render_svg} from "../../../../../utils/svg/render_svg";
import {CvgControlTower, ERC20, SdtStakingLogo, SdtStakingPositionManager} from "../../../../../typechain-types";
import {expect} from "chai";
import {SD_ASSETS_FEE_PERCENTAGE, TOKEN_4} from "../../../../../resources/constant";
import {TOKEN_ADDR_ETHp_WETH_GAUGE, TOKEN_ADDR_triSDT_GAUGE} from "../../../../../resources/tokens/stake-dao";
import {CRV_DUO_ETHp_WETH, CRV_TRI_CRYPTO_SDT} from "../../../../../resources/lp";
import {distributeGaugeRewards} from "../../../../../utils/stakeDao/distributeGaugeRewards";
import {takesGaugeOwnershipAndSetDistributor} from "../../../../../utils/stakeDao/takesGaugeOwnershipAndSetDistributor";

const PATH = "./test/ut-stakeDao/-Staking/stake-dao/staking-logos/";

describe("Sdt Staking Logo", () => {
    let contractsUsers: IContractsUser;
    let owner: Signer, user1: Signer, user2: Signer, treasuryDao: Signer;
    let sdtStakingPositionManager: SdtStakingPositionManager;
    let cvgControlTower: CvgControlTower;
    let sdtStakingLogo: SdtStakingLogo;
    let sdFrax3Crv: ERC20;

    before(async () => {
        contractsUsers = await loadFixture(deploySdtStakingFixture);

        const contracts = contractsUsers.contracts;
        const tokens = contracts.tokens;

        const users = contractsUsers.users;
        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        treasuryDao = users.treasuryDao;

        cvgControlTower = contracts.base.cvgControlTower;
        sdtStakingLogo = contracts.stakeDao.sdtStakingLogo;
        const cloneFactory = contracts.base.cloneFactory;
        const cvgSdtStaking = contracts.stakeDao.cvgSdtStaking;
        const sdPENDLEStaking = contracts.stakeDao.sdAssetsStaking.sdPENDLEStaking;
        const sdFXSStaking = contracts.stakeDao.sdAssetsStaking.sdFXSStaking;
        const sdFXNStaking = contracts.stakeDao.sdAssetsStaking.sdFXNStaking;
        const sdBALStaking = contracts.stakeDao.sdAssetsStaking.sdBALStaking;
        const sdYFIStaking = contracts.stakeDao.sdAssetsStaking.sdYFIStaking;
        const sdAPWStaking = contracts.stakeDao.sdAssetsStaking.sdAPWStaking;

        const sdtUtilities = contracts.stakeDao.sdtUtilities;
        const cvgSdtBuffer = contracts.stakeDao.cvgSdtBuffer;
        const gaugeController = contracts.locking.gaugeController;
        const lockingPositionService = contracts.locking.lockingPositionService;
        const cvg = tokens.cvg;
        const cvgSdt = tokens.cvgSdt;
        const sdt = tokens.sdt;
        const sdPendle = contracts.tokensStakeDao.sdPendle;
        const sdPendleGauge = contracts.tokensStakeDao.sdPendleGauge;
        const sdFxs = contracts.tokensStakeDao.sdFxs;
        const sdFxsGauge = contracts.tokensStakeDao.sdFxsGauge;
        const sdFxn = contracts.tokensStakeDao.sdFxn;
        const sdFxnGauge = contracts.tokensStakeDao.sdFxnGauge;
        const sdBal = contracts.tokensStakeDao.sdBal;
        const sdBalGauge = contracts.tokensStakeDao.sdBalGauge;
        const sdYfi = contracts.tokensStakeDao.sdYfi;
        const sdYfiGauge = contracts.tokensStakeDao.sdYfiGauge;
        const sdApw = contracts.tokensStakeDao.sdApw;
        const sdApwGauge = contracts.tokensStakeDao.sdApwGauge;
        sdFrax3Crv = contracts.tokensStakeDao.sdFrax3Crv;

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
        const triSDTGaugeStaking = await ethers.getContractAt("SdtStakingPositionService", event?.args.stakingClone);

        //crvUSD_FRXETH_SDT
        const ETHp_WETH = await ethers.getContractAt("ERC20", CRV_DUO_ETHp_WETH);
        const ETHp_WETHGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_ETHp_WETH_GAUGE);
        const tx2 = await cloneFactory.connect(treasuryDao).createSdtStakingAndBuffer(ETHp_WETHGauge, "ETH+-WETH", true);
        const receipt2 = await tx2.wait();
        const logs2 = receipt2!.logs as EventLog[];
        const event2 = logs2.find((e) => e.fragment?.name === "SdtStakingCreated");
        const ETHp_WETHGaugeStaking = await ethers.getContractAt("SdtStakingPositionService", event2?.args.stakingClone);

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
        await ETHp_WETH.approve(sdtUtilities, ethers.MaxUint256);
        await sdBal.approve(sdtUtilities, ethers.MaxUint256);
        await sdYfi.approve(sdtUtilities, ethers.MaxUint256);
        await sdApw.approve(sdtUtilities, ethers.MaxUint256);

        await sdtUtilities.approveTokens([
            {token: sdPendleGauge, spender: sdPENDLEStaking, amount: ethers.MaxUint256},
            {token: sdPendle, spender: sdPendleGauge, amount: ethers.MaxUint256},
            {token: sdFxsGauge, spender: sdFXSStaking, amount: ethers.MaxUint256},
            {token: sdFxs, spender: sdFxsGauge, amount: ethers.MaxUint256},
            {token: sdFxnGauge, spender: sdFXNStaking, amount: ethers.MaxUint256},
            {token: sdFxn, spender: sdFxnGauge, amount: ethers.MaxUint256},
            {token: sdBalGauge, spender: sdBALStaking, amount: ethers.MaxUint256},
            {token: sdBal, spender: sdBalGauge, amount: ethers.MaxUint256},
            {token: sdYfiGauge, spender: sdYFIStaking, amount: ethers.MaxUint256},
            {token: sdYfi, spender: sdYfiGauge, amount: ethers.MaxUint256},
            {token: sdApwGauge, spender: sdAPWStaking, amount: ethers.MaxUint256},
            {token: sdApw, spender: sdApwGauge, amount: ethers.MaxUint256},

            {token: triSDTGauge, spender: triSDTGaugeStaking, amount: ethers.MaxUint256},
            {token: triSDT, spender: await triSDTGauge.staking_token(), amount: ethers.MaxUint256},

            {token: ETHp_WETHGauge, spender: ETHp_WETHGaugeStaking, amount: ethers.MaxUint256},
            {token: ETHp_WETH, spender: await ETHp_WETHGauge.staking_token(), amount: ethers.MaxUint256},
        ]);

        await sdtUtilities.convertAndStakeSdAsset(0, sdPENDLEStaking, 0, 0, ethers.parseEther("5000"), 0, false);
        await sdtUtilities.convertAndStakeSdAsset(0, sdFXSStaking, 0, 0, ethers.parseEther("5000"), 0, false);
        await sdtUtilities.convertAndStakeSdAsset(0, sdFXNStaking, 0, 0, ethers.parseEther("5000"), 0, false);
        await sdtUtilities.convertAndStakeLpAsset(0, triSDTGaugeStaking, 0, ethers.parseEther("5000"), false);
        await sdtUtilities.convertAndStakeLpAsset(0, ETHp_WETHGaugeStaking, 0, ethers.parseEther("5000"), false);
        await sdtUtilities.convertAndStakeSdAsset(0, sdBALStaking, 0, 0, ethers.parseEther("5000"), 0, false);
        await sdtUtilities.convertAndStakeSdAsset(0, sdYFIStaking, 0, 0, ethers.parseEther("5000"), 0, false);
        await sdtUtilities.convertAndStakeSdAsset(0, sdAPWStaking, 0, 0, ethers.parseEther("5000"), 0, false);

        await takesGaugeOwnershipAndSetDistributor(sdBalGauge, owner);
        await distributeGaugeRewards(
            sdBalGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                // {token: contractsUsers.contracts.tokensStakeDao.bbAUsd, amount: ethers.parseEther("100000")},
                {token: contractsUsers.contracts.tokens.usdc, amount: ethers.parseUnits("1000", 6)},
                {token: contractsUsers.contracts.tokensStakeDao.bal, amount: ethers.parseEther("10")},
            ],
            owner
        );

        //set & send sdBal bribe into sdtBlackHole
        await contractsUsers.contracts.stakeDao.sdtBlackHole.setBribeTokens(
            [{token: sdBal, fee: SD_ASSETS_FEE_PERCENTAGE}],
            contractsUsers.contracts.stakeDao.sdAssetsBuffer.sdBALBuffer
        );
        await sdBal.transfer(contractsUsers.contracts.stakeDao.sdtBlackHole, ethers.parseEther("10"));

        // increase to cycle 3
        await increaseCvgCycle(contractsUsers, 2);

        await sdBALStaking.processSdtRewards();

        // process SDT rewards
        await sdt.connect(users.veSdtMultisig).transfer(cvgSdtBuffer, ethers.parseEther("1000"));
        await cvgSdtStaking.connect(users.veSdtMultisig).processSdtRewards();
    });

    it("Fail: setTokensLogo with random user with error in array length", async () => {
        await sdtStakingLogo.connect(treasuryDao).setTokensLogo(["test", "test2"], ["test"]).should.be.revertedWith("LENGTH_MISMATCH");
    });

    it("Fail: setTokensLogo with random user", async () => {
        await sdtStakingLogo.setTokensLogo(["test"], ["test"]).should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Lock nft", async () => {
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const timestampBefore = blockBefore!.timestamp;
        const oneDayTimestamp = 86400;
        await sdtStakingPositionManager.connect(user1).setLock(1, timestampBefore + oneDayTimestamp);
    });
    it("check getLogoInfo", async () => {
        const logoInfo = await sdtStakingLogo.getLogoInfo(TOKEN_4);
        expect(logoInfo.tokenId).to.be.equal(TOKEN_4);
        expect(logoInfo.symbol).to.be.equal("cvgSDT");
        expect(logoInfo.pending).to.be.equal(0n);
        expect(logoInfo.totalStaked).to.be.equal(5000000000000000000000n);
        expect(logoInfo.cvgClaimable).to.be.equal(35701357466063347935012n);
        // expect(logoInfo.sdtClaimable).to.be.equal();
        // expect(logoInfo.claimableInUsd).to.be.equal();
        expect(logoInfo.isLocked).to.be.false;
        expect(logoInfo.hoursLock).to.be.equal(0);
    });

    it("Renders SVG", async () => {
        render_svg(await sdtStakingPositionManager.tokenURI(1), "STK-sdCRV", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(2), "STK-sdANGLE", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(3), "STK-sdBAL", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(4), "STK-cvgSDT", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(5), "STK-sdPENDLE", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(6), "STK-sdFXS", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(7), "STK-sdFXN", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(8), "STK-triSDT", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(9), "STK-ETH+-WETH", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(11), "STK-sdYFI", PATH);
        render_svg(await sdtStakingPositionManager.tokenURI(12), "STK-sdAPW", PATH);
    });
    it("Success: unset lockingLogo", async () => {
        await sdtStakingPositionManager.connect(treasuryDao).setLogo(ethers.ZeroAddress);
    });
    it("Fail: try to setBaseUri with non-owner should revert", async () => {
        await sdtStakingPositionManager.setBaseURI("ipfs://test/").should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Success: setBaseUri with owner", async () => {
        await sdtStakingPositionManager.connect(treasuryDao).setBaseURI("ipfs://test/");
    });
    it("Success: check tokenUri", async () => {
        const uri = await sdtStakingPositionManager.tokenURI(1);
        expect(uri).to.be.equal("ipfs://test/1");
    });
    it("Success: setBaseUri with owner", async () => {
        await sdtStakingPositionManager.connect(treasuryDao).setBaseURI("");
    });
    it("Success: check tokenUri", async () => {
        const uri = await sdtStakingPositionManager.tokenURI(1);
        expect(uri).to.be.equal("");
    });
});
