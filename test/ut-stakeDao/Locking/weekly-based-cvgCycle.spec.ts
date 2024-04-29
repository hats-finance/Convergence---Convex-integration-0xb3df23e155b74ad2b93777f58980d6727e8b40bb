import {expect} from "chai";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle, increaseCvgCycleWithoutTime} from "../../fixtures/stake-dao";
import {Signer} from "ethers";
import {ethers} from "hardhat";
import {LockingPositionService, Cvg, CvgControlTower, YsDistributor, CvgRewards, LockingPositionManager, ERC20} from "../../../typechain-types";
import {IContractsUser, IContracts, IUsers} from "../../../utils/contractInterface";
import {CYCLE_12, CYCLE_24, ONE_WEEK, TDE_1, TDE_2, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_4} from "../../../resources/constant";
import {VeCVG} from "../../../typechain-types-vyper/VeCVG";
import {
    goOnNextWeek,
    verifyVeSumBalancesEqualsTotalSupply,
    verifyYsSumBalancesEqualsTotalSupply,
    verifyYsSumBalancesEqualsTotalSupplyHistory,
} from "../../../utils/locking/invariants.checks";
import {getActualBlockTimeStamp, withinPercentage} from "../../../utils/testUtils/testUtils";

describe("LockingPositionService : Fix after Sherlock on WEEK rounding to fit with veCVG", () => {
    let lockingPositionService: LockingPositionService,
        cvgContract: Cvg,
        controlTowerContract: CvgControlTower,
        ysdistributor: YsDistributor,
        lockingPositionManager: LockingPositionManager,
        cvgRewards: CvgRewards,
        veCvg: VeCVG;
    let usdc: ERC20, usdt: ERC20, weth: ERC20;
    let contractUsers: IContractsUser, contracts: IContracts, users: IUsers;
    let user1: Signer, user2: Signer;

    before(async () => {
        contractUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractUsers.contracts;
        users = contractUsers.users;

        lockingPositionService = contracts.locking.lockingPositionService;

        cvgContract = contracts.tokens.cvg;
        cvgRewards = contracts.rewards.cvgRewards;
        controlTowerContract = contracts.base.cvgControlTower;
        ysdistributor = contracts.rewards.ysDistributor;
        lockingPositionManager = contracts.locking.lockingPositionManager;
        veCvg = contracts.locking.veCvg;
        user1 = users.user1;
        user2 = users.user2;

        usdc = contracts.tokens.usdc;
        usdt = contracts.tokens.usdt;
        weth = contracts.tokens.weth;

        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();

        await cvgContract.connect(user1).approve(lockingPositionService, ethers.MaxUint256);
        await cvgContract.connect(user2).approve(lockingPositionService, ethers.MaxUint256);
    });

    /* TDE 1 **/

    it("Success : Get cycle time based", async () => {
        const cycleLocking = await cvgRewards.getCycleLocking(await getActualBlockTimeStamp());
        expect(cycleLocking).to.be.eq(1);
    });
    const amountLockedToken1 = ethers.parseEther("1000");
    const amountLockedToken2 = ethers.parseEther("10000");

    it("Success : Mint TOKEN_1 on CYCLE_1", async () => {
        await lockingPositionService.connect(user1).mintPosition(11, amountLockedToken1, 50, user1, true);

        const lockingPosition = await lockingPositionService.lockingPositions(TOKEN_1);
        const expectedMgCvg = (11n * amountLockedToken1 * 50n) / (96n * 100n);
        const endCycle12Timestamp = (await cvgRewards.lastUpdatedTimestamp()) + ONE_WEEK * 12n;
        const veCvgLockedPosition = await veCvg.locked(TOKEN_1);

        expect(lockingPosition).to.be.deep.eq([1, 12, 50, amountLockedToken1, expectedMgCvg]);
        expect(endCycle12Timestamp).to.be.eq(veCvgLockedPosition.end);
        expect(await lockingPositionManager.balanceOf(user1)).to.be.eq(1);
        expect(await lockingPositionManager.tokenOfOwnerByIndex(user1, 0)).to.be.eq(TOKEN_1);
    });
    let balanceToken1VeCvgTotal: bigint;
    it("Success : Verifies veCVG token 1", async () => {
        let veCvgBalance = await veCvg.connect(user1).balanceOf(TOKEN_1);
        const estimatedVeCvg = (((amountLockedToken1 * 50n) / 100n) * 12n) / 97n;
        balanceToken1VeCvgTotal = estimatedVeCvg;
        withinPercentage(veCvgBalance, estimatedVeCvg, 0.2);
    });

    it("Success : Go to cycle 2", async () => {
        await increaseCvgCycle(contractUsers, 1);
    });

    it("Success : Verifies veCVG token 1 in cycle 2", async () => {
        let veCvgBalance = await veCvg.connect(user1).balanceOf(TOKEN_1);
        const estimatedVeCvg = (balanceToken1VeCvgTotal * 11n) / 12n;
        balanceToken1VeCvgTotal = estimatedVeCvg;
        withinPercentage(veCvgBalance, estimatedVeCvg, 0.1);
    });

    it("Success : Get cycle time based for cycle 2", async () => {
        const cycleLocking = await cvgRewards.getCycleLocking(await getActualBlockTimeStamp());
        expect(cycleLocking).to.be.eq(2);
    });

    const expectedMgCvgToken2 = (22n * amountLockedToken2 * 50n) / (96n * 100n);

    it("Success : Mint TOKEN_2 on CYCLE_2", async () => {
        await lockingPositionService.connect(user2).mintPosition(22, amountLockedToken2, 50, user2, true);

        const lockingPosition = await lockingPositionService.lockingPositions(TOKEN_2);
        const endCycle24Timestamp = (await cvgRewards.lastUpdatedTimestamp()) + ONE_WEEK * 23n;
        const veCvgLockedPosition = await veCvg.locked(TOKEN_2);

        expect(lockingPosition).to.be.deep.eq([2, 24, 50, amountLockedToken2, expectedMgCvgToken2]);
        expect(endCycle24Timestamp).to.be.eq(veCvgLockedPosition.end);
        expect(await lockingPositionManager.balanceOf(user2)).to.be.eq(1);
        expect(await lockingPositionManager.tokenOfOwnerByIndex(user2, 0)).to.be.eq(TOKEN_2);
    });

    let balanceToken2VeCvgTotal: bigint;
    it("Success : Verifies veCVG TOKEN_2 in CYCLE_2", async () => {
        let veCvgBalance = await veCvg.balanceOf(TOKEN_2);
        const estimatedVeCvg = (((amountLockedToken2 * 50n) / 100n) * 23n) / 97n;
        balanceToken2VeCvgTotal = estimatedVeCvg;
        withinPercentage(veCvgBalance, estimatedVeCvg, 0.2);
    });

    it("Success : Success verifying ysCvg balances equals to totalSupply", async () => {
        await verifyYsSumBalancesEqualsTotalSupply(lockingPositionService, lockingPositionManager, 1, 24);
    });

    it("Success : Success verifying ysShares in the future", async () => {
        const totalSupplyYsCvgTDE1 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        const shareTDE1Token1 = ((await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_12)) * 10n ** 20n) / totalSupplyYsCvgTDE1;
        const shareTDE1Token2 = ((await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_12)) * 10n ** 20n) / totalSupplyYsCvgTDE1;

        withinPercentage(shareTDE1Token1 + shareTDE1Token2, ethers.parseEther("100"), 0.01);
    });

    it("Success : Go to cycle 12", async () => {
        await increaseCvgCycle(contractUsers, 10);
    });

    it("Success : Verify that unlock of 12 is on next cycle in veCVG", async () => {
        const lockedToken1 = await veCvg.locked(TOKEN_1);
        expect(lockedToken1.end).to.be.eq((await cvgRewards.lastUpdatedTimestamp()) + ONE_WEEK);
    });

    it("Success : Verifies veCVG token 1 & 2 in cycle 12", async () => {
        let veCvgBalance1 = await veCvg.connect(user1).balanceOf(TOKEN_1);
        let veCvgBalance2 = await veCvg.connect(user1).balanceOf(TOKEN_2);

        const estimatedVeCvgToken1 = (balanceToken1VeCvgTotal * 1n) / 12n;
        const estimatedVeCvgToken2 = (balanceToken2VeCvgTotal * 13n) / 23n;

        withinPercentage(veCvgBalance1, estimatedVeCvgToken1, 10);
        withinPercentage(veCvgBalance2, estimatedVeCvgToken2, 0.2);
    });

    const amountLockedToken3 = ethers.parseEther("50000");
    it("Success : Mint TOKEN_3 on CYCLE_12", async () => {
        await lockingPositionService.connect(user2).mintPosition(96, amountLockedToken3, 10, user2, true);

        const lockingPosition = await lockingPositionService.lockingPositions(TOKEN_3);
        const expectedMgCvg = (96n * amountLockedToken3 * 90n) / (96n * 100n);
        const endCycle108Timestamp = (await cvgRewards.lastUpdatedTimestamp()) + ONE_WEEK * 97n;
        const veCvgLockedPosition = await veCvg.locked(TOKEN_3);

        expect(lockingPosition).to.be.deep.eq([12, 108, 10, amountLockedToken3, expectedMgCvg]);
        expect(endCycle108Timestamp).to.be.eq(veCvgLockedPosition.end);
        expect(await lockingPositionManager.balanceOf(user2)).to.be.eq(2);
        expect(await lockingPositionManager.tokenOfOwnerByIndex(user2, 1)).to.be.eq(TOKEN_3);
    });

    const usdcDepositedTDE1 = ethers.parseUnits("10000", 6);
    const usdtDepositedTDE1 = ethers.parseUnits("50000", 6);
    it("Success : Distribute coins in Ys for TDE1", async () => {
        const treasuryPdd = users.treasuryPdd;
        await usdc.transfer(treasuryPdd, usdcDepositedTDE1);
        await usdt.transfer(treasuryPdd, usdtDepositedTDE1);

        await usdc.connect(treasuryPdd).approve(ysdistributor, ethers.MaxUint256);
        await usdt.connect(treasuryPdd).approve(ysdistributor, ethers.MaxUint256);

        const depositInYsTx = ysdistributor.connect(treasuryPdd).depositMultipleToken([
            {amount: usdcDepositedTDE1, token: usdc},
            {amount: usdtDepositedTDE1, token: usdt},
        ]);
        await depositInYsTx;

        await expect(depositInYsTx).to.changeTokenBalances(usdc, [treasuryPdd, ysdistributor], [-usdcDepositedTDE1, usdcDepositedTDE1]);
        await expect(depositInYsTx).to.changeTokenBalances(usdt, [treasuryPdd, ysdistributor], [-usdtDepositedTDE1, usdtDepositedTDE1]);
    });

    it("Fails : Claiming on the TDE", async () => {
        await ysdistributor.connect(user1).claimRewards(TOKEN_1, TDE_1, user1).should.be.revertedWith("TDE_NOT_AVAILABLE");
        await ysdistributor.connect(user2).claimRewards(TOKEN_2, TDE_1, user2).should.be.revertedWith("TDE_NOT_AVAILABLE");
    });

    it("Fails : Burning Token 1 because lock not finished", async () => {
        await lockingPositionService.connect(user1).burnPosition(TOKEN_1).should.be.revertedWith("LOCKED");
    });

    it("Success : Go to cycle 13", async () => {
        await increaseCvgCycle(contractUsers, 1);
    });

    /* TDE 2 **/
    it("Success : Success verifying amounts of Ys are distributed properly", async () => {
        const totalSupplyYsCvgTDE1 = await lockingPositionService.totalSupplyYsCvgHistories(CYCLE_12);
        const shareTDE1Token1 = ((await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_12)) * 10n ** 20n) / totalSupplyYsCvgTDE1;
        const shareTDE1Token2 = ((await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_12)) * 10n ** 20n) / totalSupplyYsCvgTDE1;

        const usdcToken1 = (shareTDE1Token1 * usdcDepositedTDE1) / 10n ** 20n;
        const usdtToken1 = (shareTDE1Token1 * usdtDepositedTDE1) / 10n ** 20n;

        const usdcToken2 = (shareTDE1Token2 * usdcDepositedTDE1) / 10n ** 20n;
        const usdtToken2 = (shareTDE1Token2 * usdtDepositedTDE1) / 10n ** 20n;

        const claimToken1Tx = ysdistributor.connect(user1).claimRewards(TOKEN_1, TDE_1, user1);
        const claimToken2Tx = ysdistributor.connect(user2).claimRewards(TOKEN_2, TDE_1, user1);
        await claimToken1Tx;
        await claimToken2Tx;

        await expect(claimToken1Tx).to.changeTokenBalances(usdc, [ysdistributor, user1], [-usdcToken1, usdcToken1]);
        await expect(claimToken1Tx).to.changeTokenBalances(usdt, [ysdistributor, user1], [-usdtToken1, usdtToken1]);

        await expect(claimToken2Tx).to.changeTokenBalances(usdc, [ysdistributor, user1], [-usdcToken2, usdcToken2]);
        await expect(claimToken2Tx).to.changeTokenBalances(usdt, [ysdistributor, user1], [-usdtToken2, usdtToken2]);
    });

    it("Success : Burn the token in cycle 13", async () => {
        const burnPositionTx = lockingPositionService.connect(user1).burnPosition(TOKEN_1);
        await burnPositionTx;

        await expect(burnPositionTx).to.changeTokenBalances(cvgContract, [lockingPositionService, user1], [-amountLockedToken1, amountLockedToken1]);
        expect(await lockingPositionManager.totalSupply()).to.be.eq(2);
        expect(await lockingPositionManager.balanceOf(user1)).to.be.eq(0);
    });

    it("Success : Success verifying ysCvg balances equals to totalSupply", async () => {
        await verifyYsSumBalancesEqualsTotalSupply(lockingPositionService, lockingPositionManager, 1, 108);
    });

    it("Success : Go on next week without cvgCyclePassage", async () => {
        await goOnNextWeek();
        const now = await getActualBlockTimeStamp();
        expect(now).to.be.eq((await cvgRewards.lastUpdatedTimestamp()) + ONE_WEEK);

        expect(await cvgRewards.getCycleLocking(now)).to.be.eq(14);
    });

    const amountLockedToken4 = 100n;
    const expectedMgCvgToken4 = (82n * amountLockedToken4 * 40n) / (96n * 100n);

    it("Success : Mint TOKEN_4 on CYCLE_14 in time bu CYCLE_13 in CVG, cycle 14 taken", async () => {
        const mintTx = lockingPositionService.connect(user2).mintPosition(82, amountLockedToken4, 60, user1, true);
        await mintTx;

        const lockingPosition = await lockingPositionService.lockingPositions(TOKEN_4);
        const endCycle96Timestamp = (await cvgRewards.lastUpdatedTimestamp()) + ONE_WEEK + ONE_WEEK * 83n;
        const veCvgLockedPosition = await veCvg.locked(TOKEN_4);

        expect(lockingPosition).to.be.deep.eq([14, 96, 60, amountLockedToken4, expectedMgCvgToken4]);
        expect(endCycle96Timestamp).to.be.eq(veCvgLockedPosition.end);
        expect(await lockingPositionManager.balanceOf(user1)).to.be.eq(1);
        expect(await lockingPositionManager.tokenOfOwnerByIndex(user1, 0)).to.be.eq(TOKEN_4);
    });

    it("Success : Success verifying ysCvg balances equals to totalSupply", async () => {
        await verifyYsSumBalancesEqualsTotalSupply(lockingPositionService, lockingPositionManager, 1, 108);
    });

    it("Success : Pass the CVG cycle to CYCLE_14", async () => {
        await increaseCvgCycleWithoutTime(contractUsers, 1);
        expect(await controlTowerContract.cvgCycle()).to.be.eq(14);
        expect(await cvgRewards.getCycleLocking(await getActualBlockTimeStamp())).to.be.eq(14);
    });

    it("Success : Go to cycle 24", async () => {
        await increaseCvgCycle(contractUsers, 10);
        expect(await controlTowerContract.cvgCycle()).to.be.eq(24);
        expect(await cvgRewards.getCycleLocking(await getActualBlockTimeStamp())).to.be.eq(24);
    });

    const amountCvgAddExtension1Token2 = ethers.parseEther("20000");
    it("Success : Increase Time & Amount TOKEN_2 on CYCLE_24", async () => {
        const increaseTimeAndAmountTx = lockingPositionService
            .connect(user2)
            .increaseLockTimeAndAmount(TOKEN_2, 12, amountCvgAddExtension1Token2, ethers.ZeroAddress);
        await increaseTimeAndAmountTx;

        const lockingPosition = await lockingPositionService.lockingPositions(TOKEN_2);
        const endCycle120Timestamp = (await cvgRewards.lastUpdatedTimestamp()) + ONE_WEEK * 13n;
        const veCvgLockedPosition = await veCvg.locked(TOKEN_2);

        expect(endCycle120Timestamp).to.be.eq(veCvgLockedPosition.end);
        expect(lockingPosition).to.be.deep.eq([
            2,
            36,
            50,
            amountLockedToken2 + amountCvgAddExtension1Token2,
            expectedMgCvgToken2 + (amountCvgAddExtension1Token2 * 12n * 50n) / (96n * 100n),
        ]);

        expect(increaseTimeAndAmountTx).to.changeTokenBalances(
            cvgContract,
            [user2, lockingPositionService],
            [-amountCvgAddExtension1Token2, amountCvgAddExtension1Token2]
        );
    });

    const usdcDepositedTDE2 = ethers.parseUnits("200000", 6);
    const usdtDepositedTDE2 = ethers.parseUnits("50000", 6);
    const wethDepositedTDE2 = ethers.parseEther("500");

    it("Success : Distribute coins in Ys for TDE2", async () => {
        const treasuryPdd = users.treasuryPdd;
        await usdc.transfer(treasuryPdd, usdcDepositedTDE2);
        await usdt.transfer(treasuryPdd, usdtDepositedTDE2);
        await weth.transfer(treasuryPdd, wethDepositedTDE2);

        await weth.connect(treasuryPdd).approve(ysdistributor, ethers.MaxUint256);
        let depositInYsTx = ysdistributor.connect(treasuryPdd).depositMultipleToken([
            {amount: usdcDepositedTDE2 / 2n, token: usdc},
            {amount: usdtDepositedTDE2 / 2n, token: usdt},
            {amount: wethDepositedTDE2 / 2n, token: weth},
        ]);
        await depositInYsTx;

        await expect(depositInYsTx).to.changeTokenBalances(usdc, [treasuryPdd, ysdistributor], [-usdcDepositedTDE2 / 2n, usdcDepositedTDE2 / 2n]);
        await expect(depositInYsTx).to.changeTokenBalances(usdt, [treasuryPdd, ysdistributor], [-usdtDepositedTDE2 / 2n, usdtDepositedTDE2 / 2n]);
        await expect(depositInYsTx).to.changeTokenBalances(weth, [treasuryPdd, ysdistributor], [-wethDepositedTDE2 / 2n, wethDepositedTDE2 / 2n]);
        expect(await ysdistributor.depositedTokens(2, 0)).to.be.deep.eq([await usdc.getAddress(), usdcDepositedTDE2 / 2n]);
        expect(await ysdistributor.depositedTokens(2, 1)).to.be.deep.eq([await usdt.getAddress(), usdtDepositedTDE2 / 2n]);
        expect(await ysdistributor.depositedTokens(2, 2)).to.be.deep.eq([await weth.getAddress(), wethDepositedTDE2 / 2n]);
    });

    it("Success : Distribute a second time coins in Ys for TDE2", async () => {
        const treasuryPdd = users.treasuryPdd;

        let depositInYsTx = ysdistributor.connect(treasuryPdd).depositMultipleToken([
            {amount: usdcDepositedTDE2 / 2n, token: usdc},
            {amount: usdtDepositedTDE2 / 2n, token: usdt},
            {amount: wethDepositedTDE2 / 2n, token: weth},
        ]);
        await depositInYsTx;

        await expect(depositInYsTx).to.changeTokenBalances(usdc, [treasuryPdd, ysdistributor], [-usdcDepositedTDE2 / 2n, usdcDepositedTDE2 / 2n]);
        await expect(depositInYsTx).to.changeTokenBalances(usdt, [treasuryPdd, ysdistributor], [-usdtDepositedTDE2 / 2n, usdtDepositedTDE2 / 2n]);
        await expect(depositInYsTx).to.changeTokenBalances(weth, [treasuryPdd, ysdistributor], [-wethDepositedTDE2 / 2n, wethDepositedTDE2 / 2n]);

        expect(await ysdistributor.depositedTokens(2, 0)).to.be.deep.eq([await usdc.getAddress(), usdcDepositedTDE2]);
        expect(await ysdistributor.depositedTokens(2, 1)).to.be.deep.eq([await usdt.getAddress(), usdtDepositedTDE2]);
        expect(await ysdistributor.depositedTokens(2, 2)).to.be.deep.eq([await weth.getAddress(), wethDepositedTDE2]);
    });

    it("Fails : Try to burn several tokens with locking not finished", async () => {
        await lockingPositionService.connect(user1).burnPosition(TOKEN_1).should.be.revertedWith("ERC721: invalid token ID");
        await lockingPositionService.connect(user2).burnPosition(TOKEN_2).should.be.revertedWith("LOCKED");
        await lockingPositionService.connect(user2).burnPosition(TOKEN_3).should.be.revertedWith("LOCKED");
        await lockingPositionService.connect(user1).burnPosition(TOKEN_4).should.be.revertedWith("LOCKED");
    });

    it("Success : Success verifying ysShares in the future", async () => {
        const totalSupplyYsCvgTDE2 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24);
        const shareTDE2Token1 = ((await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_24)) * 10n ** 20n) / totalSupplyYsCvgTDE2;
        const shareTDE2Token2 = ((await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_24)) * 10n ** 20n) / totalSupplyYsCvgTDE2;
        const shareTDE2Token3 = ((await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_24)) * 10n ** 20n) / totalSupplyYsCvgTDE2;
        const shareTDE2Token4 = ((await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_24)) * 10n ** 20n) / totalSupplyYsCvgTDE2;

        withinPercentage(shareTDE2Token1 + shareTDE2Token2 + shareTDE2Token3 + shareTDE2Token4, ethers.parseEther("100"), 0.01);
    });

    it("Success : Go to cycle 25", async () => {
        await increaseCvgCycle(contractUsers, 1);
        expect(await controlTowerContract.cvgCycle()).to.be.eq(25);
        expect(await cvgRewards.getCycleLocking(await getActualBlockTimeStamp())).to.be.eq(25);
    });

    /* TDE 3 **/
    it("Success : Success verifying amounts distributed by claim", async () => {
        const totalSupplyYsCvgTDE2 = await lockingPositionService.totalSupplyYsCvgHistories(CYCLE_24);
        const balanceToken2 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_24);
        const balanceToken3 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_24);

        const usdcToken2 = (balanceToken2 * usdcDepositedTDE2) / totalSupplyYsCvgTDE2;
        const usdtToken2 = (balanceToken2 * usdtDepositedTDE2) / totalSupplyYsCvgTDE2;
        const wethToken2 = (balanceToken2 * wethDepositedTDE2) / totalSupplyYsCvgTDE2;

        const usdcToken3 = (balanceToken3 * usdcDepositedTDE2) / totalSupplyYsCvgTDE2;
        const usdtToken3 = (balanceToken3 * usdtDepositedTDE2) / totalSupplyYsCvgTDE2;
        const wethToken3 = (balanceToken3 * wethDepositedTDE2) / totalSupplyYsCvgTDE2;
        // Token is burnt
        await ysdistributor.connect(user1).claimRewards(TOKEN_1, TDE_2, user1).should.be.revertedWith("ERC721: invalid token ID");

        expect(await ysdistributor.rewardsClaimedForToken(TOKEN_2, TDE_2)).to.be.false;
        expect(await ysdistributor.rewardsClaimedForToken(TOKEN_3, TDE_2)).to.be.false;

        const claimToken2Tx = ysdistributor.connect(user2).claimRewards(TOKEN_2, TDE_2, user2);
        const claimToken3Tx = ysdistributor.connect(user2).claimRewards(TOKEN_3, TDE_2, user2);

        await claimToken2Tx;
        await claimToken3Tx;

        await expect(claimToken2Tx).to.changeTokenBalances(usdc, [ysdistributor, user2], [-usdcToken2, usdcToken2]);
        await expect(claimToken2Tx).to.changeTokenBalances(usdt, [ysdistributor, user2], [-usdtToken2, usdtToken2]);
        await expect(claimToken2Tx).to.changeTokenBalances(weth, [ysdistributor, user2], [-wethToken2, wethToken2]);

        await expect(claimToken3Tx).to.changeTokenBalances(usdc, [ysdistributor, user2], [-usdcToken3, usdcToken3]);
        await expect(claimToken3Tx).to.changeTokenBalances(usdt, [ysdistributor, user2], [-usdtToken3, usdtToken3]);
        await expect(claimToken3Tx).to.changeTokenBalances(weth, [ysdistributor, user2], [-wethToken3, wethToken3]);

        expect(await ysdistributor.rewardsClaimedForToken(TOKEN_2, TDE_2)).to.be.true;
        expect(await ysdistributor.rewardsClaimedForToken(TOKEN_3, TDE_2)).to.be.true;

        await expect(claimToken3Tx).to.changeTokenBalances(weth, [ysdistributor, user2], [-wethToken3, wethToken3]);

        const viewReturn = await ysdistributor.getPositionRewardsForTdes([TDE_2], 25, TOKEN_2);
        const tde2Token2 = viewReturn[0];

        expect(await ysdistributor.getPositionRewardsForTdes([TDE_2], 25, TOKEN_2)).to.be.deep.eq([
            [
                TDE_2,

                true,
                [
                    [await usdc.getAddress(), usdcToken2],
                    [await usdt.getAddress(), usdtToken2],
                    [await weth.getAddress(), wethToken2],
                ],
            ],
        ]);
    });

    it("Success : Success verifying ysCvg balances equals to totalSupply", async () => {
        await verifyYsSumBalancesEqualsTotalSupply(lockingPositionService, lockingPositionManager, 2, 121);
        await verifyYsSumBalancesEqualsTotalSupplyHistory(lockingPositionService, lockingPositionManager, 1, 24);
    });

    it("Success : Go to cycle 36", async () => {
        await increaseCvgCycle(contractUsers, 11);
        expect(await controlTowerContract.cvgCycle()).to.be.eq(36);
        expect(await cvgRewards.getCycleLocking(await getActualBlockTimeStamp())).to.be.eq(36);
    });

    it("Success : Try to burn token still locked", async () => {
        await lockingPositionService.connect(user2).burnPosition(TOKEN_2).should.be.revertedWith("LOCKED");
    });

    it("Success : Go to cycle 37", async () => {
        await increaseCvgCycle(contractUsers, 1);
        expect(await controlTowerContract.cvgCycle()).to.be.eq(37);
        expect(await cvgRewards.getCycleLocking(await getActualBlockTimeStamp())).to.be.eq(37);
    });

    it("Success : Burn the TOKEN_2 in CYCLE_37", async () => {
        const burnPositionTx = lockingPositionService.connect(user2).burnPosition(TOKEN_2);
        await burnPositionTx;

        await expect(burnPositionTx).to.changeTokenBalances(
            cvgContract,
            [lockingPositionService, user2],
            [-(amountLockedToken2 + amountCvgAddExtension1Token2), amountLockedToken2 + amountCvgAddExtension1Token2]
        );
        expect(await lockingPositionManager.totalSupply()).to.be.eq(2);
        expect(await lockingPositionManager.balanceOf(user2)).to.be.eq(1);
    });

    it("Success : Do several increase Amount on token that left", async () => {
        for (let index = 0; index < 40; index++) {
            await lockingPositionService.connect(user2).increaseLockAmount(TOKEN_3, ethers.parseEther("100"), ethers.ZeroAddress);
        }
        for (let index = 0; index < 40; index++) {
            await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_4, 20, ethers.ZeroAddress);
        }
        await lockingPositionService.connect(user1).increaseLockTimeAndAmount(TOKEN_4, 12, 20, ethers.ZeroAddress);
    });

    it("Success : Success verifying ysCvg balances equals to totalSupply", async () => {
        await verifyYsSumBalancesEqualsTotalSupply(lockingPositionService, lockingPositionManager, 2, 121);
        await verifyYsSumBalancesEqualsTotalSupplyHistory(lockingPositionService, lockingPositionManager, 1, 36);
    });

    it("Success : Go to cycle 108", async () => {
        await increaseCvgCycle(contractUsers, 71);
        expect(await controlTowerContract.cvgCycle()).to.be.eq(108);
        expect(await cvgRewards.getCycleLocking(await getActualBlockTimeStamp())).to.be.eq(108);
    });

    it("Success : Verify that veCVG total & balances are 0", async () => {
        expect(await veCvg.total_supply()).to.be.gt(0);
        await verifyVeSumBalancesEqualsTotalSupply(veCvg, lockingPositionManager);
    });

    it("Fails : Try to burn TOKEN_3 & TOKEN_4 still locked", async () => {
        await lockingPositionService.connect(user2).burnPosition(TOKEN_3).should.be.revertedWith("LOCKED");
        await lockingPositionService.connect(user1).burnPosition(TOKEN_4).should.be.revertedWith("LOCKED");
    });

    it("Success : Go to cycle 109", async () => {
        await increaseCvgCycle(contractUsers, 1);
        expect(await controlTowerContract.cvgCycle()).to.be.eq(109);
        expect(await cvgRewards.getCycleLocking(await getActualBlockTimeStamp())).to.be.eq(109);
    });

    it("Success : Burn the TOKEN_3 in CYCLE_109", async () => {
        const burnPositionTx = lockingPositionService.connect(user2).burnPosition(TOKEN_3);
        await burnPositionTx;

        await expect(burnPositionTx).to.changeTokenBalances(
            cvgContract,
            [lockingPositionService, user2],
            [-54000000000000000000000n, 54000000000000000000000n]
        );
        expect(await lockingPositionManager.totalSupply()).to.be.eq(1);
        expect(await lockingPositionManager.balanceOf(user2)).to.be.eq(0);
    });

    it("Success : Burn the TOKEN_4 in CYCLE_109", async () => {
        const burnPositionTx = lockingPositionService.connect(user1).burnPosition(TOKEN_4);
        await burnPositionTx;

        await expect(burnPositionTx).to.changeTokenBalances(cvgContract, [lockingPositionService, user1], [-920, 920]);
        expect(await lockingPositionManager.totalSupply()).to.be.eq(0);
        expect(await lockingPositionManager.balanceOf(user1)).to.be.eq(0);
    });

    it("Success : Verify that veCVG total & balances are 0", async () => {
        expect(await veCvg.total_supply()).to.be.eq(0);
        await verifyVeSumBalancesEqualsTotalSupply(veCvg, lockingPositionManager);
    });
});
