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
    CvxStakingPositionManager,
    ERC20,
    ICrvPoolPlain,
    ICvxAssetWrapper,
    LockingPositionManager,
    LockingPositionService,
} from "../../../../typechain-types";

import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {CVX_FXS_WRAPPER} from "../../../../resources/convex";
import {CRV_DUO_cvxFXS_FXS} from "../../../../resources/lp";
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {GaugeController} from "../../../../typechain-types-vyper";
import {TOKEN_ADDR_CVX, TOKEN_ADDR_FXS} from "../../../../resources/tokens/common";

describe("cvxFxs - Claim rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvxFxsStakingPositionService: CvxAssetStakingService;
    let cvxFxsStakerBuffer: CvxAssetStakerBuffer;
    let cvxPositionManager: CvxStakingPositionManager;
    let cvxFxsWrapper: ICvxAssetWrapper;
    let cvxFxs_fxs_stablePool: ICrvPoolPlain;
    let gaugeController: GaugeController;
    let cvxFxs: ERC20, crv: ERC20, cvx: ERC20, cvg: ERC20, fxs: ERC20;
    let cvxRewardDistributor: CvxRewardDistributor;
    let lockingPositionService: LockingPositionService, lockingPositionManager: LockingPositionManager;
    let cvgRewards: CvgRewardsV2;
    let actualCycle: bigint;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxFxsStakingPositionService = contractsUsers.convex.cvxFxsStakingPositionService;
        cvxPositionManager = contractsUsers.convex.cvxStakingPositionManager;
        cvxFxsStakerBuffer = contractsUsers.convex.cvxFxsStakerBuffer;
        lockingPositionManager = contractsUsers.contractsUserMainnet.locking.lockingPositionManager;
        lockingPositionService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;
        gaugeController = contractsUsers.contractsUserMainnet.locking.gaugeController;
        cvgRewards = contractsUsers.contractsUserMainnet.rewards.cvgRewards;

        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvx = contractsUsers.contractsUserMainnet.globalAssets["cvx"];
        crv = contractsUsers.contractsUserMainnet.globalAssets["crv"];
        fxs = contractsUsers.contractsUserMainnet.globalAssets["fxs"];
        cvxFxs = contractsUsers.contractsUserMainnet.convexAssets!["cvxFxs"];

        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;

        cvxFxsWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FXS_WRAPPER);
        cvxFxs_fxs_stablePool = await ethers.getContractAt("ICrvPoolPlain", CRV_DUO_cvxFXS_FXS);

        actualCycle = await cvgRewards.getCycleLocking((await ethers.provider.getBlock("latest"))!.timestamp);
        const nextTde = ((actualCycle + 12n) / 12n) * 12n;
        const nextIdLocking = await lockingPositionManager.nextId();

        await cvg.approve(lockingPositionService, ethers.MaxUint256);
        await lockingPositionService.mintPosition(nextTde - actualCycle, ethers.parseEther("10000"), 0, users.owner, true);
        await gaugeController.simple_vote(nextIdLocking, cvxFxsStakingPositionService, 1000);
    });

    it("Success : Init", async () => {
        expect((await cvxFxsStakerBuffer.rewardTokensConfigs(0)).token.toLowerCase()).to.be.eq(TOKEN_ADDR_CVX.toLowerCase());
        expect((await cvxFxsStakerBuffer.rewardTokensConfigs(1)).token.toLowerCase()).to.be.eq(TOKEN_ADDR_FXS.toLowerCase());
    });

    it("Success : Deposit with some stkCvxFxs", async () => {
        await cvxFxsWrapper.connect(users.user1).approve(cvxFxsStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxFxs = cvxFxsStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxFxs;

        await expect(txDepositStkCvxFxs).to.changeTokenBalances(
            cvxFxsWrapper,
            [users.user1, cvxFxsStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxFXS", async () => {
        await cvxFxs.connect(users.user2).approve(cvxFxsStakingPositionService, ethers.MaxUint256);

        const txDepositCvxFxs = cvxFxsStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxFxs;

        await expect(txDepositCvxFxs).to.changeTokenBalances(
            cvxFxs,
            [users.user2, cvxFxsStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Pass a cycle", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    it("Success : No rewards in CVG are distributed", async () => {
        const cycleInfo = await cvxFxsStakingPositionService.cycleInfo(actualCycle - 1n);
        expect(cycleInfo.cvgRewardsAmount).to.be.eq(0);
    });

    it("Fails : Process CVX rewards, no stakers fully staked during one cycle", async () => {
        await expect(cvxFxsStakingPositionService.processCvxRewards()).to.be.rejectedWith("NO_STAKERS");
    });
    let totalCvgDistributedExpected = 0n;

    it("Success : Pass a cycle", async () => {
        const lastTotalWeights = await cvgRewards.lastTotalWeight();
        const lastVote = await cvgRewards.lastWeights(cvxFxsStakingPositionService);
        totalCvgDistributedExpected = ((await cvgRewards.stakingInflationAtCycle(actualCycle - 1n)) * lastVote) / lastTotalWeights;
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    let distributedCvx: bigint;
    let distributedFxs: bigint;
    it("Success : Process rewards of Cvg & Convex", async () => {
        const balanceCvx = await cvx.balanceOf(cvxRewardDistributor);
        const balanceFxs = await fxs.balanceOf(cvxRewardDistributor);

        await cvxFxsStakingPositionService.processCvxRewards();

        distributedCvx = (await cvx.balanceOf(cvxRewardDistributor)) - balanceCvx;
        distributedFxs = (await fxs.balanceOf(cvxRewardDistributor)) - balanceFxs;

        const cycleInfo = await cvxFxsStakingPositionService.cycleInfo(actualCycle - 1n);

        expect(cycleInfo.cvgRewardsAmount).to.be.equal(totalCvgDistributedExpected);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 1", async () => {
        const txClaimCvxRewards = cvxFxsStakingPositionService.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user1], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(fxs, [cvxRewardDistributor, users.user1], [-distributedFxs / 2n, distributedFxs / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user1], [-distributedCvx / 2n, distributedCvx / 2n]);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 2", async () => {
        const txClaimCvxRewards = cvxFxsStakingPositionService.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user2], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(fxs, [cvxRewardDistributor, users.user2], [-distributedFxs / 2n, distributedFxs / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user2], [-distributedCvx / 2n, distributedCvx / 2n]);
    });
});
