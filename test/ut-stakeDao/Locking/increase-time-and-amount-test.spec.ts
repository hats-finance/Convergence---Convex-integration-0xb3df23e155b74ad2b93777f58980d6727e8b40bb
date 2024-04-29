import {expect} from "chai";
import {zeroAddress} from "@nomicfoundation/ethereumjs-util";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {Signer} from "ethers";
import {ethers} from "hardhat";
import {LockingPositionService, Cvg, CvgControlTower, YsDistributor, LockingPositionManager} from "../../../typechain-types";
import {IContractsUser, IContracts, IUsers} from "../../../utils/contractInterface";
import {CYCLE_11, CYCLE_12, CYCLE_24, CYCLE_36, CYCLE_48, CYCLE_60, CYCLE_72, CYCLE_8, TOKEN_1} from "../../../resources/constant";
import {verifyYsSumBalancesEqualsTotalSupply} from "../../../utils/locking/invariants.checks";

describe("LockingPositionManager / increaseLock time & amount", () => {
    let lockingPositionService: LockingPositionService,
        cvgContract: Cvg,
        controlTowerContract: CvgControlTower,
        ysdistributor: YsDistributor,
        lockiPositionManager: LockingPositionManager;
    let contractUsers: IContractsUser, contracts: IContracts, users: IUsers;
    let user1: Signer, user2: Signer;

    before(async () => {
        contractUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractUsers.contracts;
        users = contractUsers.users;

        lockingPositionService = contracts.locking.lockingPositionService;
        lockiPositionManager = contracts.locking.lockingPositionManager;

        cvgContract = contracts.tokens.cvg;
        controlTowerContract = contracts.base.cvgControlTower;
        ysdistributor = contracts.rewards.ysDistributor;
        user1 = users.user1;
        user2 = users.user2;

        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();
    });

    it("Success : increase staking cycle to 2", async () => {
        await increaseCvgCycle(contractUsers, 1);
        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(2);
    });

    it("Success : MINT token 1 10 - 10 cycles with 10k CVG", async () => {
        const balanceOfMgCvgBefore = await lockingPositionService.balanceOfMgCvg(1);
        expect(balanceOfMgCvgBefore).to.be.eq("0");

        await (await cvgContract.connect(user1).approve(lockingPositionService, ethers.parseEther("10000"))).wait();
        await lockingPositionService.connect(user1).mintPosition(10, ethers.parseEther("10000"), 40, user1, true);

        const balanceOfMgCvgAfter = await lockingPositionService.balanceOfMgCvg(1);
        expect(balanceOfMgCvgAfter).to.be.eq("625000000000000000000");

        const token1Position = await lockingPositionService.lockingPositions(1);
        expect(token1Position.startCycle).to.be.eq(2);
        expect(token1Position.lastEndCycle).to.be.eq(12);
        expect(token1Position.totalCvgLocked).to.be.eq(ethers.parseEther("10000"));
        expect(token1Position.mgCvgAmount).to.be.eq("625000000000000000000"); // 625 mgCvg
        expect(token1Position.ysPercentage).to.be.eq(40);

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(2);
        expect(totalSupplyYsCvg).to.be.eq("0");

        const ysCvgBalance1 = await lockingPositionService.balanceOfYsCvgAt(1, 1);
        expect(ysCvgBalance1).to.be.eq(0);

        const totalSupplyOfYsCvgAt1 = await lockingPositionService.totalSupplyOfYsCvgAt(1);
        expect(totalSupplyOfYsCvgAt1).to.be.eq(0);

        const ysCvgBalance2 = await lockingPositionService.balanceOfYsCvgAt(1, 2);
        expect(ysCvgBalance2).to.be.eq(0);

        const totalSupplyOfYsCvgAt2 = await lockingPositionService.totalSupplyOfYsCvgAt(2);
        expect(totalSupplyOfYsCvgAt2).to.be.eq(0);

        const totalSupplyOfYsCvgAt3 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyOfYsCvgAt3).to.be.eq("347222222222222222222");

        const ysCvgBalance3 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_12);
        expect(ysCvgBalance3).to.be.eq("347222222222222222222");
    });

    it("Fails : Tries to increase for 0 cycle", async () => {
        const txFail = lockingPositionService.connect(user1).increaseLockTimeAndAmount(TOKEN_1, 0, ethers.parseEther("100"), ethers.ZeroAddress);
        await expect(txFail).to.be.revertedWith("LOCK_DURATION_ZERO");
    });

    it("Success : Increase staking cycle to 8 and INCREASE_AMOUNT on TOKEN 1", async () => {
        await increaseCvgCycle(contractUsers, 6);
        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(8);

        const totalSupplyOfYsCvgAt3 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyOfYsCvgAt3).to.be.eq("347222222222222222222");

        const balanceOfMgCvgBefore = await lockingPositionService.balanceOfMgCvg(1);
        expect(balanceOfMgCvgBefore).to.be.eq("625000000000000000000");

        await (await cvgContract.connect(user1).approve(lockingPositionService, ethers.parseEther("10000"))).wait();
        await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_1, ethers.parseEther("10000"), zeroAddress());

        const balanceOfMgCvgAfter = await lockingPositionService.balanceOfMgCvg(1);
        expect(balanceOfMgCvgAfter).to.be.eq("875000000000000000000");

        const token1Position = await lockingPositionService.lockingPositions(1);
        expect(token1Position.startCycle).to.be.eq(2);
        expect(token1Position.lastEndCycle).to.be.eq(12);
        expect(token1Position.totalCvgLocked).to.be.eq(ethers.parseEther("20000"));
        expect(token1Position.mgCvgAmount).to.be.eq("875000000000000000000"); // 625 + 250 mgCvg
        expect(token1Position.ysPercentage).to.be.eq(40);

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg).to.be.eq("402777777777777777777");

        const totalSupplyOfYsCvgAt24 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24);
        expect(totalSupplyOfYsCvgAt24).to.be.eq("0");

        const totalSupplyOfYsCvgAt36 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36);
        expect(totalSupplyOfYsCvgAt36).to.be.eq("0");

        const ysCvgBalance12 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_12);
        expect(ysCvgBalance12).to.be.eq("402777777777777777777");

        const ysCvgBalance24 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_24);
        expect(ysCvgBalance24).to.be.eq("0");

        const ysCvgBalance36 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_36);
        expect(ysCvgBalance36).to.be.eq("0");
    });

    it("Success : Increase staking cycle to 11 and INCREASE_TIME_AMOUNT on TOKEN 1", async () => {
        await increaseCvgCycle(contractUsers, 3);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(11);

        const balanceOfMgCvgBefore = await lockingPositionService.balanceOfMgCvg(1);
        expect(balanceOfMgCvgBefore).to.be.eq("875000000000000000000");

        await (await cvgContract.connect(user1).approve(lockingPositionService, ethers.parseEther("10000"))).wait();
        await lockingPositionService.connect(user1).increaseLockTimeAndAmount(1, 48, ethers.parseEther("10000"), zeroAddress());

        const balanceOfMgCvgAfter = await lockingPositionService.balanceOfMgCvg(1);
        expect(balanceOfMgCvgAfter).to.be.eq("3937500000000000000000");

        const token1Position = await lockingPositionService.lockingPositions(1);
        expect(token1Position.startCycle).to.be.eq(2);
        expect(token1Position.lastEndCycle).to.be.eq(60);
        expect(token1Position.totalCvgLocked).to.be.eq(ethers.parseEther("30000"));
        expect(token1Position.mgCvgAmount).to.be.eq("3937500000000000000000"); // 875 + 3062.5  mgCvg = 3937.5 mgCvg
        expect(token1Position.ysPercentage).to.be.eq(40);

        const totalSupplyOfYsCvgAt11 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyOfYsCvgAt11).to.be.eq("572916666666666666665");

        const totalSupplyOfYsCvgAt24 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24);
        expect(totalSupplyOfYsCvgAt24).to.be.eq("2444444444444444444443");

        const totalSupplyOfYsCvgAt36 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36);
        expect(totalSupplyOfYsCvgAt36).to.be.eq("2444444444444444444443");

        const totalSupplyOfYsCvgAt48 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48);
        expect(totalSupplyOfYsCvgAt48).to.be.eq("2444444444444444444443");

        const totalSupplyOfYsCvgAt60 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60);
        expect(totalSupplyOfYsCvgAt60).to.be.eq("2444444444444444444443");

        const totalSupplyOfYsCvgAt72 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72);
        expect(totalSupplyOfYsCvgAt72).to.be.eq("0");

        const ysCvgBalance12 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_12);
        expect(ysCvgBalance12).to.be.eq("572916666666666666665");

        const ysCvgBalance13 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_24);
        expect(ysCvgBalance13).to.be.eq("2444444444444444444443");

        const ysCvgBalance36 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_36);
        expect(ysCvgBalance36).to.be.eq("2444444444444444444443");

        const ysCvgBalance48 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_48);
        expect(ysCvgBalance48).to.be.eq("2444444444444444444443");

        const ysCvgBalance60 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_60);
        expect(ysCvgBalance60).to.be.eq("2444444444444444444443");

        const ysCvgBalance72 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_72);
        expect(ysCvgBalance72).to.be.eq("0");
    });

    it("Success : Check ysCVG balance on cycles", async () => {
        await verifyYsSumBalancesEqualsTotalSupply(lockingPositionService, lockiPositionManager, 1, 61);
    });

    it("Success : Check mgCvg balance ", async () => {
        const balanceOfMgCvgAt11 = await lockingPositionService.balanceOfMgCvg(TOKEN_1);
        expect(balanceOfMgCvgAt11).to.be.eq("3937500000000000000000");
    });

    it("Success : Mints position 2 at cycle 11 and increase lock time and amount (100% ysCVG)", async () => {
        // mint
        await (await cvgContract.connect(user1).approve(lockingPositionService, ethers.parseEther("1000"))).wait();
        await lockingPositionService.connect(user1).mintPosition(13, ethers.parseEther("1000"), 100, user1, true);

        let balanceOfMgCvg = await lockingPositionService.balanceOfMgCvg(2);
        expect(balanceOfMgCvg).to.be.eq(0);

        // increase lock time and amount
        await (await cvgContract.connect(user1).approve(lockingPositionService, ethers.parseEther("1000"))).wait();
        await lockingPositionService.connect(user1).increaseLockTimeAndAmount(2, 12, ethers.parseEther("1000"), zeroAddress());

        // balance should still be 0 after because the position is 100% ysCVG
        balanceOfMgCvg = await lockingPositionService.balanceOfMgCvg(2);
        expect(balanceOfMgCvg).to.be.eq(0);
    });
});
