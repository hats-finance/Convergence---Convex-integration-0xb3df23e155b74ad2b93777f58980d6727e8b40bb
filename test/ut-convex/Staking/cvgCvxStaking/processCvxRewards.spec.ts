import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, MaxUint256} from "ethers";
import {Cvg, CvgCvxStakingPositionService, CvxConvergenceLocker, ERC20} from "../../../../typechain-types";
import {MINT, CLAIMER_REWARDS_PERCENTAGE} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";

describe("cvgCvxStaking - Process Cvx Rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvx: ERC20, cvg: Cvg;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let currentCycle: bigint;

    const depositedAmountToken1 = parseEther("5000");
    const depositedAmountToken2 = parseEther("6735");

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);

        users = contractsUsers.contractsUserMainnet.users;

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
        cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;

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

    it("Success : Updating cvg cycle to N+2", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 2);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 2n);
    });

    it("Success : Processing Cvx rewards for cycle N+1", async () => {
        const amountCvx = parseEther("10");
        await cvx.transfer(cvxConvergenceLocker, amountCvx);
        const cvxForProcessor = (amountCvx * CLAIMER_REWARDS_PERCENTAGE) / 100_000n;
        const cvxDistributed = amountCvx - cvxForProcessor;

        // process
        await cvgCvxStaking.processCvxRewards();

        const [rewardForCycle] = await cvgCvxStaking.getProcessedCvxRewards(currentCycle + 1n);

        expect(rewardForCycle).to.deep.eq([await cvx.getAddress(), cvxDistributed]);
    });

    it("Success : Updating cvg cycle to N+3", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 3n);
    });

    it("Success : Processing Cvx rewards for cycle N+2", async () => {
        const amountCvx = parseEther("10");
        await cvx.transfer(cvxConvergenceLocker, amountCvx);
        const cvxForProcessor = (amountCvx * CLAIMER_REWARDS_PERCENTAGE) / 100_000n;
        const cvxDistributed = amountCvx - cvxForProcessor;

        //process
        await cvgCvxStaking.processCvxRewards();

        const [rewardForCycle] = await cvgCvxStaking.getProcessedCvxRewards(currentCycle + 2n);
        expect(rewardForCycle).to.deep.eq([await cvx.getAddress(), cvxDistributed]);
    });

    it("Success : Updating cvg cycle to N+4", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 4n);
    });

    it("Success : Processing Cvx rewards for cycle N+3", async () => {
        const amountCvx = parseEther("10");
        await cvx.transfer(cvxConvergenceLocker, amountCvx);
        const cvxForProcessor = (amountCvx * CLAIMER_REWARDS_PERCENTAGE) / 100_000n;
        const cvxDistributed = amountCvx - cvxForProcessor;

        //process
        await cvgCvxStaking.processCvxRewards();

        const [rewardForCycle] = await cvgCvxStaking.getProcessedCvxRewards(currentCycle + 3n);
        expect(rewardForCycle).to.deep.eq([await cvx.getAddress(), cvxDistributed]);
    });

    it("Success: No rewards for cycle N+4", async () => {
        const rewardForCycle = await cvgCvxStaking.getProcessedCvxRewards(currentCycle + 4n);
        expect(rewardForCycle).to.be.empty;
    });
});
