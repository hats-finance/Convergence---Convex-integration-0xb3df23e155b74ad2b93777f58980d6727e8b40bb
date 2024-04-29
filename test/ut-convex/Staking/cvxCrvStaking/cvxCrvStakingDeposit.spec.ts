import {ethers} from "hardhat";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";

import {MINT, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_5} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {CVX_CRV_DEPOSITOR, CVX_CRV_REWARDS, CVX_CRV_WRAPPER} from "../../../../resources/convex";
import {CRV_DUO_cvxCRV_CRV} from "../../../../resources/lp";
import {
    CvxAssetStakerBuffer,
    CvxAssetStakingService,
    ERC20,
    IAssetDepositor,
    ICrvPoolPlain,
    ICvxAssetWrapper, ProxyAdmin
} from "../../../../typechain-types";
import {deployProxy} from "../../../../utils/global/deployProxy";
import {Signer, ZeroAddress} from "ethers";
import {TREASURY_DAO} from "../../../../resources/treasury";

describe("cvxCrv - Deposit & Withdraw", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvxCrvStakingPositionService: CvxAssetStakingService;
    let cvxCrvStakerBuffer: CvxAssetStakerBuffer;
    let cvxCrvWrapper: ICvxAssetWrapper;
    let crvDepositor: IAssetDepositor;
    let cvxAsset_asset_stablePool: ICrvPoolPlain;
    let cvxCrv: ERC20, crv: ERC20;
    let proxyAdmin: ProxyAdmin;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxCrvStakingPositionService = contractsUsers.convex.cvxCrvStakingPositionService;
        cvxCrvStakerBuffer = contractsUsers.convex.cvxCrvStakerBuffer;
        proxyAdmin = contractsUsers.contractsUserMainnet.base.proxyAdmin;
        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        crv = contractsUsers.contractsUserMainnet.globalAssets["crv"];
        cvxCrv = contractsUsers.contractsUserMainnet.convexAssets!["cvxCrv"];

        cvxCrvWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_CRV_WRAPPER);
        crvDepositor = await ethers.getContractAt("IAssetDepositor", CVX_CRV_DEPOSITOR);
        cvxAsset_asset_stablePool = await ethers.getContractAt("ICrvPoolPlain", CRV_DUO_cvxCRV_CRV);
    });

    it("Fail: initialize cvxCrvStakerBuffer again", async () => {
        await cvxCrvStakerBuffer
            .initialize(cvxCrv, cvxCrvWrapper, cvxCrvStakingPositionService, 0, [])
            .should.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Fail: initialize cvxCrvStakingPositionService again", async () => {
        await cvxCrvStakingPositionService
            .initialize(cvxCrv, cvxCrv, cvxCrvWrapper, ZeroAddress, ZeroAddress, "NONE")
            .should.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Fails : Deposit with 0 stkCvxCrv", async () => {
       await cvxCrvStakingPositionService.connect(users.user1).deposit(MINT, 0, 2, 0, false, false)
            .should.be.revertedWith('DEPOSIT_LTE_0')
    });

    it("Success : Deposit with some stkCvxCrv", async () => {
        await cvxCrvWrapper.connect(users.user1).approve(cvxCrvStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxCrv = cvxCrvStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxCrv;

        await expect(txDepositStkCvxCrv).to.changeTokenBalances(
            cvxCrvWrapper,
            [users.user1, cvxCrvStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxCRV without staking", async () => {
        await cvxCrv.connect(users.user2).approve(cvxCrvStakingPositionService, ethers.MaxUint256);

        const txDepositCvxCrv = cvxCrvStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxCrv;

        await expect(txDepositCvxCrv).to.changeTokenBalances(
            cvxCrv,
            [users.user2, cvxCrvStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxCRV with staking", async () => {
        await cvxCrv.connect(users.user2).approve(cvxCrvStakingPositionService, ethers.MaxUint256);

        const txDepositCvxCrv = cvxCrvStakingPositionService.connect(users.user2).deposit(TOKEN_2, ethers.parseEther("2000000"), 1, 0, false, true);

        await expect(txDepositCvxCrv).to.changeTokenBalances(
            cvxCrv,
            [users.user2, cvxCrvStakerBuffer],
            [-ethers.parseEther("2000000"), -ethers.parseEther("2000000")]
        );

        await expect(txDepositCvxCrv).to.changeTokenBalances(cvxCrvWrapper, [cvxCrvStakerBuffer], [ethers.parseEther("4000000")]);
    });

    it("Success : Deposit with some CRV by depositing without locking & staking", async () => {
        await crv.connect(users.user3).approve(cvxCrvStakingPositionService, ethers.MaxUint256);

        const txDepositCrv = cvxCrvStakingPositionService.connect(users.user3).deposit(MINT, ethers.parseEther("2000000"), 0, 0, false, false);
        await txDepositCrv;

        await expect(txDepositCrv).to.changeTokenBalances(crv, [users.user3, crvDepositor], [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]);
        await expect(txDepositCrv).to.changeTokenBalances(cvxCrv, [cvxCrvStakerBuffer], [ethers.parseEther("2000000")]);
    });

    it("Success : Deposit with some CRV by swapping without staking", async () => {
        await crv.connect(users.user4).approve(cvxCrvStakingPositionService, ethers.MaxUint256);
        const dy = await cvxAsset_asset_stablePool.get_dy(0, 1, ethers.parseEther("2000000"));
        const txDepositCrv = cvxCrvStakingPositionService.connect(users.user4).deposit(MINT, ethers.parseEther("2000000"), 0, 1, false, false);
        await txDepositCrv;
        await expect(txDepositCrv).to.changeTokenBalances(
            crv,
            [users.user4, CRV_DUO_cvxCRV_CRV],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );

        await expect(txDepositCrv).to.changeTokenBalances(cvxCrv, [cvxCrvStakerBuffer, CRV_DUO_cvxCRV_CRV], [dy, -dy]);
    });

    it("Success : Deposit with some CRV by Depositing locking & staking", async () => {
        await crv.connect(users.user5).approve(cvxCrvStakingPositionService, ethers.MaxUint256);

        const balanceOnStakerBuffer = (await cvxCrv.balanceOf(cvxCrvStakerBuffer)) + ethers.parseEther("2000000");
        const txDepositCrv = cvxCrvStakingPositionService.connect(users.user5).deposit(MINT, ethers.parseEther("2000000"), 0, 0, true, true);
        await txDepositCrv;

        await expect(txDepositCrv).to.changeTokenBalances(cvxCrvWrapper, [cvxCrvStakerBuffer], [balanceOnStakerBuffer]);
        await expect(txDepositCrv).to.changeTokenBalances(cvxCrv, [cvxCrvStakerBuffer], [-balanceOnStakerBuffer + ethers.parseEther("2000000")]);
        await expect(txDepositCrv).to.changeTokenBalances(crv, [users.user5], [-ethers.parseEther("2000000")]);
    });

    it("Fails : Withdraw from a position in stkCvxCrv without using Service contract", async () => {
        await cvxCrvStakerBuffer.withdraw(users.user5, ethers.parseEther("2000000"), true)
            .should.be.revertedWith("NOT_CVX_ASSET_STAKING_SERVICE");
    });

    it("Fails : Withdraw from a position in stkCvxCrv with 0 amount", async () => {
        await cvxCrvStakingPositionService.connect(users.user5).withdraw(TOKEN_5, 0, true)
            .should.be.revertedWith('WITHDRAW_LTE_0');
    });

    it("Success : Withdraw from a position in stkCvxCrv", async () => {
        const txWithdrawCrv = cvxCrvStakingPositionService.connect(users.user5).withdraw(TOKEN_5, ethers.parseEther("2000000"), true);
        await txWithdrawCrv;

        await expect(txWithdrawCrv).to.changeTokenBalances(
            cvxCrvWrapper,
            [cvxCrvStakerBuffer, users.user5],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Withdraw from a position in cvxCRV", async () => {
        const txWithdrawCrv = cvxCrvStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("2000000"), false);
        await txWithdrawCrv;

        await expect(txWithdrawCrv).to.changeTokenBalances(
            cvxCrv,
            [CVX_CRV_REWARDS, users.user1],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit some cvxCRV without staking them and Withdraw them only from the buffer", async () => {
        await cvxCrv.connect(users.user1).approve(cvxCrvStakingPositionService, ethers.MaxUint256);

        const txDepositCvxCrv = cvxCrvStakingPositionService.connect(users.user1).deposit(TOKEN_1, ethers.parseEther("4000000"), 1, 0, false, false);
        await txDepositCvxCrv;

        await expect(txDepositCvxCrv).to.changeTokenBalances(
            cvxCrv,
            [users.user1, cvxCrvStakerBuffer],
            [-ethers.parseEther("4000000"), ethers.parseEther("4000000")]
        );

        const txWithdrawCrvOnlyFromBuffer = cvxCrvStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("3000000"), false);
        await txWithdrawCrvOnlyFromBuffer;

        await expect(txWithdrawCrvOnlyFromBuffer).to.changeTokenBalances(
            cvxCrv,
            [CVX_CRV_REWARDS, cvxCrvStakerBuffer, users.user1],
            [0, -ethers.parseEther("3000000"), ethers.parseEther("3000000")]
        );

        const txWithdrawCrvFromBufferAndRewards = cvxCrvStakingPositionService.connect(users.user3).withdraw(TOKEN_3, ethers.parseEther("2000000"), false);
        await txWithdrawCrvFromBufferAndRewards;

        await expect(txWithdrawCrvFromBufferAndRewards).to.changeTokenBalances(
            cvxCrv,
            [CVX_CRV_REWARDS, cvxCrvStakerBuffer, users.user3],
            [-ethers.parseEther("1000000"), -ethers.parseEther("1000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success: Stake all cvxAsset on the contract", async () => {
        await cvxCrvStakerBuffer.stakeAllCvxAsset();
        expect(await cvxCrv.balanceOf(cvxCrvStakerBuffer)).to.be.eq(0);
    });

    it("Fails : Deposit while depositing is paused", async () => {
        await cvxCrvStakingPositionService.connect(treasuryDao).toggleDepositPaused();

        await cvxCrvStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("10"), 2, 0, false, false)
            .should.be.revertedWith('DEPOSIT_PAUSED')
    });

    it("Fails: Deploy CvxCrvStakingPositionService with OxO address as cvxAsset", async () => {
        await deployProxy<CvxAssetStakerBuffer>(
            "address,address,address,uint256,(address,uint48,uint48)[]",
            [ZeroAddress, await cvxCrvWrapper.getAddress(), await cvxCrvStakingPositionService.getAddress(), 0, []],
            "CvxAssetStakerBuffer",
            proxyAdmin
        ).should.be.revertedWith("CVX_ASSET");
    });

    it("Fails: Deploy CvxCrvStakingPositionService with OxO address as cvxAssetWrapper", async () => {
        await deployProxy<CvxAssetStakerBuffer>(
            "address,address,address,uint256,(address,uint48,uint48)[]",
            [await cvxCrv.getAddress(), ZeroAddress, await cvxCrvStakingPositionService.getAddress(), 0, []],
            "CvxAssetStakerBuffer",
            proxyAdmin
        ).should.be.revertedWith("CVX_ASSET_WRAPPER");
    });

    it("Fails: Deploy CvxCrvStakingPositionService with OxO address as cvxStakingService", async () => {
        await deployProxy<CvxAssetStakerBuffer>(
            "address,address,address,uint256,(address,uint48,uint48)[]",
            [await cvxCrv.getAddress(), await cvxCrvWrapper.getAddress(), ZeroAddress, 0, []],
            "CvxAssetStakerBuffer",
            proxyAdmin
        ).should.be.revertedWith("CVX_ASSET_STAKING");
    });
});
