import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, MaxUint256, ZeroAddress} from "ethers";
import {Cvg, CvgCvxStakingPositionService, CvxConvergenceLocker, CvxStakingPositionManager, ERC20} from "../../../../typechain-types";
import {MINT, TOKEN_1} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";

describe("cvgCvxStaking - Burn Position", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvx: ERC20, cvg: Cvg;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let cvxStakingPositionManager: CvxStakingPositionManager;
    let currentCycle: bigint;

    const depositedAmountToken1 = parseEther("5000");

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);

        users = contractsUsers.contractsUserMainnet.users;

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;

        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
        cvxStakingPositionManager = contractsUsers.convex.cvxStakingPositionManager;
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

        // transfer cvgCVX to users and mint position
        await cvxConvergenceLocker.transfer(users.user1, parseEther("1000000"));
        await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxStaking, MaxUint256);
        await cvgCvxStaking.connect(users.user1).deposit(MINT, depositedAmountToken1, EMPTY_CVX_DATA_STRUCT);
    });
    it("Success: get views", async () => {
        // user1's address is not a reward token, so ID is 0
        expect(await cvgCvxStaking.tokenToId(users.user1)).to.be.eq(0);

        // no rewards at cycle 1 for first reward token of array
        expect(await cvgCvxStaking.cvxRewardsByCycle(1, 0)).to.deep.eq([
            ZeroAddress, 0
        ]);
    });

    it("Fail: try to mint directly through the stakingPositionManager should revert", async () => {
        await cvxStakingPositionManager.mint(users.owner).should.be.revertedWith("NOT_STAKING");
    });

    it("Fail: burn tokenId with non tokenId owner should revert", async () => {
        await cvxStakingPositionManager.burn(TOKEN_1).should.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Fail: burn tokenId with staked amount should revert", async () => {
        await cvxStakingPositionManager.connect(users.user1).burn(TOKEN_1).should.be.revertedWith("TOTAL_STAKED_NOT_EMPTY");
    });

    it("Success: burn tokenId without staked amount", async () => {
        await cvgCvxStaking.connect(users.user1).withdraw(TOKEN_1, depositedAmountToken1, 0, 0);

        expect(await cvxStakingPositionManager.balanceOf(users.user1)).to.be.equal(1);
        await cvxStakingPositionManager.connect(users.user1).burn(TOKEN_1);
        expect(await cvxStakingPositionManager.balanceOf(users.user1)).to.be.equal(0);
    });
});
