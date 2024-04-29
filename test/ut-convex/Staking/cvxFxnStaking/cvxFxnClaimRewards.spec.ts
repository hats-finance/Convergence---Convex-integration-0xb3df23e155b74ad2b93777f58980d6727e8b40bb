import {ethers} from "hardhat";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";

import {MINT, TOKEN_1, TOKEN_2} from "../../../../resources/constant";
import {
    CvgRewardsV2,
    CvxAssetStakerBuffer,
    CvxAssetStakingService,
    CvxRewardDistributor,
    ERC20,
    ICvxAssetWrapper,
    LockingPositionManager,
    LockingPositionService,
} from "../../../../typechain-types";

import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {CVX_FXN_WRAPPER} from "../../../../resources/convex";
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {GaugeController} from "../../../../typechain-types-vyper";

describe("cvxFxn - Claim rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvxFxnStakingPositionService: CvxAssetStakingService;
    let cvxFxnStakerBuffer: CvxAssetStakerBuffer;
    let cvxFxnWrapper: ICvxAssetWrapper;
    let gaugeController: GaugeController;
    let cvxFxn: ERC20, fxn: ERC20, cvx: ERC20, cvg: ERC20;
    let cvxRewardDistributor: CvxRewardDistributor;
    let lockingPositionService: LockingPositionService, lockingPositionManager: LockingPositionManager;
    let cvgRewards: CvgRewardsV2;
    let actualCycle: bigint;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxFxnStakingPositionService = contractsUsers.convex.cvxFxnStakingPositionService;
        cvxFxnStakerBuffer = contractsUsers.convex.cvxFxnStakerBuffer;
        lockingPositionManager = contractsUsers.contractsUserMainnet.locking.lockingPositionManager;
        lockingPositionService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;
        gaugeController = contractsUsers.contractsUserMainnet.locking.gaugeController;
        cvgRewards = contractsUsers.contractsUserMainnet.rewards.cvgRewards;

        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvx = contractsUsers.contractsUserMainnet.globalAssets["cvx"];
        fxn = contractsUsers.contractsUserMainnet.globalAssets["fxn"];
        cvxFxn = contractsUsers.contractsUserMainnet.convexAssets!["cvxFxn"];

        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;

        cvxFxnWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FXN_WRAPPER);

        actualCycle = await cvgRewards.getCycleLocking((await ethers.provider.getBlock("latest"))!.timestamp);
        const nextTde = ((actualCycle + 12n) / 12n) * 12n;
        const nextIdLocking = await lockingPositionManager.nextId();

        await cvg.approve(lockingPositionService, ethers.MaxUint256);
        await lockingPositionService.mintPosition(nextTde - actualCycle, ethers.parseEther("10000"), 0, users.owner, true);
        await gaugeController.simple_vote(nextIdLocking, cvxFxnStakingPositionService, 1000);
    });

    it("Success : Deposit with some stkCvxFxn", async () => {
        await cvxFxnWrapper.connect(users.user1).approve(cvxFxnStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxFxn = cvxFxnStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxFxn;

        await expect(txDepositStkCvxFxn).to.changeTokenBalances(
            cvxFxnWrapper,
            [users.user1, cvxFxnStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxFxn", async () => {
        await cvxFxn.connect(users.user2).approve(cvxFxnStakingPositionService, ethers.MaxUint256);

        const txDepositCvxFxn = cvxFxnStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxFxn;

        await expect(txDepositCvxFxn).to.changeTokenBalances(
            cvxFxn,
            [users.user2, cvxFxnStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Pass a cycle", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    it("Success : No rewards in CVG are distributed", async () => {
        const cycleInfo = await cvxFxnStakingPositionService.cycleInfo(actualCycle - 1n);
        expect(cycleInfo.cvgRewardsAmount).to.be.eq(0);
    });

    it("Fails : Process CVX rewards, no stakers fully staked during one cycle", async () => {
        await expect(cvxFxnStakingPositionService.processCvxRewards()).to.be.rejectedWith("NO_STAKERS");
    });
    let totalCvgDistributedExpected = 0n;

    it("Success : Pass a cycle", async () => {
        const lastTotalWeights = await cvgRewards.lastTotalWeight();
        const lastVote = await cvgRewards.lastWeights(cvxFxnStakingPositionService);
        totalCvgDistributedExpected = ((await cvgRewards.stakingInflationAtCycle(actualCycle - 1n)) * lastVote) / lastTotalWeights;
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    let distributedCvx: bigint;
    let distributedFxn: bigint;
    it("Success : Process rewards of Cvg & Convex", async () => {
        const balanceCvx = await cvx.balanceOf(cvxRewardDistributor);
        const balanceFxn = await fxn.balanceOf(cvxRewardDistributor);

        await cvxFxnStakingPositionService.processCvxRewards();

        distributedCvx = (await cvx.balanceOf(cvxRewardDistributor)) - balanceCvx;
        distributedFxn = (await fxn.balanceOf(cvxRewardDistributor)) - balanceFxn;

        const cycleInfo = await cvxFxnStakingPositionService.cycleInfo(actualCycle - 1n);

        expect(cycleInfo.cvgRewardsAmount).to.be.equal(totalCvgDistributedExpected);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 1", async () => {
        const txClaimCvxRewards = cvxFxnStakingPositionService.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user1], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(fxn, [cvxRewardDistributor, users.user1], [-distributedFxn / 2n, distributedFxn / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user1], [-distributedCvx / 2n, distributedCvx / 2n]);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 2", async () => {
        const txClaimCvxRewards = cvxFxnStakingPositionService.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user2], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(fxn, [cvxRewardDistributor, users.user2], [-distributedFxn / 2n, distributedFxn / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user2], [-distributedCvx / 2n, distributedCvx / 2n]);
    });
});
