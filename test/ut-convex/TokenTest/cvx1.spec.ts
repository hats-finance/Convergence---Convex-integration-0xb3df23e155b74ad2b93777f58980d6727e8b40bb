import {IContractsConvex, IUsers} from "../../../utils/contractInterface";
import {CVX1, ERC20} from "../../../typechain-types";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployConvexFixture} from "../../fixtures/convex-fixtures";
import {MaxUint256, parseEther, Signer} from "ethers";
import chai, {expect, use} from "chai";
import {OWNABLE_REVERT} from "../../../resources/revert";
import {ethers} from "hardhat";
import {TREASURY_DAO, TREASURY_POD} from "../../../resources/treasury";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();

describe("CVX1 Tests", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer, treasuryPod: Signer;
    let cvx: ERC20, cvxCrv: ERC20, usdc: ERC20;
    let cvx1: CVX1;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);
        treasuryPod = await ethers.getSigner(TREASURY_POD);

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        cvx1 = contractsUsers.convex.CVX1;
        cvxCrv = contractsUsers.contractsUserMainnet.convexAssets!.cvxCrv;
        usdc = contractsUsers.contractsUserMainnet.globalAssets!.usdc;

        // approvals
        await cvx.connect(users.user1).approve(cvx1, MaxUint256);
        await cvx.connect(users.user2).approve(cvx1, MaxUint256);
    });

    it("Fails: Initialize CVX1 contract again", async () => {
        await cvx1.initialize("CVX1", "CVX1", users.user1).should.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Success: Mints CVX1 token for user1", async () => {
        const amount10 = parseEther("10");
        const tx = cvx1.connect(users.user1).mint(users.user1, amount10);

        await expect(tx).to.changeTokenBalances(cvx, [users.user1, cvx1], [-amount10, amount10]);
        await expect(tx).to.changeTokenBalances(cvx1, [users.user1], [amount10]);
    });

    it("Success: Stake contract's balance", async () => {
        const contractBalance = await cvx.balanceOf(cvx1);
        await expect(cvx1.stake()).to.changeTokenBalances(cvx, [cvx1], [-contractBalance]);
    });

    it("Success: Withdraw amount greater than CVX1 contract's balance", async () => {
        const amount8 = parseEther("8");
        const tx = cvx1.connect(users.user1).withdraw(amount8);

        await expect(tx).to.changeTokenBalances(cvx, [users.user1], [amount8]);
    });

    it("Success: Get reward and send them to Treasury POD", async () => {
        const previousCvxCrvBalance = await cvxCrv.balanceOf(treasuryPod);
        await cvx1.getReward();

        expect(await cvxCrv.balanceOf(treasuryPod)).to.be.gt(previousCvxCrvBalance);
    });

    it("Success: Sends extra rewards to Treasury POD", async () => {
        await usdc.connect(users.user1).transfer(cvx1, ethers.parseUnits("1000", 6));
        const tx = cvx1.recoverRewards([usdc]);

        await expect(tx).to.changeTokenBalances(usdc, [cvx1, treasuryPod], [-ethers.parseUnits("1000", 6), ethers.parseUnits("1000", 6)]);
    });

    it("Success: Try to recover CVX which is not possible", async () => {
        await cvx1.recoverRewards([cvx]).should.be.revertedWith("CANNOT_GET_CVX");
    });

    it("Fails: Try setting new CVX reward contract without being owner", async () => {
        await cvx1.setCvxRewardPool(users.user1).should.be.revertedWith(OWNABLE_REVERT);
    });

    it("Success: Set new CVX reward contract", async () => {
        await cvx1.connect(treasuryDao).setCvxRewardPool(users.user1);
        expect(await cvx1.cvxRewardPool()).to.be.eq(users.user1);
    });
});
