import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther} from "ethers";
import {CvgCvxStakingPositionService, CvxConvergenceLocker, ERC20} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {MINT, TOKEN_1, TOKEN_3, TOKEN_2} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {EMPTY_CVX_DATA_STRUCT} from "../../../../resources/convex";

describe("cvgCvxStaking - tokenTotalStaked", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvx: ERC20;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
        cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;

        // approvals
        await cvx.connect(users.user1).approve(cvxConvergenceLocker, ethers.MaxUint256);
        await cvx.connect(users.user2).approve(cvxConvergenceLocker, ethers.MaxUint256);
        await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxStaking, ethers.MaxUint256);
        await cvxConvergenceLocker.connect(users.user2).approve(cvgCvxStaking, ethers.MaxUint256);

        // mint cvgCVX with fees because no locking
        await cvxConvergenceLocker.connect(users.user1).mint(users.user1, parseEther("1000"), false);
        await cvxConvergenceLocker.connect(users.user2).mint(users.user2, parseEther("1000"), false);

        // deposit for user1 and user2
        await cvgCvxStaking.connect(users.user1).deposit(MINT, parseEther("300"), EMPTY_CVX_DATA_STRUCT);
        await cvgCvxStaking.connect(users.user2).deposit(MINT, parseEther("500"), EMPTY_CVX_DATA_STRUCT);
    });

    it("Success : Checking staked amount for user1", async () => {
        expect(await cvgCvxStaking.tokenTotalStaked(TOKEN_1)).to.be.equal(parseEther("300"));
    });

    it("Success : Checking staked amount for non-user", async () => {
        expect(await cvgCvxStaking.tokenTotalStaked(TOKEN_3)).to.be.equal(0);
    });

    it("Success : Checking staked amount for user2", async () => {
        expect(await cvgCvxStaking.tokenTotalStaked(TOKEN_2)).to.be.equal(parseEther("500"));
    });

    it("Success : Withdrawing and checking staked amount for user2", async () => {
        await cvgCvxStaking.connect(users.user2).withdraw(TOKEN_2, parseEther("150"), 0, 0);
        expect(await cvgCvxStaking.tokenTotalStaked(TOKEN_2)).to.be.equal(parseEther("350"));
    });

    it("Success : Checking staked amount for users after cycle update", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 4);
        expect(await cvgCvxStaking.tokenTotalStaked(TOKEN_1)).to.be.equal(parseEther("300"));
        expect(await cvgCvxStaking.tokenTotalStaked(TOKEN_2)).to.be.equal(parseEther("350"));
    });
});
