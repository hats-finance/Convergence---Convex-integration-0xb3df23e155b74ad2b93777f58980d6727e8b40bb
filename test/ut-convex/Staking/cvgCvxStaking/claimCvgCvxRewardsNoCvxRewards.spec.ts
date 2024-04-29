import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, Signer, MaxUint256} from "ethers";
import {Cvg, CvgCvxStakingPositionService, CvxConvergenceLocker, ERC20} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {MINT, TOKEN_2} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";

describe("cvgCvxStaking - Claim CvgCvx Rewards without Cvx rewards", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvx: ERC20, cvg: Cvg;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let currentCycle: bigint;

    const depositedAmountToken1 = parseEther("5000"),
        depositedAmountToken2 = parseEther("100000"),
        withdrawAmount = parseEther("4000");

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
        await cvxConvergenceLocker.mint(users.owner, parseEther("4000000"), false);

        // transfer cvgCVX to users
        await cvxConvergenceLocker.transfer(users.user1, parseEther("1000000"));
        await cvxConvergenceLocker.transfer(users.user2, parseEther("1000000"));
        await cvxConvergenceLocker.transfer(users.user3, parseEther("1000000"));

        // approve cvgCVX spending from staking contract
        await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxStaking, MaxUint256);
        await cvxConvergenceLocker.connect(users.user2).approve(cvgCvxStaking, MaxUint256);
        await cvxConvergenceLocker.connect(users.user3).approve(cvgCvxStaking, MaxUint256);

        // deposit for user1, user2 and user3
        await cvgCvxStaking.connect(users.user1).deposit(MINT, depositedAmountToken1, EMPTY_CVX_DATA_STRUCT);
        await cvgCvxStaking.connect(users.user2).deposit(MINT, depositedAmountToken2, EMPTY_CVX_DATA_STRUCT);
        await cvgCvxStaking.connect(users.user3).deposit(MINT, depositedAmountToken2, EMPTY_CVX_DATA_STRUCT);
        await cvgCvxStaking.connect(users.user3).withdraw(3, depositedAmountToken2, 0, 0);
    });

    it("Success : Processing rewards & Updating cvg cycle to 1", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 1n);
    });

    it("Success : Withdrawing user2 at cycle 2", async () => {
        await cvgCvxStaking.connect(users.user2).withdraw(TOKEN_2, withdrawAmount, 0, 0);
        expect(await cvgCvxStaking.stakingHistoryByToken(TOKEN_2, 0)).to.be.eq(currentCycle + 1n);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 1n, TOKEN_2)).to.be.deep.eq([depositedAmountToken2 - withdrawAmount, depositedAmountToken2]);
        expect(await cvgCvxStaking.tokenInfoByCycle(currentCycle + 2n, TOKEN_2)).to.be.deep.eq([depositedAmountToken2 - withdrawAmount, 0]);
        expect(await cvgCvxStaking.cycleInfo(currentCycle + 1n)).to.be.deep.eq([0, depositedAmountToken1 + depositedAmountToken2 - withdrawAmount, false]);
        expect(await cvgCvxStaking.cycleInfo(currentCycle + 2n)).to.be.deep.eq([0, depositedAmountToken1 + depositedAmountToken2 - withdrawAmount, false]);
    });

    it("Success : Processing rewards & update cvg cycle to 3 should compute right infos", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgCvxStaking.stakingCycle()).to.be.equal(currentCycle + 2n);
    });
});
