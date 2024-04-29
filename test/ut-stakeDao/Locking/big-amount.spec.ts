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
import {CYCLE_12, CYCLE_13, CYCLE_5, CYCLE_9, TDE_1, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_4, TOKEN_5, TOKEN_6, TOKEN_7} from "../../../resources/constant";
import {ERC20} from "../../../typechain-types";

describe("Locking : Big amounts", () => {
    let lockingPositionService: LockingPositionService,
        lockingPositionDelegate: LockingPositionDelegate,
        cvgContract: Cvg,
        controlTowerContract: CvgControlTower,
        positionLocker: PositionLocker,
        ysdistributor: YsDistributor;
    let contractUsers: IContractsUser, contracts: IContracts, users: IUsers;
    let owner: Signer, user1: Signer, user2: Signer, user10: Signer, treasuryDao: Signer;
    let dai: ERC20, frax: ERC20;
    let cvgBalance: bigint;
    beforeEach(async () => {
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
        dai = contracts.tokens.dai;
        frax = contracts.tokens.frax;
        treasuryDao = users.treasuryDao;
        /// Success : Give max amount of CVG possible to an user ( 148M CVG )
        await contracts.base.cvgControlTower.connect(treasuryDao).toggleBond(owner);
        await contracts.base.cvgControlTower.connect(treasuryDao).toggleStakingContract(owner);
        await cvgContract.mintStaking(owner, ethers.parseEther("60000000"));
        await cvgContract.mintBond(owner, ethers.parseEther("48000000"));

        await cvgContract.approve(lockingPositionService, ethers.MaxUint256);
        cvgBalance = await cvgContract.balanceOf(owner);
    });

    it("Success : Mint with 148M and ys/ve 0%/100%", async () => {
        await lockingPositionService.mintPosition(95, cvgBalance, 0, owner, true);
    });

    it("Success : Mint with 148M and ys/ve 100%/0%", async () => {
        await lockingPositionService.mintPosition(95, cvgBalance, 100, owner, true);
        const EIGHTY_BILLION = ethers.parseEther("80000000000");
        const MAX_UINT_96 = ethers.parseEther("79000000000");

        await dai.transfer(users.treasuryPdd, EIGHTY_BILLION);
        await dai.connect(users.treasuryPdd).approve(ysdistributor, ethers.MaxUint256);

        await frax.transfer(users.treasuryPdd, EIGHTY_BILLION);
        await frax.connect(users.treasuryPdd).approve(ysdistributor, ethers.MaxUint256);

        await expect(ysdistributor.connect(users.treasuryPdd).depositMultipleToken([{token: dai, amount: EIGHTY_BILLION}])).to.be.rejected;
        await ysdistributor.connect(users.treasuryPdd).depositMultipleToken([
            {token: dai, amount: MAX_UINT_96},
            {token: frax, amount: MAX_UINT_96},
        ]);

        await increaseCvgCycle(contractUsers, 12);

        await ysdistributor.claimRewards(TOKEN_1, TDE_1, owner);
    });

    it("Success : IncreaseAmount with 148M and ys/ve 0%/100%", async () => {
        await lockingPositionService.mintPosition(95, 1, 0, owner, true);
        await lockingPositionService.increaseLockAmount(TOKEN_1, cvgBalance - 1n, owner);
    });

    it("Success :IncreaseAmount with 148M and ys/ve 100%/0%", async () => {
        await lockingPositionService.mintPosition(95, 1, 100, owner, true);
        await lockingPositionService.increaseLockAmount(TOKEN_1, cvgBalance - 1n, owner);
    });

    it("Success : IncreaseTimeAndAmount with 148M and ys/ve 0%/100%", async () => {
        await lockingPositionService.mintPosition(11, 1, 0, owner, true);
        await lockingPositionService.increaseLockTimeAndAmount(TOKEN_1, 12, cvgBalance - 1n, owner);
    });

    it("Success : IncreaseTimeAndAmount with 148M and ys/ve 100%/0%", async () => {
        await lockingPositionService.mintPosition(11, 1, 100, owner, true);
        await lockingPositionService.increaseLockTimeAndAmount(TOKEN_1, 12, cvgBalance - 1n, owner);
    });
});
