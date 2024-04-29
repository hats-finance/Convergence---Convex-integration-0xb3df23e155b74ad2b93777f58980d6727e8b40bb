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
import {CVX_FPIS_WRAPPER, CVX_FPIS_DEPOSITOR} from "../../../../resources/convex";
import {CRV_DUO_cvxFPIS_FPIS} from "../../../../resources/lp";

describe("cvxFpis - Deposit & Withdraw", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvxFpisStakingPositionService: CvxAssetStakingService;
    let cvxFpisStakerBuffer: CvxAssetStakerBuffer;
    let cvxFpisWrapper: ICvxAssetWrapper;
    let cvxFpisDepositor: IAssetDepositor;
    let cvxFpis_fpis_stablePool: ICrvPoolPlain;
    let cvxFpis: ERC20, fpis: ERC20;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxFpisStakingPositionService = contractsUsers.convex.cvxFpisStakingPositionService;
        cvxFpisStakerBuffer = contractsUsers.convex.cvxFpisStakerBuffer;

        fpis = contractsUsers.contractsUserMainnet.globalAssets["fpis"];
        cvxFpis = contractsUsers.contractsUserMainnet.convexAssets!["cvxFpis"];

        cvxFpisWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FPIS_WRAPPER);
        cvxFpisDepositor = await ethers.getContractAt("IAssetDepositor", CVX_FPIS_DEPOSITOR);
        cvxFpis_fpis_stablePool = await ethers.getContractAt("ICrvPoolPlain", CRV_DUO_cvxFPIS_FPIS);
    });

    it("Success : Deposit with some stkCvxPrima", async () => {
        await cvxFpisWrapper.connect(users.user1).approve(cvxFpisStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxPrisma = cvxFpisStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxPrisma;

        await expect(txDepositStkCvxPrisma).to.changeTokenBalances(
            cvxFpisWrapper,
            [users.user1, cvxFpisStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxFPIS without staking", async () => {
        await cvxFpis.connect(users.user2).approve(cvxFpisStakingPositionService, ethers.MaxUint256);

        const txDepositCvxPrisma = cvxFpisStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxPrisma;

        await expect(txDepositCvxPrisma).to.changeTokenBalances(
            cvxFpis,
            [users.user2, cvxFpisStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxFPIS with staking", async () => {
        await cvxFpis.connect(users.user2).approve(cvxFpisStakingPositionService, ethers.MaxUint256);

        const txDepositCvxPrisma = cvxFpisStakingPositionService.connect(users.user2).deposit(TOKEN_2, ethers.parseEther("2000000"), 1, 0, false, true);

        await expect(txDepositCvxPrisma).to.changeTokenBalances(
            cvxFpis,
            [users.user2, cvxFpisStakerBuffer],
            [-ethers.parseEther("2000000"), -ethers.parseEther("2000000")]
        );

        await expect(txDepositCvxPrisma).to.changeTokenBalances(cvxFpisWrapper, [cvxFpisStakerBuffer], [ethers.parseEther("4000000")]);
    });

    it("Success : Deposit with some FPIS by depositing without locking & staking", async () => {
        await fpis.connect(users.user3).approve(cvxFpisStakingPositionService, ethers.MaxUint256);

        const txDepositFpis = cvxFpisStakingPositionService.connect(users.user3).deposit(MINT, ethers.parseEther("2000000"), 0, 0, false, false);
        await txDepositFpis;

        await expect(txDepositFpis).to.changeTokenBalances(
            fpis,
            [users.user3, cvxFpisDepositor],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
        await expect(txDepositFpis).to.changeTokenBalances(cvxFpis, [cvxFpisStakerBuffer], [ethers.parseEther("2000000")]);
    });

    it("Success : Deposit with some FPIS by swapping without staking", async () => {
        await fpis.connect(users.user4).approve(cvxFpisStakingPositionService, ethers.MaxUint256);
        const dy = await cvxFpis_fpis_stablePool.get_dy(0, 1, ethers.parseEther("2000000"));
        const txDepositFpis = cvxFpisStakingPositionService.connect(users.user4).deposit(MINT, ethers.parseEther("2000000"), 0, 1, false, false);
        await txDepositFpis;
        await expect(txDepositFpis).to.changeTokenBalances(
            fpis,
            [users.user4, CRV_DUO_cvxFPIS_FPIS],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );

        await expect(txDepositFpis).to.changeTokenBalances(cvxFpis, [cvxFpisStakerBuffer, CRV_DUO_cvxFPIS_FPIS], [dy, -dy]);
    });

    it("Success : Deposit with some FPIS by Depositing locking & staking", async () => {
        await fpis.connect(users.user5).approve(cvxFpisStakingPositionService, ethers.MaxUint256);

        const balanceOnStakerBuffer = (await cvxFpis.balanceOf(cvxFpisStakerBuffer)) + ethers.parseEther("2000000");
        const txDepositFpis = cvxFpisStakingPositionService.connect(users.user5).deposit(MINT, ethers.parseEther("2000000"), 0, 0, true, true);
        await txDepositFpis;

        await expect(txDepositFpis).to.changeTokenBalances(cvxFpisWrapper, [cvxFpisStakerBuffer], [balanceOnStakerBuffer]);
        await expect(txDepositFpis).to.changeTokenBalances(cvxFpis, [cvxFpisStakerBuffer], [-balanceOnStakerBuffer + ethers.parseEther("2000000")]);
        await expect(txDepositFpis).to.changeTokenBalances(fpis, [users.user5], [-ethers.parseEther("2000000")]);
    });

    it("Success : Withdraw from a position in stkCvxFpis", async () => {
        const txWithdrawFpis = cvxFpisStakingPositionService.connect(users.user5).withdraw(TOKEN_5, ethers.parseEther("2000000"), true);
        await txWithdrawFpis;

        await expect(txWithdrawFpis).to.changeTokenBalances(
            cvxFpisWrapper,
            [cvxFpisStakerBuffer, users.user5],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Withdraw from a position in cvxFPIS", async () => {
        const txWithdrawFpis = cvxFpisStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("2000000"), false);
        await txWithdrawFpis;

        await expect(txWithdrawFpis).to.changeTokenBalances(
            cvxFpis,
            [CVX_FPIS_WRAPPER, users.user1],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit some cvxFPIS without staking them and Withdraw them only from the buffer", async () => {
        await cvxFpis.connect(users.user1).approve(cvxFpisStakingPositionService, ethers.MaxUint256);

        const txDepositCvxFpis = cvxFpisStakingPositionService.connect(users.user1).deposit(TOKEN_1, ethers.parseEther("4000000"), 1, 0, false, false);
        await txDepositCvxFpis;

        await expect(txDepositCvxFpis).to.changeTokenBalances(
            cvxFpis,
            [users.user1, cvxFpisStakerBuffer],
            [-ethers.parseEther("4000000"), ethers.parseEther("4000000")]
        );

        const txWithdrawFpisOnlyFromBuffer = cvxFpisStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("3000000"), false);
        await txWithdrawFpisOnlyFromBuffer;

        await expect(txWithdrawFpisOnlyFromBuffer).to.changeTokenBalances(
            cvxFpis,
            [CVX_FPIS_WRAPPER, cvxFpisStakerBuffer, users.user1],
            [0, -ethers.parseEther("3000000"), ethers.parseEther("3000000")]
        );

        const txWithdrawPrismaFromBufferAndRewards = cvxFpisStakingPositionService.connect(users.user3).withdraw(TOKEN_3, ethers.parseEther("2000000"), false);
        await txWithdrawPrismaFromBufferAndRewards;

        await expect(txWithdrawPrismaFromBufferAndRewards).to.changeTokenBalances(
            cvxFpis,
            [CVX_FPIS_WRAPPER, cvxFpisStakerBuffer, users.user3],
            [-ethers.parseEther("1000000"), -ethers.parseEther("1000000"), ethers.parseEther("2000000")]
        );
    });
});
