import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
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
import {CLAIMER_REWARDS_PERCENTAGE, MINT} from "../../../../resources/constant";

import {TypedContractEvent, TypedDeferredTopicFilter} from "../../../../typechain-types/common";
import {ClaimCvgCvxMultipleEvent, ClaimCvgMultipleEvent} from "../../../../typechain-types/contracts/Staking/Convex/CvxStakingPositionService";

//eUSD/FRAXP

const DENOMINATOR = 100000n;

describe("cvgFraxLpStaking - Process Cvx Rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer, owner: Signer, user1: Signer, user2: Signer, user3: Signer;
    let cvg: Cvg, cvx: ERC20, fxs: ERC20, crv: ERC20, usdc: ERC20, frax: ERC20, eusd: ERC20, fraxbp: ERC20, eusdfraxbp: ICurveLp;
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
    let CYCLE_1: bigint, CYCLE_2: bigint, CYCLE_3: bigint, CYCLE_4: bigint, CYCLE_5: bigint, CYCLE_6: bigint;
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
        CYCLE_6 = currentCycle + 5n;

        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).add_gauge(cvgeUSDFRAXBPStaking, 0, 0);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).toggle_vote_pause(cvgeUSDFRAXBPStaking);

        // transfer 1 wei of to initialize the staker position of the locker contract
        await eusdfraxbp.transfer(cvgeUSDFRAXBPLocker, "1");
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setupLocker(cvgeUSDFRAXBPStaking);

        // mint locking position and vote for cvgCvxStaking gauge
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

        // approve cvgCvx spending from staking contract
        await cvgeUSDFRAXBPLocker.connect(user1).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(user2).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(user3).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);

        //deposit
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(MINT, depositedAmountUser1);
        await cvgeUSDFRAXBPStaking.connect(user2).deposit(MINT, depositedAmountUser2);

        filterClaimCvg = cvgeUSDFRAXBPStaking.filters.ClaimCvgMultiple(undefined, undefined);
        filterClaimCvgCvx = cvgeUSDFRAXBPStaking.filters.ClaimCvgCvxMultiple(undefined, undefined);
    });
    it("Success : Updating cvg cycle to 3", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 2);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_3);
    });

    it("Success : Processing Cvx rewards for cycle 2", async () => {
        //simulate getReward call with the owner
        const getRewards = await cvgeUSDFRAXBPLocker.connect(treasuryDao).getReward.staticCall();

        //process
        await cvgeUSDFRAXBPStaking.processCvxRewards();

        const [rewardForCycle] = await cvgeUSDFRAXBPStaking.getProcessedCvxRewards(CYCLE_2);
        const expectedCvxAmount = (getRewards[0] * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        expect(rewardForCycle.token).to.deep.eq(await cvx.getAddress());
        expect(rewardForCycle.amount).to.be.approximately(expectedCvxAmount, ethers.parseEther("0.1"));
    });

    it("Success : Updating cvg cycle to 4", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_4);
    });

    it("Success : Processing Cvx rewards for cycle 3", async () => {
        //simulate getReward call with the owner
        const getRewards = await cvgeUSDFRAXBPLocker.connect(treasuryDao).getReward.staticCall();
        //process
        await cvgeUSDFRAXBPStaking.processCvxRewards();

        const [rewardForCycle] = await cvgeUSDFRAXBPStaking.getProcessedCvxRewards(CYCLE_3);
        const expectedCvxAmount = (getRewards[0] * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        expect(rewardForCycle.token).to.deep.eq(await cvx.getAddress());
        expect(rewardForCycle.amount).to.be.approximately(expectedCvxAmount, ethers.parseEther("0.1"));
    });

    it("Success : Updating cvg cycle to 5", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_5);
    });

    it("Success : Processing Cvx rewards for cycle 4", async () => {
        //simulate getReward call with the owner
        const getRewards = await cvgeUSDFRAXBPLocker.connect(treasuryDao).getReward.staticCall();
        //process
        await cvgeUSDFRAXBPStaking.processCvxRewards();

        const [rewardForCycle] = await cvgeUSDFRAXBPStaking.getProcessedCvxRewards(CYCLE_4);
        const expectedFxsAmount = (getRewards[2] * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR; //why fxs here ? don't know bruh
        expect(rewardForCycle.token).to.deep.eq(await fxs.getAddress());
        expect(rewardForCycle.amount).to.be.approximately(expectedFxsAmount, ethers.parseEther("0.1"));
    });

    it("Success: No rewards for current cycle (5)", async () => {
        const rewardForCycle = await cvgeUSDFRAXBPStaking.getProcessedCvxRewards(CYCLE_5);
        expect(rewardForCycle).to.be.empty;
    });
});
