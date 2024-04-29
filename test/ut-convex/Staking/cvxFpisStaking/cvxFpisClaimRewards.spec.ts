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
    ICrvPoolPlain,
    ICvxAssetWrapper,
    LockingPositionManager,
    LockingPositionService,
} from "../../../../typechain-types";

import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {CVX_FPIS_WRAPPER} from "../../../../resources/convex";
import {CRV_DUO_cvxFPIS_FPIS} from "../../../../resources/lp";
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {GaugeController} from "../../../../typechain-types-vyper";
import {TOKEN_ADDR_CVX, TOKEN_ADDR_FPIS} from "../../../../resources/tokens/common";

describe("cvxFpis - Claim rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvxFpisStakingPositionService: CvxAssetStakingService;
    let cvxFpisStakerBuffer: CvxAssetStakerBuffer;
    let cvxFpisWrapper: ICvxAssetWrapper;
    let cvxFpis_fpis_stablePool: ICrvPoolPlain;
    let gaugeController: GaugeController;
    let cvxFpis: ERC20, cvx: ERC20, cvg: ERC20, fpis: ERC20;
    let cvxRewardDistributor: CvxRewardDistributor;
    let lockingPositionService: LockingPositionService, lockingPositionManager: LockingPositionManager;
    let cvgRewards: CvgRewardsV2;
    let actualCycle: bigint;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxFpisStakingPositionService = contractsUsers.convex.cvxFpisStakingPositionService;
        cvxFpisStakerBuffer = contractsUsers.convex.cvxFpisStakerBuffer;
        lockingPositionManager = contractsUsers.contractsUserMainnet.locking.lockingPositionManager;
        lockingPositionService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;
        gaugeController = contractsUsers.contractsUserMainnet.locking.gaugeController;
        cvgRewards = contractsUsers.contractsUserMainnet.rewards.cvgRewards;

        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvx = contractsUsers.contractsUserMainnet.globalAssets["cvx"];
        fpis = contractsUsers.contractsUserMainnet.globalAssets["fpis"];
        cvxFpis = contractsUsers.contractsUserMainnet.convexAssets!["cvxFpis"];

        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;

        cvxFpisWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FPIS_WRAPPER);
        cvxFpis_fpis_stablePool = await ethers.getContractAt("ICrvPoolPlain", CRV_DUO_cvxFPIS_FPIS);

        actualCycle = await cvgRewards.getCycleLocking((await ethers.provider.getBlock("latest"))!.timestamp);
        const nextTde = ((actualCycle + 12n) / 12n) * 12n;
        const nextIdLocking = await lockingPositionManager.nextId();

        await cvg.approve(lockingPositionService, ethers.MaxUint256);
        await lockingPositionService.mintPosition(nextTde - actualCycle, ethers.parseEther("10000"), 0, users.owner, true);
        await gaugeController.simple_vote(nextIdLocking, cvxFpisStakingPositionService, 1000);
    });

    it("Success : Init", async () => {
        expect((await cvxFpisStakerBuffer.rewardTokensConfigs(0)).token.toLowerCase()).to.be.eq(TOKEN_ADDR_CVX.toLowerCase());
        expect((await cvxFpisStakerBuffer.rewardTokensConfigs(1)).token.toLowerCase()).to.be.eq(TOKEN_ADDR_FPIS.toLowerCase());
    });

    it("Success : Deposit with some stkCvxFpis", async () => {
        await cvxFpisWrapper.connect(users.user1).approve(cvxFpisStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxFpis = cvxFpisStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxFpis;

        await expect(txDepositStkCvxFpis).to.changeTokenBalances(
            cvxFpisWrapper,
            [users.user1, cvxFpisStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxFPIS", async () => {
        await cvxFpis.connect(users.user2).approve(cvxFpisStakingPositionService, ethers.MaxUint256);

        const txDepositCvxFpis = cvxFpisStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxFpis;

        await expect(txDepositCvxFpis).to.changeTokenBalances(
            cvxFpis,
            [users.user2, cvxFpisStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Pass a cycle", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    it("Success : No rewards in CVG are distributed", async () => {
        const cycleInfo = await cvxFpisStakingPositionService.cycleInfo(actualCycle - 1n);
        expect(cycleInfo.cvgRewardsAmount).to.be.eq(0);
    });

    it("Fails : Process CVX rewards, no stakers fully staked during one cycle", async () => {
        await expect(cvxFpisStakingPositionService.processCvxRewards()).to.be.rejectedWith("NO_STAKERS");
    });
    let totalCvgDistributedExpected = 0n;

    it("Success : Pass a cycle", async () => {
        const lastTotalWeights = await cvgRewards.lastTotalWeight();
        const lastVote = await cvgRewards.lastWeights(cvxFpisStakingPositionService);
        totalCvgDistributedExpected = ((await cvgRewards.stakingInflationAtCycle(actualCycle - 1n)) * lastVote) / lastTotalWeights;
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    let distributedCvx: bigint;
    let distributedFpis: bigint;
    it("Success : Process rewards of Cvg & Convex", async () => {
        const amount = ethers.parseEther("1");
        await cvx.transfer(cvxFpisStakerBuffer, amount);
        await fpis.transfer(cvxFpisStakerBuffer, amount);
        const balanceCvx = await cvx.balanceOf(cvxRewardDistributor);
        const balanceFpis = await fpis.balanceOf(cvxRewardDistributor);

        await cvxFpisStakingPositionService.processCvxRewards();

        distributedCvx = (await cvx.balanceOf(cvxRewardDistributor)) - balanceCvx;
        distributedFpis = (await fpis.balanceOf(cvxRewardDistributor)) - balanceFpis;

        const cycleInfo = await cvxFpisStakingPositionService.cycleInfo(actualCycle - 1n);

        expect(cycleInfo.cvgRewardsAmount).to.be.equal(totalCvgDistributedExpected);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 1", async () => {
        const txClaimCvxRewards = cvxFpisStakingPositionService.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user1], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(fpis, [cvxRewardDistributor, users.user1], [-distributedFpis / 2n, distributedFpis / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user1], [-distributedCvx / 2n, distributedCvx / 2n]);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 2", async () => {
        const txClaimCvxRewards = cvxFpisStakingPositionService.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user2], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(fpis, [cvxRewardDistributor, users.user2], [-distributedFpis / 2n, distributedFpis / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user2], [-distributedCvx / 2n, distributedCvx / 2n]);
    });
});
