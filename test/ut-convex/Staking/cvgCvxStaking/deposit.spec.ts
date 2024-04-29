import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, Signer, MaxUint256} from "ethers";
import {CvgCvxStakingPositionService, CvxConvergenceLocker, ERC20, ICrvPoolPlain} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {MINT, TOKEN_1, TOKEN_2, TOKEN_3} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";
import {OWNABLE_REVERT} from "../../../../resources/revert";

describe("cvgCvxStaking - Deposit", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvx: ERC20;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let cvgCvxCvx1Pool: ICrvPoolPlain;
    let currentCycle: bigint;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
        cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;
        cvgCvxCvx1Pool = contractsUsers.convex.cvgCvxCvx1PoolContract;

        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();

        // approvals
        await cvx.connect(users.user1).approve(cvxConvergenceLocker, MaxUint256);
        await cvx.connect(users.user2).approve(cvxConvergenceLocker, MaxUint256);
        await cvx.connect(users.user1).approve(cvgCvxStaking, MaxUint256);
        await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxStaking, MaxUint256);
        await cvxConvergenceLocker.connect(users.user2).approve(cvgCvxStaking, MaxUint256);

        // mint cvgCVX with fees because no locking
        await cvxConvergenceLocker.connect(users.user1).mint(users.user1, parseEther("100000"), false);
        await cvxConvergenceLocker.connect(users.user2).mint(users.user2, parseEther("100000"), false);
    });

    it("Fails : Depositing cvgCVX with amount 0", async () => {
        await cvgCvxStaking.connect(users.user1).deposit(MINT, 0, EMPTY_CVX_DATA_STRUCT).should.be.revertedWith("DEPOSIT_LTE_0");
    });

    it("Fails : Setting deposit paused with random user", async () => {
        await cvgCvxStaking.connect(users.user1).toggleDepositPaused().should.be.revertedWith(OWNABLE_REVERT);
    });

    it("Success : Pauses deposit", async () => {
        await cvgCvxStaking.connect(treasuryDao).toggleDepositPaused();
        expect(await cvgCvxStaking.depositPaused()).to.be.true;
    });

    it("Fails : Deposits when paused", async () => {
        await cvgCvxStaking.connect(users.user1).deposit(MINT, parseEther("500"), EMPTY_CVX_DATA_STRUCT).should.be.revertedWith("DEPOSIT_PAUSED");
    });

    it("Success : Unpause deposit", async () => {
        await cvgCvxStaking.connect(treasuryDao).toggleDepositPaused();
        expect(await cvgCvxStaking.depositPaused()).to.be.false;
    });

    it("Success : Depositing cvgCVX for user1", async () => {
        const amount200 = parseEther("200");

        // deposit cvgCVX
        const tx = cvgCvxStaking.connect(users.user1).deposit(MINT, amount200, EMPTY_CVX_DATA_STRUCT);
        await expect(tx)
            .to.emit(cvgCvxStaking, "Deposit")
            .withArgs(TOKEN_1, await users.user1.getAddress(), currentCycle, amount200);

        await expect(tx).to.changeTokenBalances(cvxConvergenceLocker, [users.user1, cvgCvxStaking], [-amount200, amount200]);

        // staking information for next cycle
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_1)).to.be.deep.equal([amount200, amount200]);
    });

    it("Success : Re-deposit cvgCVX for user1", async () => {
        const amount100 = parseEther("100");

        // deposit cvgToke
        await expect(cvgCvxStaking.connect(users.user1).deposit(TOKEN_1, amount100, EMPTY_CVX_DATA_STRUCT))
            .to.emit(cvgCvxStaking, "Deposit")
            .withArgs(TOKEN_1, await users.user1.getAddress(), currentCycle, amount100);

        // check staking info
        const expectedAmount = parseEther("300");
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_1)).to.be.deep.eq([expectedAmount, expectedAmount]);
    });

    it("Fails : Depositing with tokenId not owned", async () => {
        const amount700 = parseEther("700");
        await cvgCvxStaking.connect(users.user2).deposit(TOKEN_1, amount700, EMPTY_CVX_DATA_STRUCT).should.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Success : Deposit with both CVX (through mint) and cvgCVX", async () => {
        const amountCvx = parseEther("10");
        const amountCvgCvx = parseEther("5");
        const fees = amountCvx / 100n; // due to minting cvgCVX without locking

        // deposit CVX and cvgCVX
        const tx = cvgCvxStaking.connect(users.user1).deposit(MINT, amountCvgCvx, {amount: amountCvx, minAmountOut: 0});
        await expect(tx)
            .to.emit(cvgCvxStaking, "Deposit")
            .withArgs(TOKEN_2, await users.user1.getAddress(), currentCycle, amountCvgCvx + amountCvx - fees);
    });

    it("Success : Deposit with CVX only", async () => {
        const amountCvx = parseEther("35");
        const fees = amountCvx / 100n; // due to minting cvgCVX without locking

        // deposit CVX and cvgCVX
        const tx = cvgCvxStaking.connect(users.user1).deposit(MINT, 0, {amount: amountCvx, minAmountOut: 0});
        await expect(tx)
            .to.emit(cvgCvxStaking, "Deposit")
            .withArgs(TOKEN_3, await users.user1.getAddress(), currentCycle, amountCvx - fees);
    });

    it("Fails : Re-deposit with CVX on token 3 through swap with invalid min amount out", async () => {
        // Reverse the peg
        await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxCvx1Pool, MaxUint256);
        await cvgCvxCvx1Pool.connect(users.user1).exchange(1, 0, parseEther("15000"), 0, users.user1);

        const amountCvx = parseEther("35");
        await cvgCvxStaking.connect(users.user1).deposit(TOKEN_3, 0, {amount: amountCvx, minAmountOut: 0}).should.be.revertedWith("INVALID_SLIPPAGE");
    });

    it("Success : Re-deposit with CVX on token 3 through swap", async () => {
        const amountCvx = parseEther("35");
        const minAmountOut = await cvgCvxCvx1Pool.get_dy(0, 1, amountCvx);

        // deposit CVX through swap
        const tx = cvgCvxStaking.connect(users.user1).deposit(TOKEN_3, 0, {amount: amountCvx, minAmountOut});
        await expect(tx)
            .to.emit(cvgCvxStaking, "Deposit")
            .withArgs(TOKEN_3, await users.user1.getAddress(), currentCycle, minAmountOut);
    });
});
