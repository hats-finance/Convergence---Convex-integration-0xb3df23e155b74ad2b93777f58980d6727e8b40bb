import {IUsers} from "../../utils/contractInterface";
import {Signer, MaxUint256, parseEther} from "ethers";
import {IERC20, StkCvg} from "../../typechain-types";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployStkContracts} from "../fixtures/stkCvg-fixtures";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../resources/treasury";
import {TOKEN_ADDR_CRV, TOKEN_ADDR_CVX, TOKEN_ADDR_wstETH} from "../../resources/tokens/common";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {deployConvexFixture} from "../fixtures/convex-fixtures";

const one_month = 86_400 * 30;

describe("stkCvgStake Test", () => {
    let users: IUsers, treasuryDao: Signer;
    let cvg: IERC20, weth: IERC20, wstETH: IERC20;
    let stkCvgEth: StkCvg;

    before(async () => {
        const contractsUserMainnet = await loadFixture(deployStkContracts);
        users = contractsUserMainnet.users;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        stkCvgEth = contractsUserMainnet.stkCvgEth;
        cvg = contractsUserMainnet.cvg;
        weth = contractsUserMainnet.globalAssets["weth"];
        wstETH = contractsUserMainnet.globalAssets["wstETH"];

        // approvals
        await cvg.connect(users.user1).approve(stkCvgEth, MaxUint256);
        await cvg.connect(users.user2).approve(stkCvgEth, MaxUint256);
        await cvg.connect(users.user3).approve(stkCvgEth, MaxUint256);

        await weth.connect(users.user1).approve(stkCvgEth, MaxUint256);
        await weth.connect(users.user2).approve(stkCvgEth, MaxUint256);
        await weth.connect(users.user3).approve(stkCvgEth, MaxUint256);

        await wstETH.connect(users.user1).approve(stkCvgEth, MaxUint256);
    });

    it("Fails: Add reward token without being Treasury DAO", async () => {
        await stkCvgEth.addReward(TOKEN_ADDR_CVX, treasuryDao).should.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Fails: Add reward token with invalid token (CVG)", async () => {
        await stkCvgEth.connect(treasuryDao).addReward(cvg, treasuryDao).should.be.revertedWith("INVALID_TOKEN");
    });

    it("Fails: Add reward token with invalid token (stkCVG-Stake)", async () => {
        await stkCvgEth.connect(treasuryDao).addReward(cvg, treasuryDao).should.be.revertedWith("INVALID_TOKEN");
    });

    it("Success: Add wstETH as reward token", async () => {
        await expect(stkCvgEth.connect(treasuryDao).addReward(TOKEN_ADDR_wstETH, treasuryDao))
            .to.emit(stkCvgEth, "RewardAdded")
            .withArgs(TOKEN_ADDR_wstETH, await treasuryDao.getAddress());

        expect(await stkCvgEth.rewardTokens(0)).to.be.eq(TOKEN_ADDR_wstETH);
    });

    it("Fails: Add CVX as reward token again", async () => {
        await stkCvgEth.connect(treasuryDao).addReward(TOKEN_ADDR_wstETH, treasuryDao).should.be.rejectedWith("REWARD_TOKEN_ALREADY_EXISTS");
    });

    it("Fails: Approve reward token distributor without being Treasury DAO", async () => {
        await stkCvgEth.approveRewardDistributor(TOKEN_ADDR_wstETH, treasuryDao, true).should.be.rejectedWith("Ownable: caller is not the owner");
    });

    it("Fails: Approve reward token distributor with token not added", async () => {
        await stkCvgEth.connect(treasuryDao).approveRewardDistributor(TOKEN_ADDR_CRV, treasuryDao, true).should.be.rejectedWith("REWARD_TOKEN_NOT_FOUND");
    });

    it("Fails: Stake CVG tokens with 0 amount", async () => {
        await stkCvgEth.stake(0, 0, 0, users.owner).should.be.rejectedWith("AMOUNT_LTE");
    });

    it("Success: Add user1 as WETH depositor", async () => {
        await expect(stkCvgEth.connect(treasuryDao).approveRewardDistributor(TOKEN_ADDR_wstETH, users.user1, true))
            .to.emit(stkCvgEth, "RewardDistributorApproved")
            .withArgs(TOKEN_ADDR_wstETH, await users.user1.getAddress(), true);

        expect(await stkCvgEth.rewardDistributors(TOKEN_ADDR_wstETH, users.user1)).to.be.eq(true);
    });

    it("Success: Stake CVG tokens for user 1 with CVG only", async () => {
        const amount10 = parseEther("10");
        const tx = stkCvgEth.connect(users.user1).stake(amount10, 0, 0, users.user1);
        await tx;
        await expect(tx)
            .to.emit(stkCvgEth, "Staked")
            .withArgs(await users.user1.getAddress(), amount10, 0);

        await expect(tx).to.changeTokenBalances(cvg, [users.user1, stkCvgEth], [-amount10, amount10]);
    });

    it("Fails: Withdraw CVG tokens with 0 amount", async () => {
        await stkCvgEth.withdraw(0).should.be.revertedWith("AMOUNT_LTE");
    });
    const rewardAmountFirstDistrib = ethers.parseEther("2");
    it("Success: Add reward in ETH", async () => {
        await stkCvgEth.connect(users.user1).notifyRewardAmount(TOKEN_ADDR_wstETH, rewardAmountFirstDistrib);
    });

    it("Success: Stake with user2 with WETH", async () => {
        const amount1Ether = parseEther("1");
        const pool = await ethers.getContractAt("ICrvPoolNg", "0x004c167d27ada24305b76d80762997fa6eb8d9b2");
        const amOut = await pool.get_dy(0, 1, amount1Ether);
        const tx = stkCvgEth.connect(users.user2).stake(0, amount1Ether, 0, users.user2);
        await tx;
        await expect(tx)
            .to.emit(stkCvgEth, "Staked")
            .withArgs(await users.user2.getAddress(), amOut, amount1Ether);

        await expect(tx).to.changeTokenBalances(weth, [users.user2, pool], [-amount1Ether, amount1Ether]);
        await expect(tx).to.changeTokenBalances(cvg, [pool, stkCvgEth], [-amOut, amOut]);
    });

    it("Success: Go on quarter of the period", async () => {
        await time.increase(one_month / 4);
    });

    it("Success: Claimable rewards for user 1, should be the quarter of the last distribution", async () => {
        const balanceBeforeUser = await wstETH.balanceOf(users.user1);

        const tx = stkCvgEth.connect(users.user1).getReward(users.user1);
        await tx;

        const balanceAfterUser = await wstETH.balanceOf(users.user1);

        const shareUser1 = ((await stkCvgEth.balanceOf(users.user1)) * 10n ** 18n) / (await stkCvgEth.totalSupply());
        const claimedAmount = balanceAfterUser - balanceBeforeUser;
        expect(claimedAmount).to.be.closeTo((rewardAmountFirstDistrib * shareUser1) / (10n ** 18n * 4n), ethers.parseEther("0.001"));
        await expect(tx).to.changeTokenBalances(wstETH, [stkCvgEth, users.user1], [-claimedAmount, claimedAmount]);
    });

    it("Success: Stake with user3 with WETH, CVG and ETH", async () => {
        const amountWeth = parseEther("1");
        const amountEth = parseEther("1");
        const amountCvg = parseEther("1");
        const pool = await ethers.getContractAt("ICrvPoolNg", "0x004c167d27ada24305b76d80762997fa6eb8d9b2");
        const amOut = await pool.get_dy(0, 1, amountWeth + amountEth);
        const tx = stkCvgEth.connect(users.user3).stake(amountCvg, amountWeth, amOut, users.user3, {value: amountEth});
        await tx;
        await expect(tx)
            .to.emit(stkCvgEth, "Staked")
            .withArgs(await users.user3.getAddress(), amOut + amountCvg, amountWeth + amountEth);

        await expect(tx).to.changeEtherBalances([users.user3, weth], [-amountEth, amountEth]);
        await expect(tx).to.changeTokenBalances(weth, [users.user3, pool], [-amountWeth, amountWeth + amountEth]);
        await expect(tx).to.changeTokenBalances(cvg, [pool, stkCvgEth], [-amOut, amOut + amountCvg]);
    });

    it("Success: Add reward in ETH", async () => {
        await stkCvgEth.connect(users.user1).notifyRewardAmount(TOKEN_ADDR_wstETH, ethers.parseEther("2"));
    });

    it("Success: Go on half the period", async () => {
        await time.increase(one_month / 4);
    });

    it("Success: Go on half the period", async () => {
        await time.increase(one_month / 4);
    });

    it("Success: Go on half the period", async () => {
        await time.increase(one_month / 2);
    });

    it("Success: Revoke reward token distributor for WETH", async () => {
        await expect(stkCvgEth.connect(treasuryDao).approveRewardDistributor(TOKEN_ADDR_wstETH, treasuryDao, false))
            .to.emit(stkCvgEth, "RewardDistributorApproved")
            .withArgs(TOKEN_ADDR_wstETH, await treasuryDao.getAddress(), false);

        expect(await stkCvgEth.rewardDistributors(TOKEN_ADDR_wstETH, treasuryDao)).to.be.eq(false);
    });
});
