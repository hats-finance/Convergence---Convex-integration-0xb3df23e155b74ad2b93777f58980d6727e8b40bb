import {expect} from "chai";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {Signer} from "ethers";
import {ethers} from "hardhat";
import {LockingPositionService, Cvg, CvgControlTower, YsDistributor, CvgRewards, LockingPositionManager, ERC20} from "../../../typechain-types";
import {IContractsUser, IContracts, IUsers} from "../../../utils/contractInterface";
import {TOKEN_1} from "../../../resources/constant";
import {VeCVG} from "../../../typechain-types-vyper/VeCVG";

describe("LockingPositionService : Stress test on big extensions amount", () => {
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

    it("Success : Do several increase Amount on token that left", async () => {
        await lockingPositionService.connect(user2).mintPosition(11, ethers.parseEther("100"), 50, user2, true);

        for (let i = 0; i < 7; i++) {
            // for 4 years
            for (let j = 0; j < 25; j++) {
                await lockingPositionService.connect(user2).increaseLockAmount(TOKEN_1, ethers.parseEther("100"), ethers.ZeroAddress);
            }

            const txIncreaseTime = await lockingPositionService.connect(user2).increaseLockTime(TOKEN_1, 12);

            const receipt = await txIncreaseTime.wait();
            console.info("Gas used: ", receipt!.gasUsed.toString());
        }
    });

    it("Success : Go to cycle 96", async () => {
        await increaseCvgCycle(contractUsers, 95);
    });

    it("Fails : Try to burn TOKEN_1 still locked", async () => {
        await lockingPositionService.connect(user2).burnPosition(TOKEN_1).should.be.revertedWith("LOCKED");
    });

    it("Success : Go to cycle 97", async () => {
        await increaseCvgCycle(contractUsers, 1);
    });

    it("Success : Burn TOKEN_1 not locked anymore", async () => {
        const totalCvgLocked = ethers.parseEther("100") + ethers.parseEther("100") * 7n * 25n;
        const burnTx = lockingPositionService.connect(user2).burnPosition(TOKEN_1);
        await burnTx;

        await expect(burnTx).to.changeTokenBalances(cvgContract, [lockingPositionService, user2], [-totalCvgLocked, totalCvgLocked]);
    });
});
