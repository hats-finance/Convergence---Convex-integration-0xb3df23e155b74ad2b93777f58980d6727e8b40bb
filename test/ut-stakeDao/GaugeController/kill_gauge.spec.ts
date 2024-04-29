import chai from "chai";
import {ethers} from "hardhat";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture} from "../../fixtures/stake-dao";

const expect = chai.expect;
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {LockingPositionDelegate, LockingPositionManager, LockingPositionService} from "../../../typechain-types/contracts/Locking";
import {Cvg} from "../../../typechain-types/contracts/Token";

import {PositionLocker} from "../../../typechain-types/contracts/mocks";
import {formatEther, Signer} from "ethers";
import {GaugeController} from "../../../typechain-types-vyper/GaugeController";
import {contracts, CvgControlTower, CvgRewards} from "../../../typechain-types";

import {TOKEN_1, TOKEN_2} from "../../../resources/constant";
import {verifySumVotesGaugeControllerEqualsTotalVotes} from "../../../utils/locking/invariants.checks";

describe("GaugeController : Killing a gauge", () => {
    let lockingPositionManager: LockingPositionManager,
        lockingPositionService: LockingPositionService,
        lockingPositionDelegate: LockingPositionDelegate,
        cvgControlTower: CvgControlTower,
        cvgContract: Cvg,
        gaugeController: GaugeController,
        cvgRewards: CvgRewards,
        positionLocker: PositionLocker,
        getVotingPower: (stakingAddress: string) => Promise<number>;

    let owner: Signer, user1: Signer, user2: Signer, treasuryDao: Signer, veSdtMultisig: Signer;

    const staking1 = "0x385080Bbc63b8D84d579bAEfE6b9677032c5CCac";
    const staking2 = "0x4D85Ccb6284d85f136820287A3737cF10586B825";
    const staking3 = "0xA86Be651E41531a61e10ceE04d1EE93F0Ef962fe";

    const ownerLockAmount = ethers.parseEther("100000");

    getVotingPower = async (stakingAddress: string) => {
        const votingPower = await gaugeController.get_gauge_weight(stakingAddress);
        return parseFloat(formatEther(votingPower));
    };

    beforeEach(async () => {
        const {contracts, users} = await loadFixture(deployYsDistributorFixture);

        lockingPositionService = contracts.locking.lockingPositionService;
        lockingPositionManager = contracts.locking.lockingPositionManager;
        lockingPositionDelegate = contracts.locking.lockingPositionDelegate;
        cvgContract = contracts.tokens.cvg;
        gaugeController = contracts.locking.gaugeController;
        positionLocker = contracts.tests.positionLocker;
        cvgRewards = contracts.rewards.cvgRewards;

        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        treasuryDao = users.treasuryDao;
        veSdtMultisig = users.veSdtMultisig;

        // activate the address as Staking contract in the cvgControlTower
        await Promise.all(
            [staking1, staking2, staking3].map(async (staking) => {
                await contracts.base.cvgControlTower.connect(treasuryDao).toggleStakingContract(staking);
            })
        );

        await (await cvgContract.approve(lockingPositionService, ownerLockAmount * 100n)).wait();
        await (await lockingPositionService.mintPosition(47, ownerLockAmount, 0, owner, true)).wait(); // VP = 50k
        await (await lockingPositionService.mintPosition(95, ownerLockAmount, 0, owner, true)).wait(); // VP = 100k
        await (await lockingPositionService.mintPosition(23, ownerLockAmount * 2n, 0, owner, true)).wait(); // VP = 50k
        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();

        await (await gaugeController.connect(treasuryDao).add_type("A", "2")).wait();
        await (await gaugeController.connect(treasuryDao).add_type("B", "1")).wait();
        await (await gaugeController.connect(treasuryDao).add_type("C", "10")).wait();
    });

    async function createAndActivateGauge(address: string, type = 0): Promise<void> {
        await (await gaugeController.connect(treasuryDao).add_gauge(address, type, 0)).wait();
        await (await gaugeController.connect(treasuryDao).toggle_vote_pause(address)).wait();
    }

    it("Fails : Kill a gauge if not owner", async () => {
        await createAndActivateGauge(staking1);
        await expect(gaugeController.connect(user1).kill_gauge(staking1)).to.be.revertedWith("NOT_ADMIN");
    });

    it("Success : Kill a gauge & verify that gauge_relative_weight_writes is not broken after end of all locks ", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2);
        await createAndActivateGauge(staking3);

        await gaugeController.simple_vote(TOKEN_2, staking2, 1000);
        await gaugeController.simple_vote(TOKEN_2, staking1, 1000);
        expect(await gaugeController.killed_gauges(staking2)).to.be.false;
        await gaugeController.connect(treasuryDao).kill_gauge(staking2);
        expect(await gaugeController.killed_gauges(staking2)).to.be.true;

        expect(await cvgRewards.gauges(0)).to.be.eq(staking1);
        expect(await cvgRewards.gauges(1)).to.be.eq(staking3);
        await expect(cvgRewards.gauges(2)).to.be.rejected;

        expect(await cvgRewards.gaugesId(staking1)).to.be.eq(0);
        expect(await cvgRewards.gaugesId(staking2)).to.be.eq(0);
        expect(await cvgRewards.gaugesId(staking3)).to.be.eq(1);

        await time.increase(48 * 86400 * 7);
        await gaugeController.checkpoint();
        await gaugeController.gauge_relative_weight_writes(0, 3);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);
    });

    it("Fail : Vote on a killed gauge", async () => {
        await createAndActivateGauge(staking1);
        await gaugeController.connect(treasuryDao).kill_gauge(staking1);
        await expect(gaugeController.simple_vote(1, staking1, "100")).to.be.revertedWith("KILLED_GAUGE");
    });

    it("Success : could Remove votes on a killed gauge", async () => {
        await createAndActivateGauge(staking1);
        expect(gaugeController.simple_vote(1, staking1, "100")).not.throw;
        await gaugeController.connect(treasuryDao).kill_gauge(staking1);
        expect(gaugeController.simple_vote(1, staking1, "0")).not.throw;
    });

    it("Success : Checkpoint on a killed gauge", async () => {
        await createAndActivateGauge(staking1);
        expect(gaugeController.simple_vote(1, staking1, "100")).not.throw;
        await gaugeController.connect(treasuryDao).kill_gauge(staking1);
        expect(gaugeController.gauge_relative_weight_write(staking1)).not.throw;
    });
});
