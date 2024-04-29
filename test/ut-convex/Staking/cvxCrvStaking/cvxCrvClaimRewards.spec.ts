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
import {CVX_CRV_WRAPPER} from "../../../../resources/convex";
import {TOKEN_ADDR_3CRV} from "../../../../resources/lp";
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {GaugeController} from "../../../../typechain-types-vyper";
import {TOKEN_ADDR_CRV, TOKEN_ADDR_CVX} from "../../../../resources/tokens/common";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {Signer} from "ethers";
import {OWNABLE_REVERT} from "../../../../resources/revert";

describe("cvxCrv - Claim rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvxCrvStakingPositionService: CvxAssetStakingService;
    let cvxCrvStakerBuffer: CvxAssetStakerBuffer;
    let cvxCrvWrapper: ICvxAssetWrapper;
    let gaugeController: GaugeController;
    let cvxCrv: ERC20, crv: ERC20, cvx: ERC20, cvg: ERC20;
    let cvxRewardDistributor: CvxRewardDistributor;
    let lockingPositionService: LockingPositionService, lockingPositionManager: LockingPositionManager;
    let cvgRewards: CvgRewardsV2;
    let actualCycle: bigint;
    let currentCycle: bigint;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        cvxCrvStakingPositionService = contractsUsers.convex.cvxCrvStakingPositionService;
        cvxCrvStakerBuffer = contractsUsers.convex.cvxCrvStakerBuffer;
        lockingPositionManager = contractsUsers.contractsUserMainnet.locking.lockingPositionManager;
        lockingPositionService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;
        gaugeController = contractsUsers.contractsUserMainnet.locking.gaugeController;
        cvgRewards = contractsUsers.contractsUserMainnet.rewards.cvgRewards;
        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvx = contractsUsers.contractsUserMainnet.globalAssets["cvx"];
        crv = contractsUsers.contractsUserMainnet.globalAssets["crv"];
        cvxCrv = contractsUsers.contractsUserMainnet.convexAssets!["cvxCrv"];

        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;

        cvxCrvWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_CRV_WRAPPER);

        actualCycle = await cvgRewards.getCycleLocking((await ethers.provider.getBlock("latest"))!.timestamp);
        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();

        // mint locking position and vote for cvgCvxStaking gauge
        const lockingEndCycle = 96n - currentCycle;
        const nextIdLocking = await lockingPositionManager.nextId();

        await cvg.approve(lockingPositionService, ethers.MaxUint256);
        await lockingPositionService.mintPosition(lockingEndCycle, ethers.parseEther("10000"), 0, users.owner, true);
        await gaugeController.simple_vote(nextIdLocking, cvxCrvStakingPositionService, 1000);
    });

    it("Success : Deposit with some stkCvxCrv", async () => {
        await cvxCrvWrapper.connect(users.user1).approve(cvxCrvStakingPositionService, ethers.MaxUint256);

        const txDepositStkCvxCrv = cvxCrvStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

        await txDepositStkCvxCrv;

        await expect(txDepositStkCvxCrv).to.changeTokenBalances(
            cvxCrvWrapper,
            [users.user1, cvxCrvStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Deposit with some cvxCRV", async () => {
        await cvxCrv.connect(users.user2).approve(cvxCrvStakingPositionService, ethers.MaxUint256);

        const txDepositCvxCrv = cvxCrvStakingPositionService.connect(users.user2).deposit(MINT, ethers.parseEther("2000000"), 1, 0, false, false);
        await txDepositCvxCrv;

        await expect(txDepositCvxCrv).to.changeTokenBalances(
            cvxCrv,
            [users.user2, cvxCrvStakerBuffer],
            [-ethers.parseEther("2000000"), ethers.parseEther("2000000")]
        );
    });

    it("Success : Pass a cycle", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    it("Fail: pull rewards with random user", async () => {
        await cvxCrvStakerBuffer.pullRewards(users.user1).should.be.revertedWith("NOT_CVX_ASSET_STAKING_SERVICE");
    });

    it("Success : No rewards in CVG are distributed", async () => {
        const cycleInfo = await cvxCrvStakingPositionService.cycleInfo(actualCycle - 1n);
        expect(cycleInfo.cvgRewardsAmount).to.be.eq(0);
    });

    it("Fails : Process CVX rewards, no stakers fully staked during one cycle", async () => {
        await expect(cvxCrvStakingPositionService.processCvxRewards()).to.be.rejectedWith("NO_STAKERS");
    });
    let totalCvgDistributedExpected = 0n;

    it("Success : Pass a cycle", async () => {
        const lastTotalWeights = await cvgRewards.lastTotalWeight();
        const lastVote = await cvgRewards.lastWeights(cvxCrvStakingPositionService);
        totalCvgDistributedExpected = ((await cvgRewards.stakingInflationAtCycle(actualCycle - 1n)) * lastVote) / lastTotalWeights;
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        actualCycle++;
    });

    let distributedCvx: bigint;
    let distributedCrv: bigint;
    it("Success : Process rewards of Cvg & Convex", async () => {
        const balanceCvx = await cvx.balanceOf(cvxRewardDistributor);
        const balanceCrv = await crv.balanceOf(cvxRewardDistributor);

        await cvxCrvStakingPositionService.processCvxRewards();

        distributedCvx = (await cvx.balanceOf(cvxRewardDistributor)) - balanceCvx;
        distributedCrv = (await crv.balanceOf(cvxRewardDistributor)) - balanceCrv;

        const cycleInfo = await cvxCrvStakingPositionService.cycleInfo(actualCycle - 1n);

        expect(cycleInfo.cvgRewardsAmount).to.be.equal(totalCvgDistributedExpected);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 1", async () => {
        const txClaimCvxRewards = cvxCrvStakingPositionService.connect(users.user1).claimCvgCvxRewards(TOKEN_1, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user1], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(crv, [cvxRewardDistributor, users.user1], [-distributedCrv / 2n, distributedCrv / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user1], [-distributedCvx / 2n, distributedCvx / 2n]);
    });

    it("Success : Claim CVG & CVX rewards on TOKEN 2", async () => {
        const txClaimCvxRewards = cvxCrvStakingPositionService.connect(users.user2).claimCvgCvxRewards(TOKEN_2, 0, false);
        await txClaimCvxRewards;

        // await expect(txClaimCvxRewards).to.changeTokenBalances(cvg, [users.user2], [cvgAmount]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(crv, [cvxRewardDistributor, users.user2], [-distributedCrv / 2n, distributedCrv / 2n]);
        await expect(txClaimCvxRewards).to.changeTokenBalances(cvx, [cvxRewardDistributor, users.user2], [-distributedCvx / 2n, distributedCvx / 2n]);
    });

    it("Fails : Set Reward tokens Config without being owner", async () => {
        await expect(cvxCrvStakerBuffer.setRewardTokensConfig([{token: TOKEN_ADDR_CVX, processorFees: 1_000, podFees: 2_000}])).to.be.rejectedWith(
            OWNABLE_REVERT
        );
    });

    it("Success : Set Reward tokens Config", async () => {
        const configuration = [
            {token: TOKEN_ADDR_CVX, processorFees: 1_000, podFees: 2_000},
            {token: TOKEN_ADDR_CRV, processorFees: 1_000, podFees: 2_000},
            {token: TOKEN_ADDR_3CRV, processorFees: 1_000, podFees: 2_000},
        ];
        await cvxCrvStakerBuffer.connect(treasuryDao).setRewardTokensConfig(configuration);

        const formattedConfiguration = configuration.map(config => Object.values(config));
        expect(await cvxCrvStakerBuffer.getRewardTokensConfig()).to.deep.eq(formattedConfiguration);
    });

    it("Fails : Set Reward Weight without being owner", async () => {
        await expect(cvxCrvStakerBuffer.setRewardWeight(1)).to.be.rejectedWith(OWNABLE_REVERT);
    });
    it("Success : Set Reward Weight", async () => {
        await cvxCrvStakerBuffer.connect(treasuryDao).setRewardWeight(1);
    });
});
