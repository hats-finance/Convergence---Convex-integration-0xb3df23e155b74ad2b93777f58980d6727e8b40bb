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
import {CYCLE_12, CYCLE_13, CYCLE_5, CYCLE_9, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_4, TOKEN_5, TOKEN_6, TOKEN_7} from "../../../resources/constant";

describe("LockingPositionManager : Rounding calculation of Ys", () => {
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
        await (await cvgContract.connect(user1).approve(lockingPositionService, ethers.MaxUint256)).wait();
    });

    it("Success : Increase staking cycle to 9", async () => {
        await increaseCvgCycle(contractUsers, 8);
    });

    it("Success : Locks a position for 63 cycles an verify invariants", async () => {
        await lockingPositionService.connect(user1).mintPosition(63, 23, 80, user1, true);

        const balance = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, 12);
        const totalSupply = await lockingPositionService.totalSupplyOfYsCvgAt(12);

        const balance2 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, 24);
        const totalSupply2 = await lockingPositionService.totalSupplyOfYsCvgAt(24);

        const balance3 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, 72);
        const totalSupply3 = await lockingPositionService.totalSupplyOfYsCvgAt(72);

        const balance4 = await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, 73);
        const totalSupply4 = await lockingPositionService.totalSupplyOfYsCvgAt(73);

        expect(balance).to.be.eq(totalSupply);
        expect(balance2).to.be.eq(totalSupply2);
        expect(balance3).to.be.eq(totalSupply3);
        expect(balance4).to.be.eq(totalSupply4);
    });
});
