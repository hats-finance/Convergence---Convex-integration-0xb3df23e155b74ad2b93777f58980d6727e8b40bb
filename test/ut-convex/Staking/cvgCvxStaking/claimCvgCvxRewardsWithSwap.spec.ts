import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, Signer, MaxUint256} from "ethers";
import {Cvg, CvgCvxStakingPositionService, CvxConvergenceLocker, ERC20, ICrvPoolPlain} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {MINT, TOKEN_1, TOKEN_2, CLAIMER_REWARDS_PERCENTAGE, DENOMINATOR} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {getExpectedCvgCvxRewards} from "../../../../utils/stakeDao/getStakingShareForCycle";
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";

describe("cvgCvxStaking - Claim CvgCvx Rewards With Swap Or Mint", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvx: ERC20, fxs: ERC20, cvg: Cvg;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let currentCycle: bigint;
    let poolCvgCvxCvx1: ICrvPoolPlain;

    const depositedAmountToken1 = parseEther("5000"),
        depositedAmountToken2 = parseEther("100000"),
        withdrawAmount = parseEther("4000");

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);

        users = contractsUsers.contractsUserMainnet.users;
        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;

        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
        cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;
        poolCvgCvxCvx1 = contractsUsers.convex.cvgCvxCvx1PoolContract;

        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();

        // mint locking position and vote for cvgCvxStaking gauge
        const lockingEndCycle = 96n - currentCycle;
        const tokenId = await contractsUsers.contractsUserMainnet.locking.lockingPositionManager.nextId();
        await cvg.approve(contractsUsers.contractsUserMainnet.locking.lockingPositionService, parseEther("300000"));
        await contractsUsers.contractsUserMainnet.locking.lockingPositionService.mintPosition(lockingEndCycle, parseEther("100000"), 0, users.owner, true);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.simple_vote(tokenId, cvgCvxStaking, 1000);

        // mint cvgCVX
        await cvx.approve(cvxConvergenceLocker, MaxUint256);
        await cvxConvergenceLocker.mint(users.owner, parseEther("4000000"), false);

        // transfer cvgCVX to users
        await cvxConvergenceLocker.transfer(users.user1, parseEther("1000000"));
        await cvxConvergenceLocker.transfer(users.user2, parseEther("1000000"));

        // approve cvgCVX spending from staking contract
        await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxStaking, MaxUint256);
        await cvxConvergenceLocker.connect(users.user2).approve(cvgCvxStaking, MaxUint256);

        // deposit for user1 ans user 2
        await cvgCvxStaking.connect(users.user1).deposit(MINT, depositedAmountToken1, EMPTY_CVX_DATA_STRUCT);
        await cvgCvxStaking.connect(users.user2).deposit(MINT, depositedAmountToken2, EMPTY_CVX_DATA_STRUCT);
    });

    it("Success : Processing rewards & Updating cvg cycle to N+1", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 1n);
    });

    it("Success : Withdrawing user2 at cycle N+1", async () => {
        await cvgCvxStaking.connect(users.user2).withdraw(TOKEN_2, withdrawAmount, 0, 0);

        expect(await cvgCvxStaking.stakingHistoryByToken(TOKEN_2, 0)).to.be.eq(currentCycle + 1n);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_2)).to.be.deep.eq([depositedAmountToken2 - withdrawAmount, depositedAmountToken2]);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 2n, TOKEN_2)).to.be.deep.eq([depositedAmountToken2 - withdrawAmount, 0]);
        expect(await cvgCvxStaking.cycleInfo(currentCycle + 1n)).to.be.deep.eq([0, depositedAmountToken1 + depositedAmountToken2 - withdrawAmount, false]);
        expect(await cvgCvxStaking.cycleInfo(currentCycle + 2n)).to.be.deep.eq([0, depositedAmountToken1 + depositedAmountToken2 - withdrawAmount, false]);
    });

    it("Success : Processing rewards & update cvg cycle to N+2 should compute right infos", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 2n);
    });

    it("Success : Processing CVX rewards for cycle N+1", async () => {
        const amountCvx = parseEther("750");
        const amountCvgCvx = parseEther("236");

        // rewards distribution
        await cvx.transfer(cvxConvergenceLocker, amountCvx);
        await cvxConvergenceLocker.transfer(cvxConvergenceLocker, amountCvgCvx);

        // process
        await cvgCvxStaking.processCvxRewards();

        const rewardForCycle = await cvgCvxStaking.getProcessedCvxRewards(currentCycle + 1n);
        const expectedCvxAmount = (amountCvx * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedCvgCvxAmount = (amountCvgCvx * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;

        expect(rewardForCycle[0]).to.deep.eq([await cvx.getAddress(), expectedCvxAmount]);
        expect(rewardForCycle[1].token.toLowerCase()).to.be.equal(await fxs.getAddress());
        expect(rewardForCycle[1].amount).to.be.gt(0); // => amount of FXS that cannot be determined
        expect(rewardForCycle[2]).to.deep.eq([await cvxConvergenceLocker.getAddress(), expectedCvgCvxAmount]);
    });

    it("Success : ClaimCvgCvxRewards for cycle N+1 with convert and mint", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);

        const cvxRewards = cycle2RewardsExpected[1];
        const cvgCvxRewards = cycle2RewardsExpected[3];

        const cvgCVXMintFees = cvxRewards / 100n;

        const tx = cvgCvxStaking.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, true);
        await expect(tx).to.changeTokenBalances(cvx, [users.user1], [0]);
        await expect(tx).to.changeTokenBalances(cvxConvergenceLocker, [users.user1], [cvxRewards + cvgCvxRewards - cvgCVXMintFees]);

        expect(await cvgCvxStaking.nextClaims(TOKEN_1)).to.be.deep.equal([currentCycle + 2n, currentCycle + 2n]);
    });

    it("Fails : ClaimCvgCvxRewards for cycle N+1 with convert only with min CVX amount too high", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_2, currentCycle + 1n);

        const cvxRewards = cycle2RewardsExpected[1];
        const cvx_dy = await poolCvgCvxCvx1.get_dy(0, 1, cvxRewards);

        const tx = cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_2, cvx_dy + 1n, true);
        await expect(tx).to.be.revertedWith("Exchange resulted in fewer coins than expected");
    });

    it("Success : ClaimCvgCvxRewards for cycle N+1 with convert only", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_2, currentCycle + 1n);

        const cvxRewards = cycle2RewardsExpected[1];
        const cvx_dy = await poolCvgCvxCvx1.get_dy(0, 1, cvxRewards);
        const cvgCvxRewards = cycle2RewardsExpected[3];

        const slippage = 5n;
        const minCvgCvxAmountOut = cvx_dy - (cvx_dy * slippage) / 1000n; // 0.5%

        const tx = cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_2, minCvgCvxAmountOut, true);
        await expect(tx).to.changeTokenBalances(cvx, [users.user2], [0]);
        await expect(tx).to.changeTokenBalances(cvxConvergenceLocker, [users.user2], [cvx_dy + cvgCvxRewards]);

        expect(await cvgCvxStaking.nextClaims(TOKEN_2)).to.be.deep.equal([currentCycle + 2n, currentCycle + 2n]);
    });
});
