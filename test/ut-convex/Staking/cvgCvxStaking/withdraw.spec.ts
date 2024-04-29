import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther} from "ethers";
import {
    CvgCvxStakingPositionService,
    CvxConvergenceLocker,
    ERC20, ICrvPoolPlain, CVX1
} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {MINT, TOKEN_1, TOKEN_2} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";

describe("cvgCvxStaking - Withdraw", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvx: ERC20;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxCvx1Pool: ICrvPoolPlain;
    let cvx1: CVX1;
    let currentCycle: bigint;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
        cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;
        cvgCvxCvx1Pool = contractsUsers.convex.cvgCvxCvx1PoolContract;
        cvx1 = contractsUsers.convex.CVX1;

        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();

        // approvals
        await cvx.connect(users.user1).approve(cvxConvergenceLocker, ethers.MaxUint256);
        await cvx.connect(users.user2).approve(cvxConvergenceLocker, ethers.MaxUint256);
        await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxStaking, ethers.MaxUint256);
        await cvxConvergenceLocker.connect(users.user2).approve(cvgCvxStaking, ethers.MaxUint256);

        // mint cvgCVX with 1% fees because no locking
        await cvxConvergenceLocker.connect(users.user1).mint(users.user1, parseEther("1000"), false);
        await cvxConvergenceLocker.connect(users.user2).mint(users.user2, parseEther("1000"), false);

        // deposit for user1 and user2
        await cvgCvxStaking.connect(users.user1).deposit(MINT, parseEther("300"), EMPTY_CVX_DATA_STRUCT);
        await cvgCvxStaking.connect(users.user2).deposit(MINT, parseEther("500"), EMPTY_CVX_DATA_STRUCT);
    });

    it("Fails : Withdrawing cvgCVX should be reverted with amount 0", async () => {
        await cvgCvxStaking.connect(users.user1).withdraw(TOKEN_1, 0, 0, 0).should.be.revertedWith("WITHDRAW_LTE_0");
    });

    it("Fails : Withdrawing amount that exceeds deposited amount", async () => {
        await cvgCvxStaking.connect(users.user2).withdraw(TOKEN_2, parseEther("50000"), 0, 0).should.be.revertedWith("WITHDRAW_EXCEEDS_STAKED_AMOUNT");
    });

    it("Fails : Withdrawing with random user", async () => {
        await cvgCvxStaking.connect(users.user1).withdraw(TOKEN_2, parseEther("500"), 0, 0).should.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Success : Withdraw cvgCvx for user1", async () => {
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_1)).to.be.deep.eq([parseEther("300"), parseEther("300")]);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_2)).to.be.deep.eq([parseEther("500"), parseEther("500")]);

        const amount = parseEther("100");

        // withdraw cvgCvx
        await expect(cvgCvxStaking.connect(users.user1).withdraw(TOKEN_1, amount, 0, 0))
            .to.emit(cvgCvxStaking, "Withdraw")
            .withArgs(TOKEN_1, await users.user1.getAddress(), currentCycle, amount);

        // new cvgCvx balances
        expect(await cvxConvergenceLocker.balanceOf(users.user1)).to.be.equal(parseEther("790"));
        expect(await cvxConvergenceLocker.balanceOf(cvgCvxStaking)).to.be.equal(parseEther("700"));

        // staking information
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_1)).to.be.deep.eq([parseEther("200"), parseEther("200")]);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_2)).to.be.deep.eq([parseEther("500"), parseEther("500")]);
    });

    it("Success: Withdraw for user1 by choosing CVX1", async () => {
        const amount = parseEther("100");
        const minAmountOut = (await cvgCvxCvx1Pool.get_dy(1, 0, amount)) * 98n / 100n;
        const previousUser1Balance = await cvx1.balanceOf(users.user1);

        await cvgCvxStaking.connect(users.user1).withdraw(TOKEN_1, amount, 1, minAmountOut);

        // new cvgCvx balances
        expect(await cvxConvergenceLocker.balanceOf(users.user1)).to.be.equal(parseEther("790"));
        expect(await cvxConvergenceLocker.balanceOf(cvgCvxStaking)).to.be.equal(parseEther("600"));

        // CVX1 user1 balance
        expect(await cvx1.balanceOf(users.user1)).to.be.gte(previousUser1Balance + minAmountOut);
    });

    it("Success: Withdraw for user1 by choosing CVX", async () => {
        const amount = parseEther("100");
        const minAmountOut = (await cvgCvxCvx1Pool.get_dy(1, 0, amount)) * 98n / 100n;
        const previousUser1Balance = await cvx.balanceOf(users.user1);

        await cvgCvxStaking.connect(users.user1).withdraw(TOKEN_1, amount, 2, minAmountOut);

        // new cvgCvx balances
        expect(await cvxConvergenceLocker.balanceOf(users.user1)).to.be.equal(parseEther("790"));
        expect(await cvxConvergenceLocker.balanceOf(cvgCvxStaking)).to.be.equal(parseEther("500"));

        // CVX user1 balance
        expect(await cvx.balanceOf(users.user1)).to.be.gte(previousUser1Balance + minAmountOut);
    });
});
