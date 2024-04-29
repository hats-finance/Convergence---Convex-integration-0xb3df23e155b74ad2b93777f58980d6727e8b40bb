import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../utils/contractInterface";
import {deployConvexFixture} from "../../fixtures/convex-fixtures";
import {ethers} from "hardhat";
import {CvxConvergenceLocker, ERC20} from "../../../typechain-types";
import {parseEther, Signer, encodeBytes32String} from "ethers";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {TREASURY_DAO, TREASURY_POD} from "../../../resources/treasury";
import {CONVEX_LOCKER} from "../../../resources/convex";
import {OWNABLE_REVERT} from "../../../resources/revert";

describe("CvxConvergenceLocker Tests", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvx: ERC20, fxs: ERC20, crv: ERC20, dai: ERC20;
    let cvxConvergenceLocker: CvxConvergenceLocker;

    const DELEGATE_ID = encodeBytes32String("cvx.eth");

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        dai = contractsUsers.contractsUserMainnet.globalAssets.dai;
        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;
        crv = contractsUsers.contractsUserMainnet.globalAssets.crv;

        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;

        // approvals
        await cvx.connect(users.user1).approve(cvxConvergenceLocker, ethers.MaxUint256);
        await cvx.connect(users.user2).approve(cvxConvergenceLocker, ethers.MaxUint256);

        // mint cvgCVX to have some pending CVX on the contract
        await cvxConvergenceLocker.connect(users.user1).mint(users.user1, parseEther("10"), false);
        await cvxConvergenceLocker.connect(users.user2).mint(users.user2, parseEther("20"), false);
    });

    it("Fails: Initialize contract again", async () => {
        await cvxConvergenceLocker
            .initialize("Convex CVG", "cvgCVX", users.user1, users.user1)
            .should.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Fails: Set delegate without being owner", async () => {
        await cvxConvergenceLocker.delegate(DELEGATE_ID, users.user1).should.be.revertedWith(OWNABLE_REVERT);
    });

    it("Fails: Clear delegate without being owner", async () => {
        await cvxConvergenceLocker.clearDelegate(DELEGATE_ID).should.be.revertedWith(OWNABLE_REVERT);
    });
    it("Fails: Set Convex Delegate Registry contract without being owner", async () => {
        await cvxConvergenceLocker.setCvxDelegateRegistry(users.user1).should.be.revertedWith(OWNABLE_REVERT);
    });
    it("Fails: Set Staking Position Service contract without being owner", async () => {
        await cvxConvergenceLocker.setCvxStakingPositionService(users.user1).should.be.revertedWith(OWNABLE_REVERT);
    });
    it("Fails: Set Processor Rewards Percentage without being owner", async () => {
        await cvxConvergenceLocker.setProcessorRewardsPercentage(500).should.be.revertedWith(OWNABLE_REVERT);
    });

    it("Fails: Set mint fees without being owner", async () => {
        await cvxConvergenceLocker.setMintFees(100).should.be.revertedWith(OWNABLE_REVERT);
    });

    it("Fails: Send tokens without being owner", async () => {
        await cvxConvergenceLocker.sendTokens([], [], users.user1).should.be.revertedWith(OWNABLE_REVERT);
    });

    it("Fails: Set mint fees with amount too big", async () => {
        await cvxConvergenceLocker.connect(treasuryDao).setMintFees(500).should.be.revertedWith("FEES_TOO_BIG");
    });

    it("Success: Lock CVX tokens onto Convex locking contract", async () => {
        await cvxConvergenceLocker.lockCvx();

        expect(await cvx.balanceOf(cvxConvergenceLocker)).to.be.eq(0);
        expect(await cvxConvergenceLocker.cvxToLock()).to.be.eq(0);
    });

    it("Fails: Lock CVX tokens with no pending amount", async () => {
        // error thrown by Convex contract
        await cvxConvergenceLocker.lockCvx().should.be.revertedWith("Cannot stake 0");
    });

    it("Fails: Pulling rewards with random account", async () => {
        await cvxConvergenceLocker.pullRewards(users.user1).should.be.revertedWith("NOT_CVG_CVX_STAKING");
    });

    it("Success: Mint cvgCVX without locking", async () => {
        // fees are 2%
        await cvxConvergenceLocker.connect(users.user1).mint(users.user1, parseEther("10"), false);

        expect(await cvxConvergenceLocker.balanceOf(users.user1)).to.be.eq(parseEther("19.8"));
        expect(await cvx.balanceOf(TREASURY_POD)).to.be.eq(parseEther("0.4"));
        expect(await cvx.balanceOf(cvxConvergenceLocker)).to.be.eq(parseEther("9.9"));
        expect(await cvxConvergenceLocker.cvxToLock()).to.be.eq(parseEther("9.9"));
    });

    it("Success: Mint cvgCVX with locking", async () => {
        const amount = parseEther("24.8");
        const amountToLock = parseEther("34.7");

        await expect(cvxConvergenceLocker.connect(users.user2).mint(users.user2, amount, true)).to.changeTokenBalances(
            cvx,
            [users.user2, CONVEX_LOCKER, cvxConvergenceLocker],
            [-amount, amountToLock, -(amountToLock - amount)]
        );

        expect(await cvxConvergenceLocker.balanceOf(users.user2)).to.be.eq(parseEther("44.6"));

        // value is reset because pending cvg to be locked are sent to cvxLocker
        expect(await cvxConvergenceLocker.cvxToLock()).to.be.eq(0);
    });

    it("Success: Burn cvgSDT", async () => {
        const burntAmount = parseEther("3");

        await expect(cvxConvergenceLocker.connect(users.user2).burn(burntAmount)).to.changeTokenBalances(cvxConvergenceLocker, [users.user2], [-burntAmount]);
    });

    it("Success: Set mint fees to 2%", async () => {
        await cvxConvergenceLocker.connect(treasuryDao).setMintFees(200);
        expect(await cvxConvergenceLocker.mintFees()).to.be.eq(200);
    });

    it("Success: Set delegation", async () => {
        await cvxConvergenceLocker.connect(treasuryDao).delegate(DELEGATE_ID, users.user1);
    });

    it("Success: Remove delegation", async () => {
        await cvxConvergenceLocker.connect(treasuryDao).clearDelegate(DELEGATE_ID);
    });

    it("Fails: Send tokens with a mismatched array length", async () => {
        await cvxConvergenceLocker.connect(treasuryDao).sendTokens([cvx], [], users.user1).should.be.revertedWith("LENGTH_MISMATCH");
    });

    it("Fails: Send tokens with forbidden tokens", async () => {
        await cvxConvergenceLocker.connect(treasuryDao).sendTokens([cvx], [10], users.user1).should.be.revertedWith("CVX_CANNOT_BE_TRANSFERRED");
        await cvxConvergenceLocker.connect(treasuryDao).sendTokens([crv], [10], users.user1).should.be.revertedWith("CRV_CANNOT_BE_TRANSFERRED");
        await cvxConvergenceLocker.connect(treasuryDao).sendTokens([fxs], [10], users.user1).should.be.revertedWith("FXS_CANNOT_BE_TRANSFERRED");
        await cvxConvergenceLocker
            .connect(treasuryDao)
            .sendTokens([cvxConvergenceLocker], [10], users.user1)
            .should.be.revertedWith("CVGCVX_CANNOT_BE_TRANSFERRED");
    });

    it("Success: Send DAI to user1 through send tokens method", async () => {
        const amount = parseEther("100");
        await dai.transfer(cvxConvergenceLocker, amount); // on purpose

        await expect(cvxConvergenceLocker.connect(treasuryDao).sendTokens([dai], [amount], users.user1)).to.changeTokenBalances(
            dai,
            [cvxConvergenceLocker, users.user1],
            [-amount, amount]
        );
    });
});
