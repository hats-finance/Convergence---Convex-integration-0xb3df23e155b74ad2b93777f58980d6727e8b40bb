import {expect} from "chai";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {ethers} from "hardhat";
import {IContracts, IContractsUser, IUsers} from "../../../utils/contractInterface";
import {PositionLocker} from "../../../typechain-types/contracts/mocks";
import {LockingPositionDelegate, LockingPositionService} from "../../../typechain-types/contracts/Locking";
import {Signer, EventLog, ZeroAddress} from "ethers";
import {Cvg} from "../../../typechain-types/contracts/Token";
import {CvgControlTower} from "../../../typechain-types/contracts";
import {YsDistributor} from "../../../typechain-types/contracts/Rewards";
import {LOCKING_POSITIONS} from "./config/lockingTestConfig";
import {
    CYCLE_12,
    CYCLE_13,
    CYCLE_24,
    CYCLE_36,
    CYCLE_48,
    CYCLE_5,
    CYCLE_60,
    CYCLE_9,
    TOKEN_1,
    TOKEN_2,
    TOKEN_3,
    TOKEN_4,
    TOKEN_5,
    TOKEN_6,
    TOKEN_7,
} from "../../../resources/constant";

describe("LockingPositionManager : mintPosition & claimRewards", () => {
    let lockingPositionService: LockingPositionService,
        lockingPositionDelegate: LockingPositionDelegate,
        cvgContract: Cvg,
        controlTowerContract: CvgControlTower,
        positionLocker: PositionLocker,
        ysdistributor: YsDistributor;
    let contractUsers: IContractsUser, contracts: IContracts, users: IUsers;
    let owner: Signer, user1: Signer, user2: Signer, user10: Signer, treasuryDao: Signer;

    before(async () => {
        contractUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractUsers.contracts;
        users = contractUsers.users;

        lockingPositionService = contracts.locking.lockingPositionService;
        lockingPositionDelegate = contracts.locking.lockingPositionDelegate;
        cvgContract = contracts.tokens.cvg;
        controlTowerContract = contracts.base.cvgControlTower;
        positionLocker = contracts.tests.positionLocker;
        ysdistributor = contracts.rewards.ysDistributor;

        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        user10 = users.user10;
        treasuryDao = users.treasuryDao;

        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(positionLocker, ethers.parseEther("100000"))).wait();

        await (await cvgContract.connect(user2).approve(lockingPositionService, ethers.MaxUint256)).wait();
        await (await cvgContract.connect(user1).approve(lockingPositionService, ethers.MaxUint256)).wait();
    });

    it("Success: Increase staking cycle to 5", async () => {
        await increaseCvgCycle(contractUsers, LOCKING_POSITIONS[0].lockCycle - 1);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(LOCKING_POSITIONS[0].lockCycle);
    });

    it("Tries to mint position with ysPercentage greater than 100", async () => {
        const txFail = lockingPositionService.connect(user1).mintPosition(LOCKING_POSITIONS[0].duration, LOCKING_POSITIONS[0].cvgAmount, 130, user1, true);
        await expect(txFail).to.be.revertedWith("YS_%_OVER_100");
    });

    it("Tries to mint position with ysPercentage not multiple of 10", async () => {
        const txFail = lockingPositionService.connect(user1).mintPosition(LOCKING_POSITIONS[0].duration, LOCKING_POSITIONS[0].cvgAmount, 25, user1, true);
        await expect(txFail).to.be.revertedWith("YS_%_10_MULTIPLE");
    });

    it("Fails : Tries to mint for a duration equals to 0", async () => {
        const txFail = lockingPositionService.connect(user1).mintPosition(0, LOCKING_POSITIONS[0].cvgAmount, 30, user1, true);
        await expect(txFail).to.be.revertedWith("LOCK_DURATION_ZERO");
    });

    it("Success : Mint TOKEN_1 at cycle 5", async () => {
        await (await lockingPositionService.connect(user1).mintPosition(43, ethers.parseEther("100"), 100, user1, true)).wait(); // Lock 100 CVG for 43 cycles

        const totalSupplyYsCvgTde1 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvgTde1).to.be.eq(26128472222222222222n);
        const totalSupplyYsCvgTde2 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24);
        expect(totalSupplyYsCvgTde2).to.be.eq(44791666666666666666n);
        const totalSupplyYsCvgTde3 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36);
        expect(totalSupplyYsCvgTde3).to.be.eq(44791666666666666666n);
        const totalSupplyYsCvgTde4 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48);
        expect(totalSupplyYsCvgTde4).to.be.eq(44791666666666666666n);
        const totalSupplyYsCvgAfterTde4 = await lockingPositionService.totalSupplyOfYsCvgAt(49);
        expect(totalSupplyYsCvgAfterTde4).to.be.eq(0);

        const balance1Tde1 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_12);
        expect(balance1Tde1).to.be.eq(totalSupplyYsCvgTde1);
        const balance1Tde2 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_24);
        expect(balance1Tde2).to.be.eq(totalSupplyYsCvgTde2);
        const balance1Tde3 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_36);
        expect(balance1Tde3).to.be.eq(totalSupplyYsCvgTde3);
        const balance1Tde4 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_48);
        expect(balance1Tde4).to.be.eq(totalSupplyYsCvgTde4);

        const token1Position = await lockingPositionService.lockingPositions(1);
        expect(token1Position.startCycle).to.be.eq(LOCKING_POSITIONS[0].lockCycle);
        expect(token1Position.lastEndCycle).to.be.eq(48);
        expect(token1Position.totalCvgLocked).to.be.eq(LOCKING_POSITIONS[0].cvgAmount);
        expect(token1Position.mgCvgAmount).to.be.eq("0");
    });

    it("Success : Increase staking cycle to 9", async () => {
        await increaseCvgCycle(contractUsers, LOCKING_POSITIONS[1].lockCycle - LOCKING_POSITIONS[0].lockCycle);

        let actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(9);

        const totalSupplyYsCvgBeforeTde = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_9);
        expect(totalSupplyYsCvgBeforeTde).to.be.eq(0);

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg).to.be.eq("26128472222222222222");
    });

    it("Success : Mint TOKEN_2 at cycle 9", async () => {
        await (await lockingPositionService.connect(user1).mintPosition(39, ethers.parseEther("100"), 100, user1, true)).wait(); // Lock 4 000 CVG for 15 cycles

        const token2Position = await lockingPositionService.lockingPositions(2);
        expect(token2Position.startCycle).to.be.eq(9);
        expect(token2Position.lastEndCycle).to.be.eq(48);
        expect(token2Position.totalCvgLocked).to.be.eq(ethers.parseEther("100"));
        expect(token2Position.mgCvgAmount).to.be.eq("0");

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg).to.be.eq(36284722222222222222n);
    });

    it("Success : Increase staking cycle to 12", async () => {
        await increaseCvgCycle(contractUsers, LOCKING_POSITIONS[2].lockCycle - LOCKING_POSITIONS[1].lockCycle);

        let actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(12);

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg).to.be.eq(36284722222222222222n);
    });

    it("Success : Mint position 3 at cycle 12", async () => {
        await (await lockingPositionService.connect(user2).mintPosition(36, ethers.parseEther("50"), 100, user2, true)).wait(); // Lock 4 000 CVG for 15 cycles

        const token3Position = await lockingPositionService.lockingPositions(3);
        expect(token3Position.startCycle).to.be.eq(12);
        expect(token3Position.lastEndCycle).to.be.eq(48);
        expect(token3Position.totalCvgLocked).to.be.eq(ethers.parseEther("50"));
        expect(token3Position.mgCvgAmount).to.be.eq("0");

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12);
        expect(totalSupplyYsCvg).to.be.eq(36284722222222222222n);
    });

    it("Success : Increase staking cycle to 13 => first TDE", async () => {
        await increaseCvgCycle(contractUsers, 1);

        let actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(13);

        const totalSupplyYsCvgCycle13 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_13);
        expect(totalSupplyYsCvgCycle13).to.be.eq(36284722222222222222n);

        const totalSupplyYsCvgTde2 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24);
        expect(totalSupplyYsCvgTde2).to.be.eq(104166666666666666666n);
    });

    it("success trigger rewards for token 1 on TDE 1", async () => {
        const txSuccess = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 1, user1)).wait();
    });

    it("Success : Increase staking cycle to 27 => first TDE", async () => {
        await increaseCvgCycle(contractUsers, 14);

        let actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(27);

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(27);
        expect(totalSupplyYsCvg).to.be.eq("104166666666666666666");
    });

    it("Success : Mint position 4 at cycle 27", async () => {
        await (
            await lockingPositionService.connect(user2).mintPosition(LOCKING_POSITIONS[3].duration, LOCKING_POSITIONS[3].cvgAmount, 100, user2, true)
        ).wait(); // Lock 4 000 CVG for 15 cycles

        const token4Position = await lockingPositionService.lockingPositions(TOKEN_4);
        expect(token4Position.startCycle).to.be.eq(LOCKING_POSITIONS[3].lockCycle);
        expect(token4Position.lastEndCycle).to.be.eq(48);
        expect(token4Position.totalCvgLocked).to.be.eq(LOCKING_POSITIONS[3].cvgAmount);
        expect(token4Position.mgCvgAmount).to.be.eq("0");

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(27);
        expect(totalSupplyYsCvg).to.be.eq("104166666666666666666");
    });

    it("increase staking cycle to 30", async () => {
        await increaseCvgCycle(contractUsers, 3);

        let actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(30);

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(30);
        expect(totalSupplyYsCvg).to.be.eq("104166666666666666666");

        const totalSupplyYsCvgTde3 = await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36);
        expect(totalSupplyYsCvgTde3).to.be.eq("116471354166666666666");
    });

    it("Success : Increase staking cycle to 41", async () => {
        await increaseCvgCycle(contractUsers, 11);

        let actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(41);

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(41);
        expect(totalSupplyYsCvg).to.be.eq("116471354166666666666");

        const totalSupplyYsCvgTde4 = await lockingPositionService.totalSupplyOfYsCvgAt(48);
        expect(totalSupplyYsCvgTde4).to.be.eq("120572916666666666666");
    });

    it("success trigger rewards for token 1 on TDE 2", async () => {
        const txSuccess = await (await ysdistributor.connect(user1).claimRewards(TOKEN_1, 2, user1)).wait();
    });

    it("success trigger rewards for token 2 on TDE 1", async () => {
        const txSuccess = await (await ysdistributor.connect(user1).claimRewards(TOKEN_2, 1, user1)).wait();
    });

    it("success trigger rewards for token 2 on TDE 2", async () => {
        const txSuccess = await (await ysdistributor.connect(user1).claimRewards(TOKEN_2, 2, user1)).wait();
    });

    it("fails claim rewards when NFT not owned", async () => {
        const txFail = ysdistributor.connect(user1).claimRewards(TOKEN_3, 2, user1);
        await expect(txFail).to.be.revertedWith("NOT_OWNED_OR_DELEGATEE");
    });

    it("success trigger rewards for token 3 on TDE 2", async () => {
        const txSuccess = await (await ysdistributor.connect(user2).claimRewards(TOKEN_3, 2, user1)).wait();
    });

    it("success trigger rewards for token 3 on TDE 3", async () => {
        const txSuccess = await (await ysdistributor.connect(user2).claimRewards(TOKEN_3, 3, user1)).wait();
    });

    it("success trigger rewards for token 3 on TDE 4", async () => {
        const txFail = ysdistributor.connect(user2).claimRewards(TOKEN_3, 4, user1);

        await expect(txFail).to.be.revertedWith("TDE_NOT_AVAILABLE");
    });

    it("mint position 5 at cycle 41", async () => {
        await (await lockingPositionService.connect(user2).mintPosition(7, ethers.parseEther("100"), 100, user2, true)).wait(); // Lock 4 000 CVG for 15 cycles

        const token5Position = await lockingPositionService.lockingPositions(TOKEN_5);
        expect(token5Position.startCycle).to.be.eq(LOCKING_POSITIONS[4].lockCycle);
        expect(token5Position.lastEndCycle).to.be.eq(48);
        expect(token5Position.totalCvgLocked).to.be.eq(LOCKING_POSITIONS[4].cvgAmount);
        expect(token5Position.mgCvgAmount).to.be.eq("0");

        let totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(41);
        expect(totalSupplyYsCvg).to.be.eq("116471354166666666666");

        let totalSupplyYsCvgTde4 = await lockingPositionService.totalSupplyOfYsCvgAt(48);
        expect(totalSupplyYsCvgTde4).to.be.eq("124826388888888888888");
    });

    it("Mints position 6 at cycle 41", async () => {
        await (await cvgContract.connect(user2).approve(lockingPositionService, LOCKING_POSITIONS[5].cvgAmount)).wait();
        await (await lockingPositionService.connect(user2).mintPosition(LOCKING_POSITIONS[5].duration, LOCKING_POSITIONS[5].cvgAmount, 0, user2, true)).wait();
    });

    it("increase staking cycle to 49", async () => {
        await increaseCvgCycle(contractUsers, 8);

        let actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(49);

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(49);
        expect(totalSupplyYsCvg).to.be.eq("0");
    });

    it("increase staking cycle to 61 ", async () => {
        await increaseCvgCycle(contractUsers, 12);

        let actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(61);

        const totalSupplyYsCvg = await lockingPositionService.totalSupplyOfYsCvgAt(61);
        expect(totalSupplyYsCvg).to.be.eq(0);
    });

    it("success trigger rewards for token 3 on TDE 4", async () => {
        const txSuccess = await (await ysdistributor.connect(user2).claimRewards(TOKEN_3, 4, user1)).wait();
    });

    it("success trigger rewards for token 4 on TDE 3", async () => {
        const txSuccess = await (await ysdistributor.connect(user2).claimRewards(TOKEN_4, 3, user1)).wait();
    });

    it("Delegates share and success trigger rewards for token 4 on TDE 4 from delegatee user1", async () => {
        await (await lockingPositionDelegate.connect(user2).delegateYsCvg(TOKEN_4, user1)).wait();

        const txSuccess = await (await ysdistributor.connect(user1).claimRewards(TOKEN_4, 4, user1)).wait();
    });

    it("success trigger rewards for token 5 on TDE 4", async () => {
        const txSuccess = await (await ysdistributor.connect(user2).claimRewards(TOKEN_5, 4, user1)).wait();
    });

    it("Fails to claim rewards for token 6 on TDE 4 (0% ysCVG)", async () => {
        const txFail = ysdistributor.connect(user2).claimRewards(TOKEN_6, 4, user2);
        await expect(txFail).to.be.revertedWith("NO_YS_BALANCE_ON_THIS_TDE");
    });

    it("Fails to claim rewards for token 1 on TDE 5", async () => {
        const txFail = ysdistributor.connect(user1).claimRewards(TOKEN_1, 5, user1);
        await expect(txFail).to.be.revertedWith("NO_YS_BALANCE_ON_THIS_TDE");
    });

    it("Fails to delegate vote from user1 to user10 with non-owner of token", async () => {
        const txFail = lockingPositionDelegate.connect(user2).delegateVeCvg(TOKEN_1, user10);
        await expect(txFail).to.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Delegates vote from user1 to user10", async () => {
        expect(await lockingPositionDelegate.connect(user1).delegateVeCvg(TOKEN_1, user10))
            .to.emit(lockingPositionDelegate, "DelegateVeCvg")
            .withArgs(1, await user10.getAddress());
        expect(await lockingPositionDelegate.delegatedVeCvg(TOKEN_1)).to.be.equal(await user10.getAddress());
    });

    it("Delegates vote from user1 to user2", async () => {
        await lockingPositionDelegate.connect(user1).delegateVeCvg(TOKEN_1, user2);

        const delegatees = await lockingPositionDelegate.getVeCvgDelegatees(user2);
        expect(delegatees).to.deep.equal([1]);
    });

    it("Checks token position infos for token 1", async () => {
        const lockingPosition = LOCKING_POSITIONS[0];
        const tokenInfos = await lockingPositionService.tokenInfos(TOKEN_1);

        expect(tokenInfos.tokenId).to.be.equal(TOKEN_1);
        expect(tokenInfos.startCycle).to.be.equal(lockingPosition.lockCycle);
        expect(tokenInfos.endCycle).to.be.equal(48);
        expect(tokenInfos.cvgLocked).to.be.equal(lockingPosition.cvgAmount);
        expect(tokenInfos.ysActual).to.be.equal(0);
        expect(tokenInfos.ysTotal).to.be.equal("44791666666666666666");
        expect(tokenInfos.veCvgActual).to.be.equal(0);
        expect(tokenInfos.mgCvg).to.be.equal(0);
        expect(tokenInfos.ysPercentage).to.be.equal(100);
    });

    it("Fails to mint position with not allowed locker", async () => {
        const txFail = positionLocker.mintPosition("7", ethers.parseEther("100"), "10", owner, true);
        await expect(txFail).to.be.revertedWith("NOT_CONTRACT_OR_WL");
    });

    it("Fails to toggle contract locker from not owner", async () => {
        const txFail = lockingPositionService.toggleContractLocker(positionLocker);
        await expect(txFail).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Toggles contract locker", async () => {
        await lockingPositionService.connect(treasuryDao).toggleContractLocker(positionLocker);
        expect(await lockingPositionService.isContractLocker(positionLocker)).to.be.true;
    });

    it("Mints position with allowed locker contract (0% ysCVG)", async () => {
        await (await positionLocker.approveCvg(lockingPositionService, LOCKING_POSITIONS[6].cvgAmount)).wait();
        await (await positionLocker.mintPosition(LOCKING_POSITIONS[6].duration, LOCKING_POSITIONS[6].cvgAmount, 0, positionLocker, true)).wait();
    });

    it("Increases lock position amount with allowed locker contract", async () => {
        await (await positionLocker.approveCvg(lockingPositionService, LOCKING_POSITIONS[6].cvgAmount)).wait();
        await (await positionLocker.increaseLockAmount(TOKEN_7, LOCKING_POSITIONS[6].cvgAmount, ZeroAddress)).wait();
    });

    it("Fails to increase lock position time with lock time over", async () => {
        const txFail = lockingPositionService.connect(user2).increaseLockTime(TOKEN_3, 12);
        await expect(txFail).to.be.revertedWith("LOCK_TIME_OVER");
    });

    it("Increases lock position time with allowed locker contract", async () => {
        await (await positionLocker.increaseLockTime(TOKEN_7, 12)).wait();
    });

    it("Fails to increase lock position time and amount with amount of 0", async () => {
        const txFail = positionLocker.increaseLockTimeAndAmount(TOKEN_7, 12, 0, ZeroAddress);
        await expect(txFail).to.be.revertedWith("LTE");
    });

    it("Fails to increase lock position time and amount with not owner", async () => {
        const txFail = lockingPositionService.connect(user1).increaseLockTimeAndAmount(TOKEN_3, 12, 100, ZeroAddress);
        await expect(txFail).to.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Fails to increase lock position time and amount with lock over", async () => {
        const txFail = lockingPositionService.connect(user2).increaseLockTimeAndAmount(TOKEN_3, 12, 100, ZeroAddress);
        await expect(txFail).to.be.revertedWith("LOCK_OVER");
    });

    it("Fails to increase lock position time and amount with duration too big", async () => {
        const txFail = positionLocker.increaseLockTimeAndAmount(TOKEN_7, 96, 100, ZeroAddress);
        await expect(txFail).to.be.revertedWith("MAX_LOCK_96_CYCLES");
    });

    it("Fails to increase lock position time and amount with duration not TDE", async () => {
        const txFail = positionLocker.increaseLockTimeAndAmount(TOKEN_7, 10, 100, ZeroAddress);
        await expect(txFail).to.be.revertedWith("END_MUST_BE_TDE_MULTIPLE");
    });

    it("Increases lock position time and amount with allowed locker contract", async () => {
        await (await positionLocker.approveCvg(lockingPositionService, LOCKING_POSITIONS[6].cvgAmount)).wait();
        await (await positionLocker.increaseLockTimeAndAmount(TOKEN_7, 12, LOCKING_POSITIONS[6].cvgAmount, ZeroAddress)).wait();
    });

    it("Removes position locker from allowed contract", async () => {
        await lockingPositionService.connect(treasuryDao).toggleContractLocker(positionLocker);
        expect(await lockingPositionService.isContractLocker(positionLocker)).to.be.false;
    });

    it("Fails to increase lock position time with not allowed locker contract", async () => {
        const txFail = positionLocker.increaseLockTime(TOKEN_7, 12);
        await expect(txFail).to.be.revertedWith("NOT_CONTRACT_OR_WL");
    });

    it("Fails to increase lock position amount with not allowed locker contract", async () => {
        const txFail = positionLocker.increaseLockAmount(TOKEN_7, LOCKING_POSITIONS[6].cvgAmount, ZeroAddress);
        await expect(txFail).to.be.revertedWith("NOT_CONTRACT_OR_WL");
    });

    it("Fails to increase lock position amount and time with not allowed contract", async () => {
        const txFail = positionLocker.increaseLockTimeAndAmount(TOKEN_7, 12, LOCKING_POSITIONS[6].cvgAmount, ZeroAddress);
        await expect(txFail).to.be.revertedWith("NOT_CONTRACT_OR_WL");
    });
});
