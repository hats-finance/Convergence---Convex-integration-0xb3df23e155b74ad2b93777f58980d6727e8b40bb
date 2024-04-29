import {ethers} from "hardhat";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";

import {MINT, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_5} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {CVX_FXN_DEPOSITOR, CVX_FXN_WRAPPER} from "../../../../resources/convex";
import {CvxAssetStakerBuffer, CvxAssetStakingService, ERC20, IAssetDepositor, ICrvPoolPlain, ICvxAssetWrapper} from "../../../../typechain-types";
import {CRV_DUO_cvxFXN_FXN} from "../../../../resources/lp";

describe("cvxFxn - Deposit & Withdraw", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvxFxnStakingPositionService: CvxAssetStakingService;
    let cvxFxnStakerBuffer: CvxAssetStakerBuffer;
    let cvxFxnWrapper: ICvxAssetWrapper;
    let fxnDepositor: IAssetDepositor;
    let cvxAsset_asset_stablePool: ICrvPoolPlain;
    let cvxFxn: ERC20, fxn: ERC20;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxFxnStakingPositionService = contractsUsers.convex.cvxFxnStakingPositionService;
        cvxFxnStakerBuffer = contractsUsers.convex.cvxFxnStakerBuffer;

        fxn = contractsUsers.contractsUserMainnet.globalAssets["fxn"];
        cvxFxn = contractsUsers.contractsUserMainnet.convexAssets!["cvxFxn"];

        cvxFxnWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FXN_WRAPPER);
        fxnDepositor = await ethers.getContractAt("IAssetDepositor", CVX_FXN_DEPOSITOR);
        cvxAsset_asset_stablePool = await ethers.getContractAt("ICrvPoolPlain", CRV_DUO_cvxFXN_FXN);
    });

    it("Success : Deposit with some stkCvxCrv", async () => {
        await cvxFxnWrapper.connect(users.user1).approve(cvxFxnStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxFxn = cvxFxnStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxFxn;

        await expect(txDepositStkCvxFxn).to.changeTokenBalances(
            cvxFxnWrapper,
            [users.user1, cvxFxnStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxCRV without staking", async () => {
        await cvxFxn.connect(users.user2).approve(cvxFxnStakingPositionService, ethers.MaxUint256);

        const txDepositCvxFxn = cvxFxnStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxFxn;

        await expect(txDepositCvxFxn).to.changeTokenBalances(
            cvxFxn,
            [users.user2, cvxFxnStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxCRV with staking", async () => {
        await cvxFxn.connect(users.user2).approve(cvxFxnStakingPositionService, ethers.MaxUint256);

        const txDepositCvxFxn = cvxFxnStakingPositionService.connect(users.user2).deposit(TOKEN_2, ethers.parseEther("2000000"), 1, 0, false, true);

        await expect(txDepositCvxFxn).to.changeTokenBalances(
            cvxFxn,
            [users.user2, cvxFxnStakerBuffer],
            [-ethers.parseEther("2000000"), -ethers.parseEther("2000000")]
        );

        await expect(txDepositCvxFxn).to.changeTokenBalances(cvxFxnWrapper, [cvxFxnStakerBuffer], [ethers.parseEther("4000000")]);
    });

    it("Success : Deposit with some CRV by depositing without locking & staking", async () => {
        await fxn.connect(users.user3).approve(cvxFxnStakingPositionService, ethers.MaxUint256);

        const txDepositFxn = cvxFxnStakingPositionService.connect(users.user3).deposit(MINT, ethers.parseEther("2000000"), 0, 0, false, false);
        await txDepositFxn;

        await expect(txDepositFxn).to.changeTokenBalances(fxn, [users.user3, fxnDepositor], [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]);
        await expect(txDepositFxn).to.changeTokenBalances(cvxFxn, [cvxFxnStakerBuffer], [ethers.parseEther("2000000")]);
    });

    it("Success : Deposit with some CRV by swapping without staking", async () => {
        await fxn.connect(users.user4).approve(cvxFxnStakingPositionService, ethers.MaxUint256);
        const dy = await cvxAsset_asset_stablePool.get_dy(0, 1, ethers.parseEther("2000000"));
        const txDepositFxn = cvxFxnStakingPositionService.connect(users.user4).deposit(MINT, ethers.parseEther("2000000"), 0, 1, false, false);
        await txDepositFxn;
        await expect(txDepositFxn).to.changeTokenBalances(
            fxn,
            [users.user4, CRV_DUO_cvxFXN_FXN],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );

        await expect(txDepositFxn).to.changeTokenBalances(cvxFxn, [cvxFxnStakerBuffer, CRV_DUO_cvxFXN_FXN], [dy, -dy]);
    });

    it("Success : Deposit with some CRV by Depositing locking & staking", async () => {
        await fxn.connect(users.user5).approve(cvxFxnStakingPositionService, ethers.MaxUint256);

        const balanceOnStakerBuffer = (await cvxFxn.balanceOf(cvxFxnStakerBuffer)) + ethers.parseEther("2000000");
        const txDepositFxn = cvxFxnStakingPositionService.connect(users.user5).deposit(MINT, ethers.parseEther("2000000"), 0, 0, true, true);
        await txDepositFxn;

        await expect(txDepositFxn).to.changeTokenBalances(cvxFxnWrapper, [cvxFxnStakerBuffer], [balanceOnStakerBuffer]);
        await expect(txDepositFxn).to.changeTokenBalances(cvxFxn, [cvxFxnStakerBuffer], [-balanceOnStakerBuffer + ethers.parseEther("2000000")]);
        await expect(txDepositFxn).to.changeTokenBalances(fxn, [users.user5], [-ethers.parseEther("2000000")]);
    });

    it("Success : Withdraw from a position in stkcvxFxn", async () => {
        const txWithdrawPrisma = cvxFxnStakingPositionService.connect(users.user5).withdraw(TOKEN_5, ethers.parseEther("2000000"), true);
        await txWithdrawPrisma;

        await expect(txWithdrawPrisma).to.changeTokenBalances(
            cvxFxnWrapper,
            [cvxFxnStakerBuffer, users.user5],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Withdraw from a position in cvxFxn", async () => {
        const txWithdrawPrisma = cvxFxnStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("2000000"), false);
        await txWithdrawPrisma;

        await expect(txWithdrawPrisma).to.changeTokenBalances(
            cvxFxn,
            [CVX_FXN_WRAPPER, users.user1],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit some cvxFxn without staking them and Withdraw them only from the buffer", async () => {
        await cvxFxn.connect(users.user1).approve(cvxFxnStakingPositionService, ethers.MaxUint256);

        const txDepositcvxFxn = cvxFxnStakingPositionService.connect(users.user1).deposit(TOKEN_1, ethers.parseEther("4000000"), 1, 0, false, false);
        await txDepositcvxFxn;

        await expect(txDepositcvxFxn).to.changeTokenBalances(
            cvxFxn,
            [users.user1, cvxFxnStakerBuffer],
            [-ethers.parseEther("4000000"), ethers.parseEther("4000000")]
        );

        const txWithdrawPrismaOnlyFromBuffer = cvxFxnStakingPositionService.connect(users.user1).withdraw(TOKEN_1, ethers.parseEther("3000000"), false);
        await txWithdrawPrismaOnlyFromBuffer;

        await expect(txWithdrawPrismaOnlyFromBuffer).to.changeTokenBalances(
            cvxFxn,
            [CVX_FXN_WRAPPER, cvxFxnStakerBuffer, users.user1],
            [0, -ethers.parseEther("3000000"), ethers.parseEther("3000000")]
        );

        const txWithdrawPrismaFromBufferAndRewards = cvxFxnStakingPositionService.connect(users.user3).withdraw(TOKEN_3, ethers.parseEther("2000000"), false);
        await txWithdrawPrismaFromBufferAndRewards;

        await expect(txWithdrawPrismaFromBufferAndRewards).to.changeTokenBalances(
            cvxFxn,
            [CVX_FXN_WRAPPER, cvxFxnStakerBuffer, users.user3],
            [-ethers.parseEther("1000000"), -ethers.parseEther("1000000"), ethers.parseEther("2000000")]
        );
    });
});
