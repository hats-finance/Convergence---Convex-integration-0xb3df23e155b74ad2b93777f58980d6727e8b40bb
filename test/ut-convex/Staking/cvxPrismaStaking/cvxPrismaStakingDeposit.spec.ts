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
import {CVX_PRISMA_DEPOSITOR, CVX_PRISMA_WRAPPER} from "../../../../resources/convex";
import {CRV_DUO_cvxPRISMA_PRISMA} from "../../../../resources/lp";

describe("cvxPrisma - Deposit & Withdraw", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvxPrismaStakingPositionService: CvxAssetStakingService;
    let cvxPrismaStakerBuffer: CvxAssetStakerBuffer;
    let cvxPrismaWrapper: ICvxAssetWrapper;
    let cvxPrismaDepositor: IAssetDepositor;
    let cvxPrisma_prisma_stablePool: ICrvPoolPlain;
    let cvxPrisma: ERC20, prisma: ERC20;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxPrismaStakingPositionService = contractsUsers.convex.cvxPrismaStakingPositionService;
        cvxPrismaStakerBuffer = contractsUsers.convex.cvxPrismaStakerBuffer;

        prisma = contractsUsers.contractsUserMainnet.globalAssets["prisma"];
        cvxPrisma = contractsUsers.contractsUserMainnet.convexAssets!["cvxPrisma"];

        cvxPrismaWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_PRISMA_WRAPPER);
        cvxPrismaDepositor = await ethers.getContractAt("IAssetDepositor", CVX_PRISMA_DEPOSITOR);
        cvxPrisma_prisma_stablePool = await ethers.getContractAt("ICrvPoolPlain", CRV_DUO_cvxPRISMA_PRISMA);
    });

    it("Success : Deposit with some stkCvxPrima", async () => {
        await cvxPrismaWrapper.connect(users.user1).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxPrisma = cvxPrismaStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxPrisma;

        await expect(txDepositStkCvxPrisma).to.changeTokenBalances(
            cvxPrismaWrapper,
            [users.user1, cvxPrismaStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxPRISMA without staking", async () => {
        await cvxPrisma.connect(users.user2).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);

        const txDepositCvxPrisma = cvxPrismaStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxPrisma;

        await expect(txDepositCvxPrisma).to.changeTokenBalances(
            cvxPrisma,
            [users.user2, cvxPrismaStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxPRISMA with staking", async () => {
        await cvxPrisma.connect(users.user2).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);

        const txDepositCvxPrisma = cvxPrismaStakingPositionService.connect(users.user2).deposit(TOKEN_2, ethers.parseEther("2000000"), 1, 0, false, true);

        await expect(txDepositCvxPrisma).to.changeTokenBalances(
            cvxPrisma,
            [users.user2, cvxPrismaStakerBuffer],
            [-ethers.parseEther("2000000"), -ethers.parseEther("2000000")]
        );

        await expect(txDepositCvxPrisma).to.changeTokenBalances(cvxPrismaWrapper, [cvxPrismaStakerBuffer], [ethers.parseEther("4000000")]);
    });

    it("Success : Deposit with some PRISMA by depositing without locking & staking", async () => {
        await prisma.connect(users.user3).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);

        const txDepositPrisma = cvxPrismaStakingPositionService.connect(users.user3).deposit(MINT, ethers.parseEther("2000000"), 0, 0, false, false);
        await txDepositPrisma;

        await expect(txDepositPrisma).to.changeTokenBalances(
            prisma,
            [users.user3, cvxPrismaDepositor],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
        await expect(txDepositPrisma).to.changeTokenBalances(cvxPrisma, [cvxPrismaStakerBuffer], [ethers.parseEther("2000000")]);
    });

    it("Success : Deposit with some PRISMA by swapping without staking", async () => {
        await prisma.connect(users.user4).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);
        const dy = await cvxPrisma_prisma_stablePool.get_dy(0, 1, ethers.parseEther("2000000"));
        const txDepositPrisma = cvxPrismaStakingPositionService.connect(users.user4).deposit(MINT, ethers.parseEther("2000000"), 0, 1, false, false);
        await txDepositPrisma;
        await expect(txDepositPrisma).to.changeTokenBalances(
            prisma,
            [users.user4, CRV_DUO_cvxPRISMA_PRISMA],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );

        await expect(txDepositPrisma).to.changeTokenBalances(cvxPrisma, [cvxPrismaStakerBuffer, CRV_DUO_cvxPRISMA_PRISMA], [dy, -dy]);
    });

    it("Success : Deposit with some PRISMA by Depositing locking & staking", async () => {
        await prisma.connect(users.user5).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);

        const balanceOnStakerBuffer = (await cvxPrisma.balanceOf(cvxPrismaStakerBuffer)) + ethers.parseEther("2000000");
        const txDepositPrisma = cvxPrismaStakingPositionService.connect(users.user5).deposit(MINT, ethers.parseEther("2000000"), 0, 0, true, true);
        await txDepositPrisma;

        await expect(txDepositPrisma).to.changeTokenBalances(cvxPrismaWrapper, [cvxPrismaStakerBuffer], [balanceOnStakerBuffer]);
        await expect(txDepositPrisma).to.changeTokenBalances(cvxPrisma, [cvxPrismaStakerBuffer], [-balanceOnStakerBuffer + ethers.parseEther("2000000")]);
        await expect(txDepositPrisma).to.changeTokenBalances(prisma, [users.user5], [-ethers.parseEther("2000000")]);
    });

    it("Success : Withdraw from a position in stkCvxPrisma", async () => {
        const txWithdrawPrisma = cvxPrismaStakingPositionService.connect(users.user5).withdraw(TOKEN_5, ethers.parseEther("2000000"), true);
        await txWithdrawPrisma;

        await expect(txWithdrawPrisma).to.changeTokenBalances(
            cvxPrismaWrapper,
            [cvxPrismaStakerBuffer, users.user5],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Withdraw from a position in cvxPRISMA", async () => {
        const txWithdrawPrisma = cvxPrismaStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("2000000"), false);
        await txWithdrawPrisma;

        await expect(txWithdrawPrisma).to.changeTokenBalances(
            cvxPrisma,
            [CVX_PRISMA_WRAPPER, users.user1],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit some cvxPRISMA without staking them and Withdraw them only from the buffer", async () => {
        await cvxPrisma.connect(users.user1).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);

        const txDepositCvxPrisma = cvxPrismaStakingPositionService.connect(users.user1).deposit(TOKEN_1, ethers.parseEther("4000000"), 1, 0, false, false);
        await txDepositCvxPrisma;

        await expect(txDepositCvxPrisma).to.changeTokenBalances(
            cvxPrisma,
            [users.user1, cvxPrismaStakerBuffer],
            [-ethers.parseEther("4000000"), ethers.parseEther("4000000")]
        );

        const txWithdrawPrismaOnlyFromBuffer = cvxPrismaStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("3000000"), false);
        await txWithdrawPrismaOnlyFromBuffer;

        await expect(txWithdrawPrismaOnlyFromBuffer).to.changeTokenBalances(
            cvxPrisma,
            [CVX_PRISMA_WRAPPER, cvxPrismaStakerBuffer, users.user1],
            [0, -ethers.parseEther("3000000"), ethers.parseEther("3000000")]
        );

        const txWithdrawPrismaFromBufferAndRewards = cvxPrismaStakingPositionService
            .connect(users.user3)
            .withdraw(TOKEN_3, ethers.parseEther("2000000"), false);
        await txWithdrawPrismaFromBufferAndRewards;

        await expect(txWithdrawPrismaFromBufferAndRewards).to.changeTokenBalances(
            cvxPrisma,
            [CVX_PRISMA_WRAPPER, cvxPrismaStakerBuffer, users.user3],
            [-ethers.parseEther("1000000"), -ethers.parseEther("1000000"), ethers.parseEther("2000000")]
        );
    });
});
