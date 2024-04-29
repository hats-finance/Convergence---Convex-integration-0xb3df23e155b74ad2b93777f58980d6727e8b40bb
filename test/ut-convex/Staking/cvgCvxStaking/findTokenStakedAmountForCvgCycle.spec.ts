import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, Signer, MaxUint256} from "ethers";
import {Cvg, CvgCvxStakingPositionService, CvxConvergenceLocker, ERC20} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {MINT, TOKEN_1, TOKEN_2, TOKEN_3} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";

describe("cvgCvxStaking - find Token Staked Amount For CVG Cycle", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvx: ERC20, cvg: Cvg;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let currentCycle: bigint;

    const depositedAmountToken1 = parseEther("5000");
    const depositedAmountToken2 = parseEther("6735");

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);

        users = contractsUsers.contractsUserMainnet.users;
        treasuryDao = await ethers.getSigner(TREASURY_DAO);

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

    it("Success : Returns 0 for cycle N", async () => {
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(0, TOKEN_1, currentCycle)).to.be.equal(0);
    });

    it("Success : Returns 0 for current cycle", async () => {
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle, TOKEN_1, currentCycle)).to.be.equal(0);
    });

    it("Success : Returns 0 for unreached cycle", async () => {
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 1n, TOKEN_1, currentCycle)).to.be.equal(0);
    });

    it("Success : Go to cycle N+1 !", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
    });

    it("Success : Returns 0 for a non - existing position", async () => {
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle, TOKEN_3, currentCycle + 1n)).to.be.equal(0);
    });

    it("Success : Withdraw user2, Token 5 ", async () => {
        await cvgCvxStaking.connect(users.user2).withdraw(TOKEN_2, parseEther("2000"), 0, 0);
    });

    it("Success : Go to cycle N+5 !", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 4);
    });

    it("Success : Returns eligible amount for rewards.", async () => {
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 1n, TOKEN_1, currentCycle + 4n)).to.be.equal(parseEther("5000"));
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 1n, TOKEN_2, currentCycle + 4n)).to.be.equal(parseEther("4735"));
    });

    it("Success : Check eligible amount for all past cycles", async () => {
        const amount_user1 = parseEther("5000");
        const amount_user2 = parseEther("4735");

        // TOKEN 1
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle, TOKEN_1, currentCycle + 5n)).to.be.equal(0);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 1n, TOKEN_1, currentCycle + 5n)).to.be.equal(amount_user1);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 2n, TOKEN_1, currentCycle + 5n)).to.be.equal(amount_user1);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 3n, TOKEN_1, currentCycle + 5n)).to.be.equal(amount_user1);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 4n, TOKEN_1, currentCycle + 5n)).to.be.equal(amount_user1);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 5n, TOKEN_1, currentCycle + 5n)).to.be.equal(0);

        // TOKEN 2
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle, TOKEN_2, currentCycle + 5n)).to.be.equal(0);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 1n, TOKEN_2, currentCycle + 5n)).to.be.equal(amount_user2);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 2n, TOKEN_2, currentCycle + 5n)).to.be.equal(amount_user2);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 3n, TOKEN_2, currentCycle + 5n)).to.be.equal(amount_user2);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 4n, TOKEN_2, currentCycle + 5n)).to.be.equal(amount_user2);
        expect(await cvgCvxStaking.stakedAmountEligibleAtCycle(currentCycle + 5n, TOKEN_2, currentCycle + 5n)).to.be.equal(0);
    });
});
