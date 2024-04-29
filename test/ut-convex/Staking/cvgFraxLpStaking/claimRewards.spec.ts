import {loadFixture, mine} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {Signer, EventLog} from "ethers";
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
    LockingPositionService, CVX1,
} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {CLAIMER_REWARDS_PERCENTAGE, MINT, TOKEN_1, TOKEN_2} from "../../../../resources/constant";
import {getExpectedCvgCvxRewards} from "../../../../utils/stakeDao/getStakingShareForCycle";

import {TypedContractEvent, TypedDeferredTopicFilter} from "../../../../typechain-types/common";
import {ClaimCvgCvxMultipleEvent} from "../../../../typechain-types/contracts/Staking/Convex/CvxStakingPositionService";
import {OWNABLE_REVERT} from "../../../../resources/revert";

const DENOMINATOR = 100000n;

describe("cvgFraxLpStaking - Claim Rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer, owner: Signer, user1: Signer, user2: Signer, user3: Signer;
    let cvg: Cvg, cvx: ERC20, fxs: ERC20, crv: ERC20, usdc: ERC20, frax: ERC20, eusd: ERC20, fraxbp: ERC20, eusdfraxbp: ICurveLp;
    let cvx1: CVX1;
    let cvgeUSDFRAXBPLocker: CvgFraxLpLocker;
    let cvgeUSDFRAXBPStaking: CvgFraxLpStakingService;
    let cvxcvgeUSDFRAXBPStaking: IConvexStaking;
    let eUSDFRAXBPVault: IConvexVault;
    let cvxRewardDistributor: CvxRewardDistributor;
    let cvxStakingPositionManager: CvxStakingPositionManager;
    let lockingPositionService: LockingPositionService;
    let currentCycle: bigint;
    let depositedAmountUser1 = ethers.parseEther("5000"),
        depositedAmountUser2 = ethers.parseEther("100000");
    let CYCLE_1: bigint, CYCLE_2: bigint, CYCLE_3: bigint, CYCLE_4: bigint, CYCLE_5: bigint;
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
        cvx1 = contractsUsers.convex.CVX1;
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
        await cvgeUSDFRAXBPLocker.connect(user3).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);

        //deposit
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(MINT, depositedAmountUser1);
        await cvgeUSDFRAXBPStaking.connect(user2).deposit(MINT, depositedAmountUser2);

        filterClaimCvgCvx = cvgeUSDFRAXBPStaking.filters.ClaimCvgCvxMultiple(undefined, undefined);
    });
    it("Fail: claimCvgCvxMultiple with other caller than cvxRewardDistributor contract", async () => {
        await cvgeUSDFRAXBPStaking.claimCvgCvxMultiple(0, user1).should.be.revertedWith("NOT_CVX_REWARD_DISTRIBUTOR");
    });
    it("Fail: setPoolCvgCvxAndApprove with random user", async () => {
        await cvxRewardDistributor.setPoolCvgCvxCvx1AndApprove(ethers.ZeroAddress, 0).should.be.revertedWith(OWNABLE_REVERT);
    });
    it("Success: setPoolCvgCvxAndApprove twice with 2 differents address", async () => {
        await cvxRewardDistributor.connect(treasuryDao).setPoolCvgCvxCvx1AndApprove(user1, ethers.parseEther("1"));
        await cvxRewardDistributor.connect(treasuryDao).setPoolCvgCvxCvx1AndApprove(user2, ethers.parseEther("1"));
        expect(await cvx1.allowance(cvxRewardDistributor, user1)).to.be.equal("0");
        expect(await cvx1.allowance(cvxRewardDistributor, user2)).to.be.equal(ethers.parseEther("1"));
    });
    it("Fail: claimCvgCvxSimple with other caller than staking contract should revert", async () => {
        await cvxRewardDistributor
            .claimCvgCvxSimple(ethers.ZeroAddress, 0, [{token: ethers.ZeroAddress, amount: 0}], 0, false)
            .should.be.revertedWith("NOT_STAKING");
    });

    it("process cvg rewards for cycle 1 & update cvg cycle to 2 should compute right infos", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);

        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_2);
        expect((await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_1)).cvgRewardsAmount).to.be.equal(0);
    });
    it("Process stakers rewards with other caller than gauge should revert", async () => {
        await cvgeUSDFRAXBPStaking.processStakersRewards(CYCLE_1).should.be.revertedWith("NOT_CVG_REWARDS");
    });

    it("process Sdt rewards for cycle 1 should ", async () => {
        await expect(cvgeUSDFRAXBPStaking.processCvxRewards()).to.be.rejectedWith("NO_STAKERS");
    });

    it("withdraw user2 at cycle 3", async () => {
        await cvgeUSDFRAXBPStaking.connect(user2).withdraw(TOKEN_2, ethers.parseEther("4000"));
    });

    it("Success : Go in cycle 3 !", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_3);
        //TODO Make it dynamic
        //expect((await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_2)).cvgRewardsAmount).to.be.equal("1359853142168886836206");
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
        expect(rewardForCycle[0].amount).to.be.approximately(expectedCvxAmount, ethers.parseEther("0.1"));
        expect(rewardForCycle[1].token).to.deep.eq(await crv.getAddress());
        expect(rewardForCycle[1].amount).to.be.approximately(expectedCrvAmount, ethers.parseEther("0.1"));
        expect(rewardForCycle[2].token).to.deep.eq(await fxs.getAddress());
        expect(rewardForCycle[2].amount).to.be.approximately(expectedFxsAmount, ethers.parseEther("0.1"));
    });

    it("deposit with user2 at cycle 3", async () => {
        await cvgeUSDFRAXBPStaking.connect(user2).deposit(TOKEN_2, ethers.parseEther("3000"));
    });

    it("claimRewards cycle 2 with wrong owner should revert", async () => {
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgRewards(TOKEN_1).should.be.revertedWith("TOKEN_NOT_OWNED");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("claimRewards cycle 2 for user 1 should compute right infos", async () => {
        await mine();
        const amountCvgClaimedExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const cvgAmountExpected = amountCvgClaimedExpected[0];
        const cvxAmountExpected = amountCvgClaimedExpected[1];
        const crvAmountExpected = amountCvgClaimedExpected[2];
        const fxsAmountExpected = amountCvgClaimedExpected[3];

        const claimCvgTx = cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1);
        // await expect(claimCvgTx)
        //     .to.emit(cvgeUSDFRAXBPStaking, "ClaimCvgMultiple") // 5000/6000 = 83%
        //     .withArgs(4, await user1.getAddress(), "2", cvgAmountExpected);

        await expect(claimCvgTx).to.changeTokenBalances(cvg, [user1], [cvgAmountExpected]);
        const claimSdtTx = cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false);

        await expect(claimSdtTx).to.changeTokenBalances(cvx, [cvxRewardDistributor, user1], [-cvxAmountExpected, cvxAmountExpected]);
        await expect(claimSdtTx).to.changeTokenBalances(crv, [cvxRewardDistributor, user1], [-crvAmountExpected, crvAmountExpected]);
        await expect(claimSdtTx).to.changeTokenBalances(fxs, [cvxRewardDistributor, user1], [-fxsAmountExpected, fxsAmountExpected]);

        const receipt = await (await claimSdtTx).wait();

        const logs = receipt?.logs as EventLog[];
        const event = logs[logs.length - 1].args;
        expect(event.tokenId).to.be.eq(TOKEN_1);
        expect(event.account).to.be.eq(await user1.getAddress());
    });

    it("claimRewards cycle 2 for user 2 should compute right infos", async () => {
        const amountCvgClaimedExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_2, CYCLE_2);
        const cvxAmountExpected = amountCvgClaimedExpected[1];
        const crvAmountExpected = amountCvgClaimedExpected[2];
        const fxsAmountExpected = amountCvgClaimedExpected[3];

        // await expect(claimCvgTx)
        //     .to.emit(cvgeUSDFRAXBPStaking, "ClaimCvg") // 5000/6000 = 83%
        //     .withArgs(5, await user2.getAddress(), "2", cvgAmountExpected);

        const claimSdtTx = cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        await expect(claimSdtTx).to.changeTokenBalances(cvx, [cvxRewardDistributor, user2], [-cvxAmountExpected, cvxAmountExpected]);
        await expect(claimSdtTx).to.changeTokenBalances(crv, [cvxRewardDistributor, user2], [-crvAmountExpected, crvAmountExpected]);
        await expect(claimSdtTx).to.changeTokenBalances(fxs, [cvxRewardDistributor, user2], [-fxsAmountExpected, fxsAmountExpected]);

        const receipt = await (await claimSdtTx).wait();
        const logs = receipt?.logs as EventLog[];
        const event = logs[logs.length - 1].args;
        expect(event.tokenId).to.be.eq(TOKEN_2);
        expect(event.account).to.be.eq(await user2.getAddress());
    });

    it("Re-claim cycle 2 should revert", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });

    it("process rewards & update cvg cycle to 4 should compute right infos", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);

        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_4);
        //TODO Make it dynamic
        // expect((await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_3)).cvgRewardsAmount).to.be.equal("1360369282038287817544");
    });
    it("Success : Process Convex for cycle 3.", async () => {
        const amountCvx = ethers.parseEther("700");
        const amountCrv = ethers.parseEther("200");
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

    it("claimRewards cycle 3 for user 1 should compute right infos", async () => {
        const amountCvgClaimedExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_3);
        const cvxAmountExpected = amountCvgClaimedExpected[1];
        const crvAmountExpected = amountCvgClaimedExpected[2];
        const fxsAmountExpected = amountCvgClaimedExpected[3];

        // await expect(claimCvgTx)
        //     .to.emit(cvgeUSDFRAXBPStaking, "ClaimCvg") // 5000/6000 = 83%
        //     .withArgs(4, await user1.getAddress(), "3", cvgAmountExpected);

        const claimCvxTx = cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false);
        await expect(claimCvxTx).to.changeTokenBalances(cvx, [cvxRewardDistributor, user1], [-cvxAmountExpected, cvxAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(crv, [cvxRewardDistributor, user1], [-crvAmountExpected, crvAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(fxs, [cvxRewardDistributor, user1], [-fxsAmountExpected, fxsAmountExpected]);

        const receipt = await (await claimCvxTx).wait();
        const logs = receipt?.logs as EventLog[];

        const event = logs[logs.length - 1].args;
        expect(event.tokenId).to.be.eq(TOKEN_1);
        expect(event.account).to.be.eq(await user1.getAddress());
    });

    it("Success : claimRewards cycle 3 for user 2 should compute right infos", async () => {
        const amountCvgClaimedExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_2, CYCLE_3);
        const cvxAmountExpected = amountCvgClaimedExpected[1];
        const crvAmountExpected = amountCvgClaimedExpected[2];
        const fxsAmountExpected = amountCvgClaimedExpected[3];

        // await expect(claimCvgTx)
        //     .to.emit(cvgeUSDFRAXBPStaking, "ClaimCvg") // 5000/6000 = 83%
        //     .withArgs(5, await user2.getAddress(), "3", cvgAmountExpected);

        const claimCvxTx = cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        await claimCvxTx;
        await expect(claimCvxTx).to.changeTokenBalances(cvx, [cvxRewardDistributor, user2], [-cvxAmountExpected, cvxAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(crv, [cvxRewardDistributor, user2], [-crvAmountExpected, crvAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(fxs, [cvxRewardDistributor, user2], [-fxsAmountExpected, fxsAmountExpected]);

        const events = await cvgeUSDFRAXBPStaking.queryFilter(filterClaimCvgCvx, -1, "latest");
        const event = events[events.length - 1].args;

        expect(event.tokenId).to.be.eq(TOKEN_2);
        expect(event.account).to.be.eq(await user2.getAddress());
    });

    it("Fails : Re-claim cycle 3 should revert", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });

    it("process rewards & update cvg cycle to 5 should compute right infos", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);

        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_5);
        //TODO make it dynamic
        // expect((await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_4)).cvgRewardsAmount).to.be.equal("1360897830899255035882");
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

    it("Success : Claiming CVG on cycle 4 for user 1", async () => {
        const amountCvgClaimedExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_4);
        const cvxAmountExpected = amountCvgClaimedExpected[1];
        const crvAmountExpected = amountCvgClaimedExpected[2];
        const fxsAmountExpected = amountCvgClaimedExpected[3];

        // await expect(claimCvgTx)
        //     .to.emit(cvgeUSDFRAXBPStaking, "ClaimCvg") // 5000/6000 = 83%
        //     .withArgs(TOKEN_4, await user1.getAddress(), "4", cvgAmountExpected);

        const claimCvxTx = cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false);
        await expect(claimCvxTx).to.changeTokenBalances(cvx, [cvxRewardDistributor, user1], [-cvxAmountExpected, cvxAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(crv, [cvxRewardDistributor, user1], [-crvAmountExpected, crvAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(fxs, [cvxRewardDistributor, user1], [-fxsAmountExpected, fxsAmountExpected]);

        const events = await cvgeUSDFRAXBPStaking.queryFilter(filterClaimCvgCvx, -1, "latest");
        const event = events[0].args;

        expect(event.tokenId).to.be.eq(TOKEN_1);
        expect(event.account).to.be.eq(await user1.getAddress());
    });

    it("claimRewards cycle 4 for user 2 should compute right infos", async () => {
        await mine(1);
        const amountCvgClaimedExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_2, CYCLE_4);
        const cvxAmountExpected = amountCvgClaimedExpected[1];
        const crvAmountExpected = amountCvgClaimedExpected[2];
        const fxsAmountExpected = amountCvgClaimedExpected[3];

        // await expect(claimCvgTx)
        //     .to.emit(cvgeUSDFRAXBPStaking, "ClaimCvg") // 5000/6000 = 83%
        //     .withArgs(TOKEN_5, await user2.getAddress(), "4", cvgAmountExpected);

        const claimCvxTx = cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        await expect(claimCvxTx).to.changeTokenBalances(cvx, [cvxRewardDistributor, user2], [-cvxAmountExpected, cvxAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(crv, [cvxRewardDistributor, user2], [-crvAmountExpected, crvAmountExpected]);
        await expect(claimCvxTx).to.changeTokenBalances(fxs, [cvxRewardDistributor, user2], [-fxsAmountExpected, fxsAmountExpected]);

        const events = await cvgeUSDFRAXBPStaking.queryFilter(filterClaimCvgCvx, -1, "latest");
        const event = events[0].args;
        expect(event.tokenId).to.be.eq(TOKEN_2);
        expect(event.account).to.be.eq(await user2.getAddress());
    });

    it("Re-claim cycle 4 should revert", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgRewards(TOKEN_1).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgRewards(TOKEN_2).should.be.revertedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
        await cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, 0, false).should.be.revertedWith("ALL_CVX_CLAIMED_FOR_NOW");
    });
});
