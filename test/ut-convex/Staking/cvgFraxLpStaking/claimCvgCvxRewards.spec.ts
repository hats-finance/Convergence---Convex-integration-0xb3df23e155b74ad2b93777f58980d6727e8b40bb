import {loadFixture, mine} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {Signer} from "ethers";
import {
    Cvg,
    CvgFraxLpLocker,
    CvgFraxLpStakingService,
    CvxRewardDistributor,
    CvxStakingPositionManager,
    ERC20,
    IConvexStaking,
    IConvexVault,
    ICurveLp,
    LockingPositionService,
} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {CLAIMER_REWARDS_PERCENTAGE, MINT, TOKEN_1, TOKEN_2} from "../../../../resources/constant";
import {GaugeController} from "../../../../typechain-types-vyper";
import {getExpectedCvgCvxRewards} from "../../../../utils/stakeDao/getStakingShareForCycle";

import {TypedContractEvent, TypedDeferredTopicFilter} from "../../../../typechain-types/common";
import {ClaimCvgMultipleEvent, ClaimCvgCvxMultipleEvent} from "../../../../typechain-types/contracts/Staking/StakingServiceBase";
import {OWNABLE_REVERT} from "../../../../resources/revert";

const DENOMINATOR = 100000n;

describe("cvgFraxLpStaking - Claim CvgCvx Rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer, owner: Signer, user1: Signer, user2: Signer, user3: Signer;
    let cvg: Cvg, cvx: ERC20, fxs: ERC20, crv: ERC20, usdc: ERC20, frax: ERC20, eusd: ERC20, fraxbp: ERC20, eusdfraxbp: ICurveLp;
    let cvgeUSDFRAXBPLocker: CvgFraxLpLocker;
    let cvgeUSDFRAXBPStaking: CvgFraxLpStakingService;
    let cvxcvgeUSDFRAXBPStaking: IConvexStaking;
    let eUSDFRAXBPVault: IConvexVault;
    let cvxRewardDistributor: CvxRewardDistributor;
    let cvxStakingPositionManager: CvxStakingPositionManager;
    let gaugeController: GaugeController, lockingPositionService: LockingPositionService;
    let currentCycle: bigint;
    let depositedAmountUser1 = ethers.parseEther("5000"),
        depositedAmountUser2 = ethers.parseEther("100000"),
        withdrawAmount = ethers.parseEther("4000"),
        depositedAmount = ethers.parseEther("3000");
    let CYCLE_1: bigint, CYCLE_2: bigint, CYCLE_3: bigint, CYCLE_4: bigint, CYCLE_5: bigint;
    let filterClaimCvg: TypedDeferredTopicFilter<
        TypedContractEvent<ClaimCvgMultipleEvent.InputTuple, ClaimCvgMultipleEvent.OutputTuple, ClaimCvgMultipleEvent.OutputObject>
    >;
    let filterClaimCvgCvx: TypedDeferredTopicFilter<
        TypedContractEvent<ClaimCvgCvxMultipleEvent.InputTuple, ClaimCvgCvxMultipleEvent.OutputTuple, ClaimCvgCvxMultipleEvent.OutputObject>
    >;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        user3 = users.user3;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);
        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;
        crv = contractsUsers.contractsUserMainnet.globalAssets.crv;
        usdc = contractsUsers.contractsUserMainnet.globalAssets.usdc;
        frax = contractsUsers.contractsUserMainnet.globalAssets.frax;
        eusd = contractsUsers.contractsUserMainnet.convexAssets!.eusd;
        fraxbp = contractsUsers.contractsUserMainnet.globalAssets!.fraxBp;
        eusdfraxbp = contractsUsers.contractsUserMainnet.curveLps!.eusdfraxbp;
        cvgeUSDFRAXBPStaking = contractsUsers.convex.cvgFraxLpStaking.cvgeUSDFRAXBPStaking;
        cvgeUSDFRAXBPLocker = contractsUsers.convex.cvgFraxLpLocker.cvgeUSDFRAXBPLocker;
        eUSDFRAXBPVault = contractsUsers.convex.convexVault.eUSDFRAXBPVault;
        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;
        cvxStakingPositionManager = contractsUsers.convex.cvxStakingPositionManager;
        lockingPositionService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;

        cvxcvgeUSDFRAXBPStaking = await ethers.getContractAt("IConvexStaking", await eUSDFRAXBPVault.stakingAddress());

        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();
        CYCLE_1 = currentCycle;
        CYCLE_2 = currentCycle + 1n;
        CYCLE_3 = currentCycle + 2n;
        CYCLE_4 = currentCycle + 3n;
        CYCLE_5 = currentCycle + 4n;

        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).add_gauge(cvgeUSDFRAXBPStaking, 0, 0);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).toggle_vote_pause(cvgeUSDFRAXBPStaking);

        // transfer 1 wei of to initialize the staker position of the locker contract
        await eusdfraxbp.transfer(cvgeUSDFRAXBPLocker, "1");
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setupLocker(cvgeUSDFRAXBPStaking);

        // mint locking position and vote for cvgSdtStaking gauge
        const lockingEndCycle = 96n - currentCycle;
        // console.log("lockingEndCycle", lockingEndCycle);
        const tokenId = await contractsUsers.contractsUserMainnet.locking.lockingPositionManager.nextId();
        await cvg.approve(lockingPositionService, ethers.parseEther("300000"));
        await lockingPositionService.mintPosition(lockingEndCycle, ethers.parseEther("100000"), 0, owner, true);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.simple_vote(tokenId, cvgeUSDFRAXBPStaking, 1000);

        //mint cvgeUSDFRAXBP
        await eusdfraxbp.connect(owner).approve(cvgeUSDFRAXBPLocker, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(owner).depositLp(ethers.parseEther("3000000"), true, owner);

        //transfer cvgeUSDFRAXBP to users
        await cvgeUSDFRAXBPLocker.transfer(user1, ethers.parseEther("1000000"));
        await cvgeUSDFRAXBPLocker.transfer(user2, ethers.parseEther("1000000"));
        await cvgeUSDFRAXBPLocker.transfer(user3, ethers.parseEther("1000000"));

        // approve cvgSdt spending from staking contract
        await cvgeUSDFRAXBPLocker.connect(user1).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(user2).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);

        //deposit
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(MINT, depositedAmountUser1);
        await cvgeUSDFRAXBPStaking.connect(user2).deposit(MINT, depositedAmountUser2);

        filterClaimCvg = cvgeUSDFRAXBPStaking.filters.ClaimCvgMultiple(undefined, undefined);
        filterClaimCvgCvx = cvgeUSDFRAXBPStaking.filters.ClaimCvgCvxMultiple(undefined, undefined);
    });
    it("Fail: setProcessorRewardsPercentage with random user", async () => {
        await cvgeUSDFRAXBPLocker.setProcessorRewardsPercentage(3500).should.be.revertedWith(OWNABLE_REVERT);
    });
    it("Fail: setProcessorRewardsPercentage with percentage too high", async () => {
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setProcessorRewardsPercentage(3500).should.be.revertedWith("PERCENTAGE_TOO_HIGH");
    });
    it("Success: setProcessorRewardsPercentage", async () => {
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setProcessorRewardsPercentage(1000);
    });

    it("Fail: pull rewards with random user", async () => {
        await cvgeUSDFRAXBPLocker.pullRewards(owner).should.be.revertedWith("NOT_CVX_REWARD_DISTRIBUTOR");
    });
    it("Fails : claimCvgCvxRewards too early (at cycle N 1) should revert", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });

    it("Success : Verifying tokenStakingInfo initial state", async () => {
        expect(await cvgeUSDFRAXBPStaking.stakingHistoryByToken(TOKEN_1, 0)).to.be.eq(CYCLE_2);
        expect(await cvgeUSDFRAXBPStaking.stakingHistoryByToken(TOKEN_2, 0)).to.be.eq(CYCLE_2);
    });

    it("Success : Verifying tokenInfoByCycle initial state", async () => {
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_1, TOKEN_1)).to.be.deep.eq([0, 0]);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_1, TOKEN_2)).to.be.deep.eq([0, 0]);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_1)).to.be.deep.eq([depositedAmountUser1, depositedAmountUser1]);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_2)).to.be.deep.eq([depositedAmountUser2, depositedAmountUser2]);
    });

    it("Success : Verifying tokenInfoByCycle initial state", async () => {
        // First cycle is set as already set to prevent call on first cycle
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_1)).to.be.deep.eq([0, 0, true]);
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_2)).to.be.deep.eq([0, depositedAmountUser1 + depositedAmountUser2, false]);
    });

    it("Success : Processing rewards & Updating cvg cycle to 1", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_2);
    });

    it("Success : Withdrawing user2 at cycle 2", async () => {
        await cvgeUSDFRAXBPStaking.connect(user2).withdraw(TOKEN_2, withdrawAmount);
        expect(await cvgeUSDFRAXBPStaking.stakingHistoryByToken(TOKEN_2, 0)).to.be.eq(CYCLE_2);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_2)).to.be.deep.eq([depositedAmountUser2 - withdrawAmount, depositedAmountUser2]);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_3, TOKEN_2)).to.be.deep.eq([depositedAmountUser2 - withdrawAmount, 0]);
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_2)).to.be.deep.eq([0, depositedAmountUser1 + depositedAmountUser2 - withdrawAmount, false]);
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_3)).to.be.deep.eq([0, depositedAmountUser1 + depositedAmountUser2 - withdrawAmount, false]);
    });

    it("Fails : Claiming rewards on first cycle", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });

    it("Success : Go to Cycle 3 !", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_3);
    });
    it("Success : Process Convex for cycle 2.", async () => {
        const amountCvx = ethers.parseEther("500");
        const amountCrv = ethers.parseEther("1000");
        const amountfxs = ethers.parseEther("400");

        //simulate getReward call with the owner
        const getRewards = await cvgeUSDFRAXBPLocker.connect(treasuryDao).getReward.staticCall();

        //rewards distribution
        await cvx.transfer(cvgeUSDFRAXBPLocker, amountCvx);
        await crv.transfer(cvgeUSDFRAXBPLocker, amountCrv);
        await fxs.transfer(cvgeUSDFRAXBPLocker, amountfxs);

        //process
        await cvgeUSDFRAXBPStaking.processCvxRewards();

        const rewardForCycle = await cvgeUSDFRAXBPStaking.getProcessedCvxRewards(CYCLE_2);
        const expectedCvxAmount = ((amountCvx + getRewards[0]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedCrvAmount = ((amountCrv + getRewards[1]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedFxsAmount = ((amountfxs + getRewards[2]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        expect(rewardForCycle[0].token).to.deep.eq(await cvx.getAddress());
        expect(rewardForCycle[0].amount).to.be.approximately(expectedCvxAmount, ethers.parseEther("0.5"));
        expect(rewardForCycle[1].token).to.deep.eq(await crv.getAddress());
        expect(rewardForCycle[1].amount).to.be.approximately(expectedCrvAmount, ethers.parseEther("0.5"));
        expect(rewardForCycle[2].token).to.deep.eq(await fxs.getAddress());
        expect(rewardForCycle[2].amount).to.be.approximately(expectedFxsAmount, ethers.parseEther("0.5"));
    });

    it("Success : deposit with user2 at cycle 3", async () => {
        await cvgeUSDFRAXBPStaking.connect(user2).deposit(TOKEN_2, depositedAmount);

        expect(await cvgeUSDFRAXBPStaking.stakingHistoryByToken(TOKEN_2, 0)).to.be.eq(CYCLE_2);
        expect(await cvgeUSDFRAXBPStaking.stakingHistoryByToken(TOKEN_2, 1)).to.be.eq(CYCLE_3);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_3, TOKEN_2)).to.be.deep.eq([depositedAmountUser2 - withdrawAmount, 0]);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_4, TOKEN_2)).to.be.deep.eq([
            depositedAmountUser2 - withdrawAmount + depositedAmount,
            depositedAmount,
        ]);
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_3)).to.be.deep.eq([0, depositedAmountUser1 + depositedAmountUser2 - withdrawAmount, false]);
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_4)).to.be.deep.eq([
            0,
            depositedAmountUser1 + depositedAmountUser2 - withdrawAmount + depositedAmount,
            false,
        ]);
    });

    it("Success :  Go to cycle 4 !", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_4);
    });
    it("Success : Process Convex for cycle 3.", async () => {
        const amountCvx = ethers.parseEther("700");
        const amountCrv = ethers.parseEther("300");
        const amountfxs = ethers.parseEther("100");

        //simulate getReward call with the owner
        const getRewards = await cvgeUSDFRAXBPLocker.connect(treasuryDao).getReward.staticCall();

        //rewards distribution
        await cvx.transfer(cvgeUSDFRAXBPLocker, amountCvx);
        await crv.transfer(cvgeUSDFRAXBPLocker, amountCrv);
        await fxs.transfer(cvgeUSDFRAXBPLocker, amountfxs);

        //process
        await cvgeUSDFRAXBPStaking.processCvxRewards();

        const rewardForCycle = await cvgeUSDFRAXBPStaking.getProcessedCvxRewards(CYCLE_3);
        const expectedCvxAmount = ((amountCvx + getRewards[0]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedCrvAmount = ((amountCrv + getRewards[1]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedFxsAmount = ((amountfxs + getRewards[2]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        expect(rewardForCycle[0].token).to.deep.eq(await cvx.getAddress());
        expect(rewardForCycle[0].amount).to.be.approximately(expectedCvxAmount, ethers.parseEther("0.1"));
        expect(rewardForCycle[1].token).to.deep.eq(await crv.getAddress());
        expect(rewardForCycle[1].amount).to.be.approximately(expectedCrvAmount, ethers.parseEther("0.1"));
        expect(rewardForCycle[2].token).to.deep.eq(await fxs.getAddress());
        expect(rewardForCycle[2].amount).to.be.approximately(expectedFxsAmount, ethers.parseEther("0.1"));
    });

    it("Success : Go to cycle 5 !", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_5);
    });
    it("Success : Process Convex for cycle 4.", async () => {
        const amountCvx = ethers.parseEther("800");
        const amountCrv = ethers.parseEther("300");
        const amountfxs = ethers.parseEther("100");

        //simulate getReward call with the owner
        const getRewards = await cvgeUSDFRAXBPLocker.connect(treasuryDao).getReward.staticCall();

        //rewards distribution
        await cvx.transfer(cvgeUSDFRAXBPLocker, amountCvx);
        await crv.transfer(cvgeUSDFRAXBPLocker, amountCrv);
        await fxs.transfer(cvgeUSDFRAXBPLocker, amountfxs);

        //process
        await cvgeUSDFRAXBPStaking.processCvxRewards();

        const rewardForCycle = await cvgeUSDFRAXBPStaking.getProcessedCvxRewards(CYCLE_4);
        const expectedCvxAmount = ((amountCvx + getRewards[0]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedCrvAmount = ((amountCrv + getRewards[1]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedFxsAmount = ((amountfxs + getRewards[2]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        expect(rewardForCycle[0].token).to.deep.eq(await cvx.getAddress());
        expect(rewardForCycle[0].amount).to.be.approximately(expectedCvxAmount, ethers.parseEther("0.1"));
        expect(rewardForCycle[1].token).to.deep.eq(await crv.getAddress());
        expect(rewardForCycle[1].amount).to.be.approximately(expectedCrvAmount, ethers.parseEther("0.1"));
        expect(rewardForCycle[2].token).to.deep.eq(await fxs.getAddress());
        expect(rewardForCycle[2].amount).to.be.approximately(expectedFxsAmount, ethers.parseEther("0.1"));
    });

    it("Fails : claimCvgCvxRewards claim on a token not owned", async () => {
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Success: Verify getAllClaimableCvgAmount equals to claimable of CVG for cycle 2 / 3 / 4", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_3);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_4);

        const cvgRewards = await cvgeUSDFRAXBPStaking.getAllClaimableCvgAmount(TOKEN_1);
        expect(cvgRewards).to.be.equal(cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0]);
    });

    it("Success: getClaimableCyclesAndAmounts with toCycle under actual cycle", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_3);
        const allCycleAmounts = await cvgeUSDFRAXBPStaking.getClaimableCyclesAndAmounts(TOKEN_1);
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
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_3);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_4);

        const allClaimableAmounts = await cvgeUSDFRAXBPStaking.getAllClaimableAmounts(TOKEN_1);
        const cvgRewards = allClaimableAmounts[0];
        const allCvxRewards = allClaimableAmounts[1];

        const cvxRewards = allCvxRewards[0].amount;
        const crvCrvRewards = allCvxRewards[1].amount;
        const fxsRewards = allCvxRewards[2].amount;

        expect(cvgRewards).to.be.equal(cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0]);
        expect(cvxRewards).to.be.equal(cycle2RewardsExpected[1] + cycle3RewardsExpected[1] + cycle4RewardsExpected[1]);
        expect(crvCrvRewards).to.be.equal(cycle2RewardsExpected[2] + cycle3RewardsExpected[2] + cycle4RewardsExpected[2]);
        expect(fxsRewards).to.be.equal(cycle2RewardsExpected[3] + cycle3RewardsExpected[3] + cycle4RewardsExpected[3]);
    });

    it("Success: getClaimableCyclesAndAmounts with fromCycle equals to toCycle", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const allCycleAmounts = await cvgeUSDFRAXBPStaking.getClaimableCyclesAndAmounts(TOKEN_1);
        // cycle 2
        let cvxRewards = allCycleAmounts[0].cvxRewards;
        expect(allCycleAmounts[0].cvgRewards).to.be.equal(cycle2RewardsExpected[0]);
        expect(cvxRewards[0].amount).to.be.equal(cycle2RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle2RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle2RewardsExpected[3]);
    });

    it("Success: Check claimable", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_3);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_4);
        const cvgClaimable = await cvgeUSDFRAXBPStaking.getAllClaimableCvgAmount(TOKEN_1);
        const allAmounts = await cvgeUSDFRAXBPStaking.getAllClaimableAmounts(TOKEN_1);
        const allCycleAmounts = await cvgeUSDFRAXBPStaking.getClaimableCyclesAndAmounts(TOKEN_1);
        const totalCvg = cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0];
        const totalSdt = cycle2RewardsExpected[1] + cycle3RewardsExpected[1] + cycle4RewardsExpected[1];
        const totalSdFrax3CRV = cycle2RewardsExpected[2] + cycle3RewardsExpected[2] + cycle4RewardsExpected[2];
        const totalCvgSdt = cycle2RewardsExpected[3] + cycle3RewardsExpected[3] + cycle4RewardsExpected[3];

        expect(cvgClaimable).to.be.equal(totalCvg);
        expect(allAmounts[0]).to.be.equal(totalCvg);
        expect(allAmounts[1][0].amount).to.be.equal(totalSdt);
        expect(allAmounts[1][1].amount).to.be.equal(totalSdFrax3CRV);
        expect(allAmounts[1][2].amount).to.be.equal(totalCvgSdt);

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
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_3);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_4);

        const tx = cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1);

        await expect(tx).to.changeTokenBalances(cvg, [user1], [cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0]]);

        const events = await cvgeUSDFRAXBPStaking.queryFilter(filterClaimCvg, -1, "latest");

        const event = events[0].args;
        const expectedEvent = [TOKEN_1, await user1.getAddress()];
        expect(event).to.be.deep.eq(expectedEvent);
    });

    it("Success:  Claim with claimCvgCvxRewards for Token 4 for cycle 2 / 3 / 4. Only Convex is claimed on the 3 cycles.", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_3);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_4);
        const allCycleAmounts = await cvgeUSDFRAXBPStaking.getClaimableCyclesAndAmounts(TOKEN_1);
        //cycle 2
        expect(allCycleAmounts[0].cycleClaimable).to.be.equal(CYCLE_2);
        let cvxRewards = allCycleAmounts[0].cvxRewards;
        expect(allCycleAmounts[0].cvgRewards).to.be.equal(0);
        expect(cvxRewards[0].amount).to.be.equal(cycle2RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle2RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle2RewardsExpected[3]);

        //cycle 3
        expect(allCycleAmounts[1].cycleClaimable).to.be.equal(CYCLE_3);
        cvxRewards = allCycleAmounts[1].cvxRewards;
        expect(allCycleAmounts[1].cvgRewards).to.be.equal(0);
        expect(cvxRewards[0].amount).to.be.equal(cycle3RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle3RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle3RewardsExpected[3]);

        //cycle 4
        expect(allCycleAmounts[2].cycleClaimable).to.be.equal(CYCLE_4);
        cvxRewards = allCycleAmounts[2].cvxRewards;
        expect(allCycleAmounts[2].cvgRewards).to.be.equal(0);
        expect(cvxRewards[0].amount).to.be.equal(cycle4RewardsExpected[1]);
        expect(cvxRewards[1].amount).to.be.equal(cycle4RewardsExpected[2]);
        expect(cvxRewards[2].amount).to.be.equal(cycle4RewardsExpected[3]);
    });

    it("Success : Claim Token 4 CvgSdt Rewards for cycle 2 & 3 & 4. CVG Are already claimed here.", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_3);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_4);
        const tx = cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false);

        const totalCvx = cycle2RewardsExpected[1] + cycle3RewardsExpected[1] + cycle4RewardsExpected[1];
        const totalCrv = cycle2RewardsExpected[2] + cycle3RewardsExpected[2] + cycle4RewardsExpected[2];
        const totalFxs = cycle2RewardsExpected[3] + cycle3RewardsExpected[3] + cycle4RewardsExpected[3];

        // Only cycle 3 is claimed for CVG
        await expect(tx).to.changeTokenBalances(cvg, [user1], [0]);

        await expect(tx).to.changeTokenBalances(cvx, [cvxRewardDistributor, user1], [-totalCvx, totalCvx]);
        await expect(tx).to.changeTokenBalances(crv, [cvxRewardDistributor, user1], [-totalCrv, totalCrv]);
        await expect(tx).to.changeTokenBalances(fxs, [cvxRewardDistributor, user1], [-totalFxs, totalFxs]);

        const events = await cvgeUSDFRAXBPStaking.queryFilter(filterClaimCvgCvx, -1, "latest");
        const event = events[0].args;
        expect(event.tokenId).to.be.eq(TOKEN_1);
        expect(event.account).to.be.eq(await user1.getAddress());
    });

    it("Success: getClaimableCyclesAndAmounts with all rewards claimed for cycle 2 to cycle 4 should compute nothing to claim", async () => {
        const allCycleAmounts = await cvgeUSDFRAXBPStaking.getClaimableCyclesAndAmounts(TOKEN_1);
        expect(allCycleAmounts.length).to.be.eq(0);
    });

    it("Success : claimCvgCvxRewards user2 / token2 for cycle 2 & 3 & 4", async () => {
        await mine(1);
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_2, CYCLE_2);
        const cycle3RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_2, CYCLE_3);
        const cycle4RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_2, CYCLE_4);
        const tx = cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        const totalCvg = cycle2RewardsExpected[0] + cycle3RewardsExpected[0] + cycle4RewardsExpected[0];
        const totalCvx = cycle2RewardsExpected[1] + cycle3RewardsExpected[1] + cycle4RewardsExpected[1];
        const totalCrv = cycle2RewardsExpected[2] + cycle3RewardsExpected[2] + cycle4RewardsExpected[2];
        const totalFxs = cycle2RewardsExpected[3] + cycle3RewardsExpected[3] + cycle4RewardsExpected[3];

        // Only cycle 3 is claimed for CVG
        await expect(tx).to.changeTokenBalances(cvg, [user2], [totalCvg]);

        await expect(tx).to.changeTokenBalances(cvx, [cvxRewardDistributor, user2], [-totalCvx, totalCvx]);
        await expect(tx).to.changeTokenBalances(crv, [cvxRewardDistributor, user2], [-totalCrv, totalCrv]);
        await expect(tx).to.changeTokenBalances(fxs, [cvxRewardDistributor, user2], [-totalFxs, totalFxs]);

        const events = await cvgeUSDFRAXBPStaking.queryFilter(filterClaimCvgCvx, -1, "latest");
        const event = events[0].args;
        expect(event.tokenId).to.be.eq(TOKEN_2);
        expect(event.account).to.be.eq(await user2.getAddress());
    });

    it("Fails : Reclaim with several combinations", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");

        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");

        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");

        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");

        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });
});
