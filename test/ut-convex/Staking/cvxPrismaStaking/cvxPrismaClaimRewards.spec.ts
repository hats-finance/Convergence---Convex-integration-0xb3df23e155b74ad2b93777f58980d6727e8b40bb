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
import {CVX_PRISMA_WRAPPER} from "../../../../resources/convex";
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {GaugeController} from "../../../../typechain-types-vyper";
import {TOKEN_ADDR_CVX, TOKEN_ADDR_PRISMA} from "../../../../resources/tokens/common";

describe("cvxPrisma - Claim rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvxPrismaStakingPositionService: CvxAssetStakingService;
    let cvxPrismaStakerBuffer: CvxAssetStakerBuffer;
    let cvxPrismaWrapper: ICvxAssetWrapper;
    let gaugeController: GaugeController;
    let cvxPrisma: ERC20, cvx: ERC20, cvg: ERC20, prisma: ERC20;
    let cvxRewardDistributor: CvxRewardDistributor;
    let lockingPositionService: LockingPositionService, lockingPositionManager: LockingPositionManager;
    let cvgRewards: CvgRewardsV2;
    let actualCycle: bigint;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxPrismaStakingPositionService = contractsUsers.convex.cvxPrismaStakingPositionService;
        cvxPrismaStakerBuffer = contractsUsers.convex.cvxPrismaStakerBuffer;
        lockingPositionManager = contractsUsers.contractsUserMainnet.locking.lockingPositionManager;
        lockingPositionService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;
        gaugeController = contractsUsers.contractsUserMainnet.locking.gaugeController;
        cvgRewards = contractsUsers.contractsUserMainnet.rewards.cvgRewards;

        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvx = contractsUsers.contractsUserMainnet.globalAssets["cvx"];
        prisma = contractsUsers.contractsUserMainnet.globalAssets["prisma"];
        cvxPrisma = contractsUsers.contractsUserMainnet.convexAssets!["cvxPrisma"];

        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;

        cvxPrismaWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_PRISMA_WRAPPER);

        actualCycle = await cvgRewards.getCycleLocking((await ethers.provider.getBlock("latest"))!.timestamp);
        const nextTde = ((actualCycle + 12n) / 12n) * 12n;
        const nextIdLocking = await lockingPositionManager.nextId();

        await cvg.approve(lockingPositionService, ethers.MaxUint256);
        await lockingPositionService.mintPosition(nextTde - actualCycle, ethers.parseEther("10000"), 0, users.owner, true);
        await gaugeController.simple_vote(nextIdLocking, cvxPrismaStakingPositionService, 1000);
    });

    it("Success : Init", async () => {
        expect((await cvxPrismaStakerBuffer.rewardTokensConfigs(0)).token.toLowerCase()).to.be.eq(TOKEN_ADDR_CVX.toLowerCase());
        expect((await cvxPrismaStakerBuffer.rewardTokensConfigs(1)).token.toLowerCase()).to.be.eq(TOKEN_ADDR_PRISMA.toLowerCase());
    });

    it("Success : Deposit with some stkCvxPrisma", async () => {
        await cvxPrismaWrapper.connect(users.user1).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxPrisma = cvxPrismaStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxPrisma;

        await expect(txDepositStkCvxPrisma).to.changeTokenBalances(
            cvxPrismaWrapper,
            [users.user1, cvxPrismaStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxPRISMA", async () => {
        await cvxPrisma.connect(users.user2).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);

        const txDepositCvxPrisma = cvxPrismaStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxPrisma;

        await expect(txDepositCvxPrisma).to.changeTokenBalances(
            cvxPrisma,
            [users.user2, cvxPrismaStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Pass a cycle", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    it("Success : No rewards in CVG are distributed", async () => {
        const cycleInfo = await cvxPrismaStakingPositionService.cycleInfo(actualCycle - 1n);
        expect(cycleInfo.cvgRewardsAmount).to.be.eq(0);
    });

    it("Fails : Process CVX rewards, no stakers fully staked during one cycle", async () => {
        await expect(cvxPrismaStakingPositionService.processCvxRewards()).to.be.rejectedWith("NO_STAKERS");
    });
    let totalCvgDistributedExpected = 0n;

    it("Success : Pass a cycle", async () => {
        const lastTotalWeights = await cvgRewards.lastTotalWeight();
        const lastVote = await cvgRewards.lastWeights(cvxPrismaStakingPositionService);
        totalCvgDistributedExpected = ((await cvgRewards.stakingInflationAtCycle(actualCycle - 1n)) * lastVote) / lastTotalWeights;
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    let distributedCvx: bigint;
    let distributedPrisma: bigint;
    it("Success : Process rewards of Cvg & Convex", async () => {
        const balanceCvx = await cvx.balanceOf(cvxRewardDistributor);
        const balancePrisma = await prisma.balanceOf(cvxRewardDistributor);

        await cvxPrismaStakingPositionService.processCvxRewards();

        distributedCvx = (await cvx.balanceOf(cvxRewardDistributor)) - balanceCvx;
        distributedPrisma = (await prisma.balanceOf(cvxRewardDistributor)) - balancePrisma;

        const cycleInfo = await cvxPrismaStakingPositionService.cycleInfo(actualCycle - 1n);

        expect(cycleInfo.cvgRewardsAmount).to.be.equal(totalCvgDistributedExpected);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 1", async () => {
        const txClaimCvxRewards = cvxPrismaStakingPositionService.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user1], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(prisma, [cvxRewardDistributor, users.user1], [-distributedPrisma / 2n, distributedPrisma / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user1], [-distributedCvx / 2n, distributedCvx / 2n]);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 2", async () => {
        const txClaimCvxRewards = cvxPrismaStakingPositionService.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user2], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(prisma, [cvxRewardDistributor, users.user2], [-distributedPrisma / 2n, distributedPrisma / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user2], [-distributedCvx / 2n, distributedCvx / 2n]);
    });
});
