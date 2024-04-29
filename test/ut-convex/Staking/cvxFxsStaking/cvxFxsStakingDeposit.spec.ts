import {ethers} from "hardhat";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";

import {MINT, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_5} from "../../../../resources/constant";
import {CvxAssetStakerBuffer, CvxAssetStakingService, ERC20, IAssetDepositor, ICrvPoolPlain, ICvxAssetWrapper} from "../../../../typechain-types";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {CVX_FXS_DEPOSITOR, CVX_FXS_WRAPPER} from "../../../../resources/convex";
import {CRV_DUO_cvxFXS_FXS} from "../../../../resources/lp";

describe("cvxFxs - Deposit & Withdraw", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvxFxsStakingPositionService: CvxAssetStakingService;
    let cvxFxsStakerBuffer: CvxAssetStakerBuffer;
    let cvxFxsWrapper: ICvxAssetWrapper;
    let cvxFxsDepositor: IAssetDepositor;
    let cvxFxs_fxs_stablePool: ICrvPoolPlain;
    let cvxFxs: ERC20, fxs: ERC20;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxFxsStakingPositionService = contractsUsers.convex.cvxFxsStakingPositionService;
        cvxFxsStakerBuffer = contractsUsers.convex.cvxFxsStakerBuffer;

        fxs = contractsUsers.contractsUserMainnet.globalAssets["fxs"];
        cvxFxs = contractsUsers.contractsUserMainnet.convexAssets!["cvxFxs"];

        cvxFxsWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FXS_WRAPPER);
        cvxFxsDepositor = await ethers.getContractAt("IAssetDepositor", CVX_FXS_DEPOSITOR);
        cvxFxs_fxs_stablePool = await ethers.getContractAt("ICrvPoolPlain", CRV_DUO_cvxFXS_FXS);
    });

    it("Success : Deposit with some stkCvxFxs", async () => {
        await cvxFxsWrapper.connect(users.user1).approve(cvxFxsStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxFxs = cvxFxsStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxFxs;

        await expect(txDepositStkCvxFxs).to.changeTokenBalances(
            cvxFxsWrapper,
            [users.user1, cvxFxsStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxFXS without staking", async () => {
        await cvxFxs.connect(users.user2).approve(cvxFxsStakingPositionService, ethers.MaxUint256);

        const txDepositCvxFxs = cvxFxsStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxFxs;

        await expect(txDepositCvxFxs).to.changeTokenBalances(
            cvxFxs,
            [users.user2, cvxFxsStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxFXS with staking", async () => {
        await cvxFxs.connect(users.user2).approve(cvxFxsStakingPositionService, ethers.MaxUint256);

        const txDepositCvxFxs = cvxFxsStakingPositionService.connect(users.user2).deposit(TOKEN_2, ethers.parseEther("2000000"), 1, 0, false, true);

        await expect(txDepositCvxFxs).to.changeTokenBalances(
            cvxFxs,
            [users.user2, cvxFxsStakerBuffer],
            [-ethers.parseEther("2000000"), -ethers.parseEther("2000000")]
        );

        await expect(txDepositCvxFxs).to.changeTokenBalances(cvxFxsWrapper, [cvxFxsStakerBuffer], [ethers.parseEther("4000000")]);
    });

    it("Success : Deposit with some FXS by depositing without locking & staking", async () => {
        await fxs.connect(users.user3).approve(cvxFxsStakingPositionService, ethers.MaxUint256);

        const txDepositFxs = cvxFxsStakingPositionService.connect(users.user3).deposit(MINT, ethers.parseEther("2000000"), 0, 0, false, false);
        await txDepositFxs;

        await expect(txDepositFxs).to.changeTokenBalances(fxs, [users.user3, cvxFxsDepositor], [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]);
        await expect(txDepositFxs).to.changeTokenBalances(cvxFxs, [cvxFxsStakerBuffer], [ethers.parseEther("2000000")]);
    });

    it("Success : Deposit with some FXS by swapping without staking", async () => {
        await fxs.connect(users.user4).approve(cvxFxsStakingPositionService, ethers.MaxUint256);
        const dy = await cvxFxs_fxs_stablePool.get_dy(0, 1, ethers.parseEther("2000000"));
        const txDepositFxs = cvxFxsStakingPositionService.connect(users.user4).deposit(MINT, ethers.parseEther("2000000"), 0, 1, false, false);
        await txDepositFxs;
        await expect(txDepositFxs).to.changeTokenBalances(
            fxs,
            [users.user4, CRV_DUO_cvxFXS_FXS],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );

        await expect(txDepositFxs).to.changeTokenBalances(cvxFxs, [cvxFxsStakerBuffer, CRV_DUO_cvxFXS_FXS], [dy, -dy]);
    });

    it("Success : Deposit with some CRV by Depositing locking & staking", async () => {
        await fxs.connect(users.user5).approve(cvxFxsStakingPositionService, ethers.MaxUint256);

        const balanceOnStakerBuffer = (await cvxFxs.balanceOf(cvxFxsStakerBuffer)) + ethers.parseEther("2000000");
        const txDepositFxs = cvxFxsStakingPositionService.connect(users.user5).deposit(MINT, ethers.parseEther("2000000"), 0, 0, true, true);
        await txDepositFxs;

        await expect(txDepositFxs).to.changeTokenBalances(cvxFxsWrapper, [cvxFxsStakerBuffer], [balanceOnStakerBuffer]);
        await expect(txDepositFxs).to.changeTokenBalances(cvxFxs, [cvxFxsStakerBuffer], [-balanceOnStakerBuffer + ethers.parseEther("2000000")]);
        await expect(txDepositFxs).to.changeTokenBalances(fxs, [users.user5], [-ethers.parseEther("2000000")]);
    });

    it("Success : Withdraw from a position in stkCvxFxs", async () => {
        const txWithdrawFxs = cvxFxsStakingPositionService.connect(users.user5).withdraw(TOKEN_5, ethers.parseEther("2000000"), true);
        await txWithdrawFxs;

        await expect(txWithdrawFxs).to.changeTokenBalances(
            cvxFxsWrapper,
            [cvxFxsStakerBuffer, users.user5],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Withdraw from a position in cvxFXS", async () => {
        const txWithdrawFxs = cvxFxsStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("2000000"), false);
        await txWithdrawFxs;

        await expect(txWithdrawFxs).to.changeTokenBalances(
            cvxFxs,
            [CVX_FXS_WRAPPER, users.user1],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit some cvxFXS without staking them and Withdraw them only from the buffer", async () => {
        await cvxFxs.connect(users.user1).approve(cvxFxsStakingPositionService, ethers.MaxUint256);

        const txDepositCvxFxs = cvxFxsStakingPositionService.connect(users.user1).deposit(TOKEN_1, ethers.parseEther("4000000"), 1, 0, false, false);
        await txDepositCvxFxs;

        await expect(txDepositCvxFxs).to.changeTokenBalances(
            cvxFxs,
            [users.user1, cvxFxsStakerBuffer],
            [-ethers.parseEther("4000000"), ethers.parseEther("4000000")]
        );

        const txWithdrawFxsOnlyFromBuffer = cvxFxsStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("3000000"), false);
        await txWithdrawFxsOnlyFromBuffer;

        await expect(txWithdrawFxsOnlyFromBuffer).to.changeTokenBalances(
            cvxFxs,
            [CVX_FXS_WRAPPER, cvxFxsStakerBuffer, users.user1],
            [0, -ethers.parseEther("3000000"), ethers.parseEther("3000000")]
        );

        const txWithdrawFxsFromBufferAndRewards = cvxFxsStakingPositionService.connect(users.user3).withdraw(TOKEN_3, ethers.parseEther("2000000"), false);
        await txWithdrawFxsFromBufferAndRewards;

        await expect(txWithdrawFxsFromBufferAndRewards).to.changeTokenBalances(
            cvxFxs,
            [CVX_FXS_WRAPPER, cvxFxsStakerBuffer, users.user3],
            [-ethers.parseEther("1000000"), -ethers.parseEther("1000000"), ethers.parseEther("2000000")]
        );
    });
});
