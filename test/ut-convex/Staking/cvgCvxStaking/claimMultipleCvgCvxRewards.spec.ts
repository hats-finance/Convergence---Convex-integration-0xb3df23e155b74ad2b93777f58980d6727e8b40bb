import {loadFixture, mine} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, Signer, MaxUint256} from "ethers";
import {Cvg, CvgCvxStakingPositionService, CvxConvergenceLocker, CvxRewardDistributor, ERC20} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {MINT, TOKEN_1, TOKEN_2, DENOMINATOR, CLAIMER_REWARDS_PERCENTAGE} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {TypedContractEvent, TypedDeferredTopicFilter} from "../../../../typechain-types/common";
import {ClaimCvgMultipleEvent, ClaimCvgCvxMultipleEvent} from "../../../../typechain-types/contracts/Staking/Convex/CvxStakingPositionService";
import {getExpectedCvgCvxRewards} from "../../../../utils/stakeDao/getStakingShareForCycle";
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";

describe("CvgCvxStaking - Claim Multiple CvgCVX Rewards ", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvx: ERC20, fxs: ERC20, crv: ERC20, cvg: Cvg;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let cvxRewardDistributor: CvxRewardDistributor;
    let currentCycle: bigint;

    let filterClaimCvg: TypedDeferredTopicFilter<
        TypedContractEvent<ClaimCvgMultipleEvent.InputTuple, ClaimCvgMultipleEvent.OutputTuple, ClaimCvgMultipleEvent.OutputObject>
    >;
    let filterClaimCvgCvx: TypedDeferredTopicFilter<
        TypedContractEvent<ClaimCvgCvxMultipleEvent.InputTuple, ClaimCvgCvxMultipleEvent.OutputTuple, ClaimCvgCvxMultipleEvent.OutputObject>
    >;

    let depositedAmountToken1 = parseEther("5000"),
        depositedAmountToken2 = parseEther("100000"),
        withdrawAmount = parseEther("4000"),
        depositedAmount = parseEther("3000");

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);

        users = contractsUsers.contractsUserMainnet.users;
        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;
        crv = contractsUsers.contractsUserMainnet.globalAssets.crv;

        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
        cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;
        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;

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
        await cvxConvergenceLocker.mint(users.owner, parseEther("3000000"), false);

        // transfer cvgCVX to users
        await cvxConvergenceLocker.transfer(users.user1, parseEther("1000000"));
        await cvxConvergenceLocker.transfer(users.user2, parseEther("1000000"));

        // approve cvgCVX spending from staking contract
        await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxStaking, MaxUint256);
        await cvxConvergenceLocker.connect(users.user2).approve(cvgCvxStaking, MaxUint256);

        // deposit for user1 and user2
        await cvgCvxStaking.connect(users.user1).deposit(MINT, depositedAmountToken1, EMPTY_CVX_DATA_STRUCT);
        await cvgCvxStaking.connect(users.user2).deposit(MINT, depositedAmountToken2, EMPTY_CVX_DATA_STRUCT);

        filterClaimCvg = cvgCvxStaking.filters.ClaimCvgMultiple(undefined, undefined);
        filterClaimCvgCvx = cvgCvxStaking.filters.ClaimCvgCvxMultiple(undefined, undefined);
    });

    it("Fails : claimCvgCvxRewards too early (at cycle N 1) should revert", async () => {
        await cvgCvxStaking.connect(users.user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });

    it("Success : Verifying tokenStakingInfo initial state", async () => {
        expect(await cvgCvxStaking.stakingHistoryByToken(TOKEN_1, 0)).to.be.eq(currentCycle + 1n);
        expect(await cvgCvxStaking.stakingHistoryByToken(TOKEN_2, 0)).to.be.eq(currentCycle + 1n);
    });

    it("Success : Verifying tokenInfoByCycle initial state", async () => {
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle, TOKEN_1)).to.be.deep.eq([0, 0]);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle, TOKEN_2)).to.be.deep.eq([0, 0]);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_1)).to.be.deep.eq([depositedAmountToken1, depositedAmountToken1]);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_2)).to.be.deep.eq([depositedAmountToken2, depositedAmountToken2]);
    });

    it("Success : Verifying tokenInfoByCycle initial state", async () => {
        // First cycle is set as already set to prevent call on first cycle
        expect(await cvgCvxStaking.cycleInfo(currentCycle)).to.be.deep.eq([0, 0, true]);
        expect(await cvgCvxStaking.cycleInfo(currentCycle + 1n)).to.be.deep.eq([0, depositedAmountToken1 + depositedAmountToken2, false]);
    });

    it("Success : Processing rewards & Updating cvg cycle", async () => {
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

    it("Fails : Claiming rewards on first cycle", async () => {
        await cvgCvxStaking.connect(users.user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });

    it("Success : Go to Cycle N+2 !", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 2n);
    });

    it("Success : Process Convex for cycle N+1.", async () => {
        const amountCVX = parseEther("1000");
        const amountCRV = parseEther("100");

        //rewards distribution
        await cvx.transfer(cvxConvergenceLocker, amountCVX);
        await crv.transfer(cvxConvergenceLocker, amountCRV);

        //process
        await cvgCvxStaking.processCvxRewards();

        const rewardForCycle = await cvgCvxStaking.getProcessedCvxRewards(currentCycle + 1n);
        const expectedCvxAmount = (amountCVX * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedCrvAmount = (amountCRV * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;

        expect(rewardForCycle[0]).to.deep.eq([await cvx.getAddress(), expectedCvxAmount]);
        expect(rewardForCycle[1]).to.deep.eq([await crv.getAddress(), expectedCrvAmount]);

        expect(rewardForCycle[2].token.toLowerCase()).to.be.eq(await fxs.getAddress());
        expect(rewardForCycle[2].amount).to.be.gt(0);
    });

    it("Success : deposit with user2 at cycle 3", async () => {
        await cvgCvxStaking.connect(users.user2).deposit(TOKEN_2, depositedAmount, EMPTY_CVX_DATA_STRUCT);

        expect(await cvgCvxStaking.stakingHistoryByToken(TOKEN_2, 0)).to.be.eq(currentCycle + 1n);
        expect(await cvgCvxStaking.stakingHistoryByToken(TOKEN_2, 1)).to.be.eq(currentCycle + 2n);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 2n, TOKEN_2)).to.be.deep.eq([depositedAmountToken2 - withdrawAmount, 0]);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 3n, TOKEN_2)).to.be.deep.eq([
            depositedAmountToken2 - withdrawAmount + depositedAmount,
            depositedAmount,
        ]);
        expect(await cvgCvxStaking.cycleInfo(currentCycle + 2n)).to.be.deep.eq([0, depositedAmountToken1 + depositedAmountToken2 - withdrawAmount, false]);
        expect(await cvgCvxStaking.cycleInfo(currentCycle + 3n)).to.be.deep.eq([
            0,
            depositedAmountToken1 + depositedAmountToken2 - withdrawAmount + depositedAmount,
            false,
        ]);
    });

    it("Success :  Go to cycle 4 !", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 3n);
    });

    it("Success : Process CVX Rewards for Cycle 3", async () => {
        const amountCvx = parseEther("250");
        const amountFxs = parseEther("105");
        const amountCrv = parseEther("175");

        //rewards distribution
        await cvx.transfer(cvxConvergenceLocker, amountCvx);
        await crv.transfer(cvxConvergenceLocker, amountCrv);
        await fxs.transfer(cvxConvergenceLocker, amountFxs);

        //process
        await cvgCvxStaking.processCvxRewards();

        const rewardForCycle = await cvgCvxStaking.getProcessedCvxRewards(currentCycle + 2n);
        const expectedCvxAmount = (amountCvx * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedCrvAmount = (amountCrv * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedFxsAmount = (amountFxs * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;

        expect(rewardForCycle[0]).to.deep.eq([await cvx.getAddress(), expectedCvxAmount]);
        expect(rewardForCycle[1]).to.deep.eq([await crv.getAddress(), expectedCrvAmount]);
        expect(rewardForCycle[2]).to.deep.eq([await fxs.getAddress(), expectedFxsAmount]);
    });

    it("Success : Go to cycle 5 !", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 4n);
    });

    it("Success : Process CVX Rewards for Cycle 4 ", async () => {
        const amountCvx = parseEther("800");
        const amountCrv = parseEther("1000");
        const amountFxs = parseEther("1800");

        //rewards distribution
        await cvx.transfer(cvxConvergenceLocker, amountCvx);
        await crv.transfer(cvxConvergenceLocker, amountCrv);
        await fxs.transfer(cvxConvergenceLocker, amountFxs);

        //process
        await cvgCvxStaking.processCvxRewards();

        const rewardForCycle = await cvgCvxStaking.getProcessedCvxRewards(currentCycle + 3n);
        const expectedCvxAmount = (amountCvx * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedCrvAmount = (amountCrv * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedFxsAmount = (amountFxs * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;

        expect(rewardForCycle[0]).to.deep.eq([await cvx.getAddress(), expectedCvxAmount]);
        expect(rewardForCycle[1]).to.deep.eq([await crv.getAddress(), expectedCrvAmount]);
        expect(rewardForCycle[2]).to.deep.eq([await fxs.getAddress(), expectedFxsAmount]);
    });

    it("Fails : claimCvgCvxRewards claim on a token not owned", async () => {
        await cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Success: Verify getAllClaimableCvgAmount equals to claimable of CVG for cycle 2 / 3 / 4", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 2n);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 3n);

        const cvgRewards = await cvgCvxStaking.getAllClaimableCvgAmount(TOKEN_1);
        expect(cvgRewards).to.be.equal(cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0]);
    });

    it("Success: getClaimableCyclesAndAmounts with toCycle under actual cycle", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 2n);
        const allCycleAmounts = await cvgCvxStaking.getClaimableCyclesAndAmounts(TOKEN_1);

        // cycle 2
        let cvxRewards = allCycleAmounts[0].cvxRewards;
        expect(allCycleAmounts[0].cvgRewards).to.be.equal(cycle2RewardsExpected[0]);
        expect(cvxRewards[0].amount).to.be.equal(cycle2RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle2RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle2RewardsExpected[3]);

        //cycle 3
        cvxRewards = allCycleAmounts[1].cvxRewards;
        expect(allCycleAmounts[1].cvgRewards).to.be.equal(cycle3RewardsExpected[0]);
        expect(cvxRewards[0].amount).to.be.equal(cycle3RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle3RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle3RewardsExpected[3]);
    });

    it("Success: Verify getAllClaimableAmounts for cycle 2 / 3 / 4", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 2n);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 3n);

        const allClaimableAmounts = await cvgCvxStaking.getAllClaimableAmounts(TOKEN_1);
        const cvgRewards = allClaimableAmounts[0];
        const allCvxRewards = allClaimableAmounts[1];

        const cvxRewards = allCvxRewards[0].amount;
        const crvRewards = allCvxRewards[1].amount;
        const fxsRewards = allCvxRewards[2].amount;

        expect(cvgRewards).to.be.equal(cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0]);
        expect(cvxRewards).to.be.equal(cycle2RewardsExpected[1] + cycle3RewardsExpected[1] + cycle4RewardsExpected[1]);
        expect(crvRewards).to.be.equal(cycle2RewardsExpected[2] + cycle3RewardsExpected[2] + cycle4RewardsExpected[2]);
        expect(fxsRewards).to.be.equal(cycle2RewardsExpected[3] + cycle3RewardsExpected[3] + cycle4RewardsExpected[3]);
    });

    it("Success: getClaimableCyclesAndAmounts with fromCycle equals to toCycle", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);
        const allCycleAmounts = await cvgCvxStaking.getClaimableCyclesAndAmounts(TOKEN_1);

        // cycle 2
        let cvxRewards = allCycleAmounts[0].cvxRewards;
        expect(allCycleAmounts[0].cvgRewards).to.be.equal(cycle2RewardsExpected[0]);
        expect(cvxRewards[0].amount).to.be.equal(cycle2RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle2RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle2RewardsExpected[3]);
    });

    it("Success: Check claimable", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 2n);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 3n);

        const cvgClaimable = await cvgCvxStaking.getAllClaimableCvgAmount(TOKEN_1);
        const allAmounts = await cvgCvxStaking.getAllClaimableAmounts(TOKEN_1);
        const allCycleAmounts = await cvgCvxStaking.getClaimableCyclesAndAmounts(TOKEN_1);
        const totalCvg = cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0];
        const totalCvx = cycle2RewardsExpected[1] + cycle3RewardsExpected[1] + cycle4RewardsExpected[1];
        const totalCrv = cycle2RewardsExpected[2] + cycle3RewardsExpected[2] + cycle4RewardsExpected[2];
        const totalFxs = cycle2RewardsExpected[3] + cycle3RewardsExpected[3] + cycle4RewardsExpected[3];

        expect(cvgClaimable).to.be.equal(totalCvg);
        expect(allAmounts[0]).to.be.equal(totalCvg);
        expect(allAmounts[1][0].amount).to.be.equal(totalCvx);
        expect(allAmounts[1][1].amount).to.be.equal(totalCrv);
        expect(allAmounts[1][2].amount).to.be.equal(totalFxs);

        // cycle 2
        let cvxRewards = allCycleAmounts[0].cvxRewards;
        expect(allCycleAmounts[0].cvgRewards).to.be.equal(cycle2RewardsExpected[0]);
        expect(cvxRewards[0].amount).to.be.equal(cycle2RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle2RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle2RewardsExpected[3]);

        //cycle 3
        cvxRewards = allCycleAmounts[1].cvxRewards;
        expect(allCycleAmounts[1].cvgRewards).to.be.equal(cycle3RewardsExpected[0]);
        expect(cvxRewards[0].amount).to.be.equal(cycle3RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle3RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle3RewardsExpected[3]);

        //cycle 4
        cvxRewards = allCycleAmounts[2].cvxRewards;
        expect(allCycleAmounts[2].cvgRewards).to.be.equal(cycle4RewardsExpected[0]);
        expect(cvxRewards[0].amount).to.be.equal(cycle4RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle4RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle4RewardsExpected[3]);
    });

    it("Success : Claim with claimCvgRewards for Token 4 for cycle 2 / 3 / 4 ", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 2n);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 3n);

        const tx = cvgCvxStaking.connect(users.user1).claimCvgRewards(TOKEN_1);
        await expect(tx).to.changeTokenBalances(cvg, [users.user1], [cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0]]);

        const events = await cvgCvxStaking.queryFilter(filterClaimCvg, -1, "latest");

        const event = events[0].args;
        const expectedEvent = [TOKEN_1, await users.user1.getAddress()];
        expect(event).to.be.deep.eq(expectedEvent);
    });

    it("Success:  Claim with claimCvgSdtRewards for Token 4 for cycle 2 / 3 / 4. Only Convex is claimed on the 3 cycles.", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 2n);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 3n);
        const allCycleAmounts = await cvgCvxStaking.getClaimableCyclesAndAmounts(TOKEN_1);

        //cycle 2
        expect(allCycleAmounts[0].cycleClaimable).to.be.equal(currentCycle + 1n);
        let cvxRewards = allCycleAmounts[0].cvxRewards;
        expect(allCycleAmounts[0].cvgRewards).to.be.equal(0);
        expect(cvxRewards[0].amount).to.be.equal(cycle2RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle2RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle2RewardsExpected[3]);

        //cycle 3
        expect(allCycleAmounts[1].cycleClaimable).to.be.equal(currentCycle + 2n);
        cvxRewards = allCycleAmounts[1].cvxRewards;
        expect(allCycleAmounts[1].cvgRewards).to.be.equal(0);
        expect(cvxRewards[0].amount).to.be.equal(cycle3RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle3RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle3RewardsExpected[3]);

        //cycle 4
        expect(allCycleAmounts[2].cycleClaimable).to.be.equal(currentCycle + 3n);
        cvxRewards = allCycleAmounts[2].cvxRewards;
        expect(allCycleAmounts[2].cvgRewards).to.be.equal(0);
        expect(cvxRewards[0].amount).to.be.equal(cycle4RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle4RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle4RewardsExpected[3]);
    });

    it("Success : Claim Token 4 CvgSdt Rewards for cycle 2 & 3 & 4. CVG Are already claimed here.", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 2n);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 3n);
        const tx = cvgCvxStaking.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false);

        const totalCvx = cycle2RewardsExpected[1] + cycle3RewardsExpected[1] + cycle4RewardsExpected[1];
        const totalCrv = cycle2RewardsExpected[2] + cycle3RewardsExpected[2] + cycle4RewardsExpected[2];
        const totalFxs = cycle2RewardsExpected[3] + cycle3RewardsExpected[3] + cycle4RewardsExpected[3];

        // Only cycle 3 is claimed for CVG
        await expect(tx).to.changeTokenBalances(cvg, [users.user1], [0]);
        await expect(tx).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user1], [-totalCvx, totalCvx]);
        await expect(tx).to.changeTokenBalances(crv, [cvxRewardDistributor, users.user1], [-totalCrv, totalCrv]);
        await expect(tx).to.changeTokenBalances(fxs, [cvxRewardDistributor, users.user1], [-totalFxs, totalFxs]);

        const events = await cvgCvxStaking.queryFilter(filterClaimCvgCvx, -1, "latest");
        const event = events[0].args;
        expect(event.tokenId).to.be.eq(TOKEN_1);
        expect(event.account).to.be.eq(await users.user1.getAddress());
    });

    it("Success: getClaimableCyclesAndAmounts with all rewards claimed for cycle 2 to cycle 4 should compute nothing to claim", async () => {
        const allCycleAmounts = await cvgCvxStaking.getClaimableCyclesAndAmounts(TOKEN_1);
        expect(allCycleAmounts.length).to.be.eq(0);
    });
    it("Fails : Try to claim without claimContract data", async () => {
        await cvxRewardDistributor.connect(users.user2).claimMultipleStaking([], 0, false, 6).should.be.rejectedWith("NO_STAKING_SELECTED");
    });
    it("Fails : Try to claim without tokenId in claimContract data", async () => {
        await cvxRewardDistributor
            .connect(users.user2)
            .claimMultipleStaking([{stakingContract: cvgCvxStaking, tokenIds: []}], 0, false, 6)
            .should.be.rejectedWith("NO_STAKING_POSITIONS_SELECTED");
    });
    it("Fails : Try to claim wrong reward count", async () => {
        await cvxRewardDistributor
            .connect(users.user2)
            .claimMultipleStaking([{stakingContract: cvgCvxStaking, tokenIds: [TOKEN_2]}], 0, false, 2)
            .should.be.rejectedWith("REWARD_COUNT_TOO_SMALL");
    });
    it("Success : claimCvgCvxRewards user2 / token2 for cycle 2 & 3 & 4", async () => {
        await mine(1);
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_2, currentCycle + 1n);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_2, currentCycle + 2n);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_2, currentCycle + 3n);
        const tx = cvxRewardDistributor.connect(users.user2).claimMultipleStaking([{stakingContract: cvgCvxStaking, tokenIds: [TOKEN_2]}], 0, false, 3);

        const totalCvg = cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0];
        const totalCvx = cycle2RewardsExpected[1] + cycle3RewardsExpected[1] + cycle4RewardsExpected[1];
        const totalCrv = cycle2RewardsExpected[2] + cycle3RewardsExpected[2] + cycle4RewardsExpected[2];
        const totalFxs = cycle2RewardsExpected[3] + cycle3RewardsExpected[3] + cycle4RewardsExpected[3];

        // Only cycle 3 is claimed for CVG
        await expect(tx).to.changeTokenBalances(cvg, [users.user2], [totalCvg]);
        await expect(tx).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user2], [-totalCvx, totalCvx]);
        await expect(tx).to.changeTokenBalances(crv, [cvxRewardDistributor, users.user2], [-totalCrv, totalCrv]);
        await expect(tx).to.changeTokenBalances(fxs, [cvxRewardDistributor, users.user2], [-totalFxs, totalFxs]);

        const events = await cvgCvxStaking.queryFilter(filterClaimCvgCvx, -1, "latest");
        const event = events[0].args;
        expect(event.tokenId).to.be.eq(TOKEN_2);
        expect(event.account).to.be.eq(await users.user2.getAddress());
    });

    it("Fails : Reclaim with several combinations", async () => {
        await cvgCvxStaking.connect(users.user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");

        await cvgCvxStaking.connect(users.user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");

        await cvgCvxStaking.connect(users.user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");

        await cvgCvxStaking.connect(users.user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");

        await cvgCvxStaking.connect(users.user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });
});
