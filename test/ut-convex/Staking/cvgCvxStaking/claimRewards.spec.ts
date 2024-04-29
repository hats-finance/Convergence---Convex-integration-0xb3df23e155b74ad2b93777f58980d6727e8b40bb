import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, Signer, MaxUint256, ZeroAddress, EventLog} from "ethers";
import {
    Cvg,
    CvgCvxStakingPositionService,
    CvgRewardsV2,
    CvxConvergenceLocker,
    CvxRewardDistributor,
    ERC20,
    CVX1
} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {MINT, TOKEN_1, TOKEN_2, CLAIMER_REWARDS_PERCENTAGE} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {getExpectedCvgCvxRewards} from "../../../../utils/stakeDao/getStakingShareForCycle";
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";
import {calcStakingInflation} from "../../../../utils/global/computeCvgStakingInflation";
import {OWNABLE_REVERT} from "../../../../resources/revert";

describe("CvgCvxStaking - Claim Rewards ", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvx: ERC20, fxs: ERC20, crv: ERC20, cvg: Cvg;
    let cvx1: CVX1;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let cvxRewardDistributor: CvxRewardDistributor;
    let currentCycle: bigint;
    let cvgRewards: CvgRewardsV2;

    const depositedAmountToken1 = parseEther("5000");
    const depositedAmountToken2 = parseEther("6735");

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);

        users = contractsUsers.contractsUserMainnet.users;
        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;
        crv = contractsUsers.contractsUserMainnet.globalAssets.crv;
        cvx1 = contractsUsers.convex.CVX1;

        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
        cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;
        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;
        cvgRewards = contractsUsers.contractsUserMainnet.rewards.cvgRewards;
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
    });

    it("Fail: claimCvgCvxMultiple with other caller than cvxRewardDistributor contract", async () => {
        await cvgCvxStaking.claimCvgCvxMultiple(0, users.user1).should.be.revertedWith("NOT_CVX_REWARD_DISTRIBUTOR");
    });

    it("Fail: setPoolCvgCvxAndApprove with random user", async () => {
        await cvxRewardDistributor.setPoolCvgCvxCvx1AndApprove(ZeroAddress, 0).should.be.revertedWith(OWNABLE_REVERT);
    });

    it("Success: setPoolCvgCvxAndApprove twice with 2 different addresses", async () => {
        await cvxRewardDistributor.connect(treasuryDao).setPoolCvgCvxCvx1AndApprove(users.user1, parseEther("1"));
        await cvxRewardDistributor.connect(treasuryDao).setPoolCvgCvxCvx1AndApprove(users.user2, parseEther("1"));
        expect(await cvx1.allowance(cvxRewardDistributor, users.user1)).to.be.equal(0);
        expect(await cvx1.allowance(cvxRewardDistributor, users.user2)).to.be.equal(parseEther("1"));
    });

    it("Fail: claimCvgCvxSimple with other caller than staking contract should revert", async () => {
        await cvxRewardDistributor.claimCvgCvxSimple(ZeroAddress, 0, [{token: ZeroAddress, amount: 0}], 0, false).should.be.revertedWith("NOT_STAKING");
    });

    it("process cvg rewards for cycle N & update cvg cycle to N+1 should compute right infos", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);

        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 1n);
        expect((await cvgCvxStaking.cycleInfo(currentCycle)).cvgRewardsAmount).to.be.equal(0);
    });

    it("Process stakers rewards with other caller than gauge should revert", async () => {
        await cvgCvxStaking.processStakersRewards(currentCycle).should.be.revertedWith("NOT_CVG_REWARDS");
    });

    it("Fails : process Cvx rewards for cycle N should revert with no stakers ", async () => {
        await expect(cvgCvxStaking.processCvxRewards()).to.be.rejectedWith("NO_STAKERS");
    });

    it("Success : withdraw user2 at cycle N+1", async () => {
        await cvgCvxStaking.connect(users.user2).withdraw(TOKEN_2, parseEther("4000"), 0, 0);
    });

    it("Success : Go to cycle N+2 !", async () => {
        const cvgToBeDistributed =
            ((await cvgRewards.lastWeights(cvgCvxStaking)) * calcStakingInflation(Number(currentCycle))) / (await cvgRewards.lastTotalWeight());

        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 2n);
        expect((await cvgCvxStaking.cycleInfo(currentCycle + 1n)).cvgRewardsAmount).to.be.equal(cvgToBeDistributed);
    });

    it("Success : Process CVX rewards for cycle N+1.", async () => {
        const amountCvx = parseEther("1000");
        const amountCrv = parseEther("400");

        //rewards distribution
        await cvx.transfer(cvxConvergenceLocker, amountCvx);
        await crv.transfer(cvxConvergenceLocker, amountCrv);

        //bal before
        const balanceCvxBuffer = (await cvx.balanceOf(cvxConvergenceLocker)) - (await cvxConvergenceLocker.cvxToLock());
        const cvxForProcessor = (balanceCvxBuffer * CLAIMER_REWARDS_PERCENTAGE) / 100_000n;
        const cvxDistributed = balanceCvxBuffer - cvxForProcessor;

        const balCrvBuffer = await crv.balanceOf(cvxConvergenceLocker);
        const crvForProcessor = (balCrvBuffer * CLAIMER_REWARDS_PERCENTAGE) / 100_000n;
        const crvDistributed = balCrvBuffer - crvForProcessor;

        //process
        const txProcess = cvgCvxStaking.processCvxRewards();

        await expect(txProcess).to.changeTokenBalances(
            cvx,
            [cvxConvergenceLocker, cvxRewardDistributor, users.owner],
            [-balanceCvxBuffer, cvxDistributed, cvxForProcessor]
        );

        await expect(txProcess).to.changeTokenBalances(
            crv,
            [cvxConvergenceLocker, cvxRewardDistributor, users.owner],
            [-balCrvBuffer, crvDistributed, crvForProcessor]
        );
    });

    it("Success : deposit with user2 at cycle N+2", async () => {
        await cvgCvxStaking.connect(users.user2).deposit(TOKEN_2, parseEther("3000"), EMPTY_CVX_DATA_STRUCT);
    });

    it("Success : claimRewards cycle N+2 with wrong owner should revert", async () => {
        await cvgCvxStaking.connect(users.user2).claimCvgRewards(TOKEN_1).should.be.revertedWith("TOKEN_NOT_OWNED");
        await cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("claimRewards cycle N+2 for user 1 should compute right infos", async () => {
        const amountCvgClaimedExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_1, currentCycle + 1n);
        const cvgAmountExpected = amountCvgClaimedExpected[0];
        const cvxAmountExpected = amountCvgClaimedExpected[1];
        const crvAmountExpected = amountCvgClaimedExpected[2];
        const fxsAmountExpected = amountCvgClaimedExpected[3];

        const claimCvgTx = cvgCvxStaking.connect(users.user1).claimCvgRewards(TOKEN_1);
        await expect(claimCvgTx).to.changeTokenBalances(cvg, [users.user1], [cvgAmountExpected]);

        const claimCvxTx = cvgCvxStaking.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false);
        await expect(claimCvxTx).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user1], [-cvxAmountExpected, cvxAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(crv, [cvxRewardDistributor, users.user1], [-crvAmountExpected, crvAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(fxs, [cvxRewardDistributor, users.user1], [-fxsAmountExpected, fxsAmountExpected]);

        const receipt = await (await claimCvxTx).wait();

        const logs = receipt?.logs as EventLog[];
        const event = logs[logs.length - 1].args;
        expect(event.tokenId).to.be.eq(TOKEN_1);
        expect(event.account).to.be.eq(await users.user1.getAddress());
    });

    it("claimRewards cycle N+2 for user 2 should compute right infos", async () => {
        const amountCvgClaimedExpected = await getExpectedCvgCvxRewards(cvgCvxStaking, TOKEN_2, currentCycle + 1n);
        const cvgAmountExpected = amountCvgClaimedExpected[0];
        const cvxAmountExpected = amountCvgClaimedExpected[1];
        const crvAmountExpected = amountCvgClaimedExpected[2];
        const fxsAmountExpected = amountCvgClaimedExpected[3];

        const claimCvgTx = cvgCvxStaking.connect(users.user2).claimCvgRewards(TOKEN_2);
        await expect(claimCvgTx).to.changeTokenBalances(cvg, [users.user2], [cvgAmountExpected]);

        const claimCvxTx = cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        await expect(claimCvxTx).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user2], [-cvxAmountExpected, cvxAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(crv, [cvxRewardDistributor, users.user2], [-crvAmountExpected, crvAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(fxs, [cvxRewardDistributor, users.user2], [-fxsAmountExpected, fxsAmountExpected]);

        const receipt = await (await claimCvxTx).wait();
        const logs = receipt?.logs as EventLog[];
        const event = logs[logs.length - 1].args;
        expect(event.tokenId).to.be.eq(TOKEN_2);
        expect(event.account).to.be.eq(await users.user2.getAddress());
    });

    it("Re-claim cycle N+2 should revert", async () => {
        await cvgCvxStaking.connect(users.user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
        await cvgCvxStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });

    it("process rewards & update cvg cycle to N+3 should compute right infos", async () => {
        const cvgToBeDistributed =
            ((await cvgRewards.lastWeights(cvgCvxStaking)) * calcStakingInflation(Number(currentCycle))) / (await cvgRewards.lastTotalWeight());

        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);

        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 3n);
        expect((await cvgCvxStaking.cycleInfo(currentCycle + 2n)).cvgRewardsAmount).to.be.equal(cvgToBeDistributed);
    });

    it("process Cvx rewards for cycle N+3 should compute right infos", async () => {
        const amountCvx = parseEther("500");
        const amountCrv = parseEther("888");
        const amountFxs = parseEther("200");

        // rewards distribution
        await cvx.transfer(cvxConvergenceLocker, amountCvx);
        await crv.transfer(cvxConvergenceLocker, amountCrv);
        await fxs.transfer(cvxConvergenceLocker, amountFxs);

        const cvxForProcessor = (amountCvx * CLAIMER_REWARDS_PERCENTAGE) / 100_000n;
        const cvxDistributed = amountCvx - cvxForProcessor;

        const crvForProcessor = (amountCrv * CLAIMER_REWARDS_PERCENTAGE) / 100_000n;
        const crvDistributed = amountCrv - crvForProcessor;

        const fxsForProcessor = (amountFxs * CLAIMER_REWARDS_PERCENTAGE) / 100_000n;
        const fxsDistributed = amountFxs - fxsForProcessor;

        //process
        await cvgCvxStaking.processCvxRewards();

        const rewardForCycle = await cvgCvxStaking.getProcessedCvxRewards(currentCycle + 2n);
        expect(rewardForCycle[0]).to.deep.eq([await cvx.getAddress(), cvxDistributed]);
        expect(rewardForCycle[1]).to.deep.eq([await crv.getAddress(), crvDistributed]);
        expect(rewardForCycle[2]).to.deep.eq([await fxs.getAddress(), fxsDistributed]);
    });
});
