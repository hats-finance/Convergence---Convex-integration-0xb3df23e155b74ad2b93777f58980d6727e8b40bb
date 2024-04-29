import {expect} from "chai";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {ethers} from "hardhat";
import {Signer} from "ethers";
import {LockingPositionManager, LockingPositionService, Cvg, CvgControlTower, YsDistributor} from "../../../typechain-types";
import {IContractsUser, IContracts, IUsers} from "../../../utils/contractInterface";
import {LOCKING_POSITIONS} from "./config/lockingTestConfig";
import {CYCLE_12, CYCLE_13, CYCLE_24, CYCLE_36, CYCLE_48, CYCLE_5, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_4} from "../../../resources/constant";

describe("LockingPositionManager  / unlock", () => {
    let lockingPositionManager: LockingPositionManager,
        lockingPositionService: LockingPositionService,
        cvgContract: Cvg,
        controlTowerContract: CvgControlTower,
        ysdistributor: YsDistributor;
    let contractUsers: IContractsUser, contracts: IContracts, users: IUsers;
    let user1: Signer, user2: Signer, user3: Signer;

    before(async () => {
        contractUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractUsers.contracts;
        users = contractUsers.users;

        lockingPositionService = contracts.locking.lockingPositionService;
        lockingPositionManager = contracts.locking.lockingPositionManager;
        cvgContract = contracts.tokens.cvg;
        controlTowerContract = contracts.base.cvgControlTower;
        ysdistributor = contracts.rewards.ysDistributor;
        user1 = users.user1;
        user2 = users.user2;
        user3 = users.user3;

        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user3, ethers.parseEther("100000"))).wait();
    });

    it("increase staking cycle to 5", async () => {
        await increaseCvgCycle(contractUsers, LOCKING_POSITIONS[0].lockCycle - 1);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(LOCKING_POSITIONS[0].lockCycle);
    });

    const cvgDepositedMintToken1 = ethers.parseEther("100");
    const ysPartialMintToken1 = (cvgDepositedMintToken1 * 7n * 43n * 100n) / (100n * 96n * 12n);
    const ysFullMintToken1 = (cvgDepositedMintToken1 * 43n * 100n) / (100n * 96n);
    it("mint position 1 at cycle 5", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, cvgDepositedMintToken1)).wait();
        await (await lockingPositionService.connect(user1).mintPosition(43, cvgDepositedMintToken1, 100, user1, true)).wait(); // Lock 100 CVG for 43 cycles

        const totalSupplyYsCvg12 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg12).to.be.eq(ysPartialMintToken1);

        const totalSupplyYsCvg24 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24);
        expect(totalSupplyYsCvg24).to.be.eq(ysFullMintToken1);

        const totalSupplyYsCvg36 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36);
        expect(totalSupplyYsCvg36).to.be.eq(ysFullMintToken1);

        const totalSupplyYsCvg48 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48);
        expect(totalSupplyYsCvg48).to.be.eq(ysFullMintToken1);

        const token1Position = await lockingPositionService.lockingPositions(TOKEN_1);
        expect(token1Position.startCycle).to.be.eq(CYCLE_5);
        expect(token1Position.lastEndCycle).to.be.eq(CYCLE_48);
        expect(token1Position.totalCvgLocked).to.be.eq(LOCKING_POSITIONS[0].cvgAmount);

        expect(await cvgContract.balanceOf(lockingPositionService)).to.be.eq(cvgDepositedMintToken1);
        expect(await cvgContract.balanceOf(user1)).to.be.eq("99900000000000000000000");
    });

    it("increase staking cycle to 13 ", async () => {
        await increaseCvgCycle(contractUsers, 8);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(13);
    });

    const cvgDepositedMintToken2 = ethers.parseEther("200");
    const ysPartialMintToken2 = (cvgDepositedMintToken2 * 11n * 23n * 100n) / (100n * 96n * 12n);
    const ysFullMintToken2 = (cvgDepositedMintToken2 * 23n * 100n) / (100n * 96n);
    it("mint position 2 at cycle 13 with user2", async () => {
        await (await cvgContract.connect(user2).approve(lockingPositionService, cvgDepositedMintToken2)).wait();
        await (await lockingPositionService.connect(user2).mintPosition("23", cvgDepositedMintToken2, 100, user2, true)).wait(); // Lock 100 CVG for 43 cycles

        const totalSupplyYsCvg12 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg12).to.be.eq(ysPartialMintToken1);

        const totalSupplyYsCvg24 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24);
        expect(totalSupplyYsCvg24).to.be.eq(ysFullMintToken1 + ysPartialMintToken2);

        const totalSupplyYsCvg36 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36);
        expect(totalSupplyYsCvg36).to.be.eq(ysFullMintToken1 + ysFullMintToken2);

        const totalSupplyYsCvg48 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48);
        expect(totalSupplyYsCvg48).to.be.eq(ysFullMintToken1);

        const token1Position = await lockingPositionService.lockingPositions(TOKEN_2);
        expect(token1Position.startCycle).to.be.eq(CYCLE_13);
        expect(token1Position.lastEndCycle).to.be.eq(CYCLE_36);
        expect(token1Position.totalCvgLocked).to.be.eq(cvgDepositedMintToken2);
    });

    const cvgDepositedMintToken3 = ethers.parseEther("200");
    const ysPartialMintToken3 = (cvgDepositedMintToken2 * 11n * 23n * 100n) / (100n * 96n * 12n);
    const ysFullMintToken3 = (cvgDepositedMintToken2 * 23n * 100n) / (100n * 96n);
    it("mint position 3 at cycle 13 with user3", async () => {
        await (await cvgContract.connect(user3).approve(lockingPositionService, cvgDepositedMintToken3)).wait();
        await (await lockingPositionService.connect(user3).mintPosition("23", cvgDepositedMintToken3, 100, user3, true)).wait(); // Lock 100 CVG for 43 cycles

        const totalSupplyYsCvg12 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg12).to.be.eq(ysPartialMintToken1);

        const totalSupplyYsCvg24 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24);
        expect(totalSupplyYsCvg24).to.be.eq(ysFullMintToken1 + ysPartialMintToken2 + ysPartialMintToken3);

        const totalSupplyYsCvg36 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36);
        expect(totalSupplyYsCvg36).to.be.eq(ysFullMintToken1 + ysFullMintToken2 + ysFullMintToken3);

        const totalSupplyYsCvg48 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48);
        expect(totalSupplyYsCvg48).to.be.eq(ysFullMintToken1);

        const token1Position = await lockingPositionService.lockingPositions(TOKEN_3);
        expect(token1Position.startCycle).to.be.eq(13);
        expect(token1Position.lastEndCycle).to.be.eq(36);
        expect(token1Position.totalCvgLocked).to.be.eq(cvgDepositedMintToken3);
    });

    it("increase staking cycle to 24, TDE 2 not claimable because not ready ", async () => {
        await increaseCvgCycle(contractUsers, 11);
        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(24);

        const txFail = ysdistributor.connect(user2).claimRewards(TOKEN_2, 2, user1);
        await expect(txFail).to.be.reverted;
    });

    it("fails burn position not unlocked", async () => {
        const txFail = lockingPositionService.connect(user1).burnPosition(TOKEN_1);

        await expect(txFail).to.be.revertedWith("LOCKED");
    });

    it("increase staking cycle to 49, claim rewards", async () => {
        await increaseCvgCycle(contractUsers, 25);
        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(49);

        const txClaim_1_4 = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 4, user1)).wait();

        const txClaim_2_3 = await (await ysdistributor.connect(user2).claimRewards(TOKEN_2, 3, user1)).wait();

        const txClaim_1_1 = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 1, user1)).wait();

        const txClaim_1_3 = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 3, user2)).wait();

        const txClaim_1_2 = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 2, user1)).wait();

        const txClaim_2_2 = await (await ysdistributor.connect(user2).claimRewards(TOKEN_2, 2, user1)).wait();

        const txClaim_3_3 = await (await ysdistributor.connect(user3).claimRewards(TOKEN_3, 3, user1)).wait();

        const txClaim_3_2 = await (await ysdistributor.connect(user3).claimRewards(TOKEN_3, 2, user1)).wait();
    });

    it("fails burn position not owned", async () => {
        const txFail = lockingPositionService.connect(user1).burnPosition(TOKEN_2);

        await expect(txFail).to.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("success burn positions", async () => {
        const burnPosition1Tx = await (await lockingPositionService.connect(user1).burnPosition(TOKEN_1)).wait();

        const burnPosition2Tx = await (await lockingPositionService.connect(user2).burnPosition(TOKEN_2)).wait();
    });

    it("Mints position 4 with 0% ysCVG at cycle 49, increases cycle to 61 and burns position", async () => {
        await (await cvgContract.connect(user1).approve(lockingPositionService, LOCKING_POSITIONS[0].cvgAmount)).wait();
        await (await lockingPositionService.connect(user1).mintPosition(11, LOCKING_POSITIONS[0].cvgAmount, 0, user1, true)).wait();

        await increaseCvgCycle(contractUsers, 12);

        await (await lockingPositionService.connect(user1).burnPosition(TOKEN_4)).wait();
    });

    it("success ERC721 burnt ", async () => {
        const user1NFTBalance = await lockingPositionManager.balanceOf(user1);
        expect(user1NFTBalance).to.be.eq(0);

        const user2NFTBalance = await lockingPositionManager.balanceOf(user2);
        expect(user2NFTBalance).to.be.eq(0);
    });

    it("success CVG sent back after unlocking", async () => {
        const user1CVGBalance = await cvgContract.balanceOf(user1);
        expect(user1CVGBalance).to.be.eq(ethers.parseEther("100000"));

        const user2CVGBalance = await cvgContract.balanceOf(user2);
        expect(user2CVGBalance).to.be.eq(ethers.parseEther("100000"));
    });
});
