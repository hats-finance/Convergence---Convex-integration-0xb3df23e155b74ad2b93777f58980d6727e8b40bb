import {expect} from "chai";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {LOCKING_POSITIONS} from "./config/lockingTestConfig";
import {EventLog, Signer, ZeroAddress} from "ethers";
import {ethers} from "hardhat";
import {LockingPositionService, Cvg, CvgControlTower, YsDistributor} from "../../../typechain-types";
import {IContractsUser, IContracts, IUsers} from "../../../utils/contractInterface";
import {CYCLE_12, CYCLE_24, CYCLE_36, CYCLE_48, CYCLE_5, CYCLE_60, CYCLE_9, TDE_6, TOKEN_1} from "../../../resources/constant";

describe("LockingPositionManager  / increaseLock amount", () => {
    let lockingPositionService: LockingPositionService, cvgContract: Cvg, controlTowerContract: CvgControlTower, ysdistributor: YsDistributor;
    let contractUsers: IContractsUser, contracts: IContracts, users: IUsers;
    let user1: Signer, user2: Signer;

    before(async () => {
        contractUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractUsers.contracts;
        users = contractUsers.users;

        lockingPositionService = contracts.locking.lockingPositionService;

        cvgContract = contracts.tokens.cvg;
        controlTowerContract = contracts.base.cvgControlTower;
        ysdistributor = contracts.rewards.ysDistributor;
        user1 = users.user1;
        user2 = users.user2;

        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();
    });

    it("increase staking cycle to 5", async () => {
        await increaseCvgCycle(contractUsers, 4);
        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(5);
    });

    it("fails create lock position when is greater than MAX", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, LOCKING_POSITIONS[0].cvgAmount)).wait();
        const txFail = lockingPositionService.connect(user1).mintPosition(103, LOCKING_POSITIONS[0].cvgAmount, 100, user1, true);

        await expect(txFail).to.be.revertedWith("MAX_LOCK_96_CYCLES");
    });

    it("fails create lock position when amount locked is equal to 0", async () => {
        const txFail = lockingPositionService.connect(user1).mintPosition(LOCKING_POSITIONS[0].duration, 0, 100, user1, true);

        await expect(txFail).to.be.revertedWith("LTE");
    });

    it("fails create lock position when endLock is not on a TDE event cycle", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, LOCKING_POSITIONS[0].cvgAmount)).wait();
        const txFail = lockingPositionService.connect(user1).mintPosition(15, LOCKING_POSITIONS[0].cvgAmount, 100, user1, true);

        await expect(txFail).to.be.revertedWith("END_MUST_BE_TDE_MULTIPLE");
    });

    it("fails create lock position more than MAX", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, LOCKING_POSITIONS[0].cvgAmount)).wait();
        const txFail = lockingPositionService.connect(user1).mintPosition(103, LOCKING_POSITIONS[0].cvgAmount, 100, user1, true); // Lock 100 CVG for 43 cycles

        await expect(txFail).to.be.revertedWith("MAX_LOCK_96_CYCLES");
    });

    it("fails updateYsCvgTotalSupply when not called by Control Tower", async () => {
        const txFail = lockingPositionService.connect(user1).updateYsTotalSupply(); // Lock 100 CVG for 43 cycles

        await expect(txFail).to.be.revertedWith("NOT_CVG_REWARDS");
    });

    it("mint position 1 at cycle 5", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, LOCKING_POSITIONS[0].cvgAmount)).wait();
        await (
            await lockingPositionService.connect(user1).mintPosition(LOCKING_POSITIONS[0].duration, LOCKING_POSITIONS[0].cvgAmount, 100, user1, false)
        ).wait(); // Lock 100 CVG for 43 cycles

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_5);
        expect(totalSupplyYsCvg).to.be.eq(0);

        const token1Position = await lockingPositionService.lockingPositions(1);
        expect(token1Position.startCycle).to.be.eq(LOCKING_POSITIONS[0].lockCycle);
        expect(token1Position.lastEndCycle).to.be.eq(48);
        expect(token1Position.totalCvgLocked).to.be.eq(LOCKING_POSITIONS[0].cvgAmount);
        expect(token1Position.mgCvgAmount).to.be.eq("0");
    });

    it("increase staking cycle to 9", async () => {
        await increaseCvgCycle(contractUsers, 4);
        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(9);

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg).to.be.eq("26128472222222222222");
    });

    it("Fails increase lock amount at cycle 9 with amount of 0", async () => {
        const txFail = lockingPositionService.connect(user1).increaseLockAmount(TOKEN_1, 0, ZeroAddress);
        await expect(txFail).to.be.revertedWith("LTE");
    });

    it("Mints position 2 at cycle 9 with 0% in ysCVG", async () => {
        await (await cvgContract.connect(user2).approve(lockingPositionService, LOCKING_POSITIONS[1].cvgAmount)).wait();
        await (await lockingPositionService.connect(user2).mintPosition(LOCKING_POSITIONS[1].duration, LOCKING_POSITIONS[1].cvgAmount, 0, user2, true)).wait();

        const token2Position = await lockingPositionService.lockingPositions(2);
        expect(token2Position.startCycle).to.be.eq(LOCKING_POSITIONS[1].lockCycle);
        expect(token2Position.lastEndCycle).to.be.eq(48);
        expect(token2Position.totalCvgLocked).to.be.eq(LOCKING_POSITIONS[1].cvgAmount);
        expect(token2Position.mgCvgAmount).to.be.eq("40625000000000000000");
    });

    it("success increase lock amount at cycle 9", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, ethers.parseEther("100"))).wait();

        const txIncrease = await (await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_1, ethers.parseEther("100"), ZeroAddress)).wait();

        const token1Position = await lockingPositionService.lockingPositions(1);
        expect(token1Position.totalCvgLocked).to.be.eq(ethers.parseEther("200"));
    });

    it("increase staking cycle to 12", async () => {
        await increaseCvgCycle(contractUsers, 3);
        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(12);

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg).to.be.eq("36284722222222222222");
    });

    it("success increase lock amount at cycle 12", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, LOCKING_POSITIONS[2].cvgAmount)).wait();

        const txIncrease = await (await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_1, LOCKING_POSITIONS[2].cvgAmount, ZeroAddress)).wait();

        const token1Position = await lockingPositionService.lockingPositions(1);
        expect(token1Position.totalCvgLocked).to.be.eq(LOCKING_POSITIONS[0].cvgAmount + LOCKING_POSITIONS[1].cvgAmount + LOCKING_POSITIONS[2].cvgAmount);
    });

    it("increase staking cycle to 13", async () => {
        await increaseCvgCycle(contractUsers, 1);
        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(13);

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24);
        expect(totalSupplyYsCvg).to.be.eq("104166666666666666666");
    });

    it("success trigger rewards for token 1 on TDE 1", async () => {
        const txSuccess = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 1, user1)).wait();
    });

    it("increase staking cycle to 27", async () => {
        await increaseCvgCycle(contractUsers, 14);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(27);

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36);
        expect(totalSupplyYsCvg).to.be.eq("104166666666666666666");
    });

    it("success trigger rewards for token 1 on TDE 2", async () => {
        const txSuccess = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 2, user1)).wait();
    });

    it("success increase lock amount at cycle 27", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, LOCKING_POSITIONS[3].cvgAmount)).wait();

        const txIncrease = await (await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_1, LOCKING_POSITIONS[3].cvgAmount, ZeroAddress)).wait();

        const token1Position = await lockingPositionService.lockingPositions(TOKEN_1);
        expect(token1Position.totalCvgLocked).to.be.eq(
            LOCKING_POSITIONS[0].cvgAmount + LOCKING_POSITIONS[1].cvgAmount + LOCKING_POSITIONS[3].cvgAmount + LOCKING_POSITIONS[2].cvgAmount
        );
    });

    it("increase staking cycle to 41", async () => {
        await increaseCvgCycle(contractUsers, 14);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(41);

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48);
        expect(totalSupplyYsCvg).to.be.eq("120572916666666666666");
    });

    it("success trigger rewards for token 1 on TDE 3", async () => {
        const txSuccess = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 3, user1)).wait();
    });

    it("fails increase lock amount when NFT not owned", async () => {
        await (await cvgContract.connect(user2).approve(lockingPositionService, LOCKING_POSITIONS[4].cvgAmount)).wait();

        const txFail = lockingPositionService.connect(user2).increaseLockAmount(TOKEN_1, LOCKING_POSITIONS[4].cvgAmount, ZeroAddress);
        await expect(txFail).to.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("success increase lock amount at cycle 41", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, LOCKING_POSITIONS[4].cvgAmount)).wait();

        const txIncrease = await (await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_1, LOCKING_POSITIONS[4].cvgAmount, ZeroAddress)).wait();

        const token1Position = await lockingPositionService.lockingPositions(1);
        expect(token1Position.totalCvgLocked).to.be.eq(
            LOCKING_POSITIONS[0].cvgAmount +
                LOCKING_POSITIONS[1].cvgAmount +
                LOCKING_POSITIONS[3].cvgAmount +
                LOCKING_POSITIONS[2].cvgAmount +
                LOCKING_POSITIONS[4].cvgAmount
        );
    });

    it("increase staking cycle to 42", async () => {
        await increaseCvgCycle(contractUsers, 1);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(42);

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48);
        expect(totalSupplyYsCvg).to.be.eq("124826388888888888888");
    });

    it("increase staking cycle to 48 and fail to increase amount but success augment time", async () => {
        await increaseCvgCycle(contractUsers, 6);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(48);

        await (await cvgContract.connect(user1).approve(lockingPositionService, LOCKING_POSITIONS[3].cvgAmount)).wait();
        const txFail = lockingPositionService.connect(user1).increaseLockAmount(TOKEN_1, LOCKING_POSITIONS[3].cvgAmount, ZeroAddress);
        await expect(txFail).to.be.revertedWith("LOCK_OVER");

        await lockingPositionService.connect(user1).increaseLockTime(1, 12);

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48);
        expect(totalSupplyYsCvg).to.be.eq("124826388888888888888");
    });

    it("increase staking cycle to 49", async () => {
        await increaseCvgCycle(contractUsers, 1);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(49);

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60);
        expect(totalSupplyYsCvg).to.be.eq("124826388888888888888");
    });

    it("success trigger rewards for token 1 on TDE 4", async () => {
        const txSuccess = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 4, user1)).wait();
    });

    it("increase staking cycle to 61", async () => {
        await increaseCvgCycle(contractUsers, 12);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(61);

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(61);
        expect(totalSupplyYsCvg).to.be.eq(0);
    });

    it("fails claiming because no lock are active on Convergence", async () => {
        const txFail = ysdistributor.connect(user1).claimRewards(TOKEN_1, TDE_6, user1);
        await expect(txFail).to.be.revertedWith("TDE_NOT_AVAILABLE");
    });
});
