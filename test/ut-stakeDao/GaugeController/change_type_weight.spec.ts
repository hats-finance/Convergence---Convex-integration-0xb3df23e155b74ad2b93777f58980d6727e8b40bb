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
import {ONE_WEEK, TOKEN_1, TOKEN_2, TOKEN_4} from "../../../resources/constant";
import {verifySumVotesGaugeControllerEqualsTotalVotes} from "../../../utils/locking/invariants.checks";

describe("GaugeController : Change type weight", () => {
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
        cvgControlTower = contracts.base.cvgControlTower;
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

    it("Success : Increase a weight of a type after  some votes have been deposited on it", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2, 1);
        await createAndActivateGauge(staking3, 2);

        await (await gaugeController.simple_vote(TOKEN_1, staking1, "1000")).wait();
        await (await gaugeController.simple_vote(TOKEN_1, staking2, "1000")).wait();
        await (await gaugeController.simple_vote(TOKEN_1, staking3, "1000")).wait();

        const votingPower1 = await getVotingPower(staking1);
        const votingPower2 = await getVotingPower(staking2);
        const votingPower3 = await getVotingPower(staking3);

        expect(Number(votingPower1)).to.be.eq(Number(votingPower2) * 2);
        expect(Number(votingPower3)).to.be.eq(Number(votingPower2) * 10);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);

        await gaugeController.connect(treasuryDao).change_type_weight(0, 10);

        const votingPower1AfterWeightChange = await getVotingPower(staking1);
        const votingPower2AfterWeightChange = await getVotingPower(staking2);
        const votingPower3AfterWeightChange = await getVotingPower(staking3);

        expect(Number(votingPower1AfterWeightChange)).to.be.eq(Number(votingPower3AfterWeightChange));
        expect(Number(votingPower1AfterWeightChange)).to.be.eq(Number(votingPower2AfterWeightChange) * 10);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);

        await time.increase(ONE_WEEK * 95n);
        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);
    });

    it("Success : Decrease a weight of a type after  some votes have been deposited on it", async () => {
        const staking4 = "0xc0ffee254729296a45a3885639AC7E10F9d54979";

        await cvgControlTower.connect(treasuryDao).toggleStakingContract(staking4);

        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2, 1);
        await createAndActivateGauge(staking3, 2);
        await createAndActivateGauge(staking4);

        await (await gaugeController.simple_vote(TOKEN_2, staking1, "1000")).wait();
        await (await gaugeController.simple_vote(TOKEN_2, staking2, "1000")).wait();
        await (await gaugeController.simple_vote(TOKEN_2, staking3, "1000")).wait();
        await (await gaugeController.simple_vote(TOKEN_2, staking4, "1000")).wait();

        const votingPower1 = await getVotingPower(staking1);
        const votingPower2 = await getVotingPower(staking2);
        const votingPower3 = await getVotingPower(staking3);

        expect(Number(votingPower1)).to.be.eq(Number(votingPower2) * 2);
        expect(Number(votingPower3)).to.be.eq(Number(votingPower2) * 10);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);

        await time.increase(ONE_WEEK * 50n);

        await (await gaugeController.gauge_relative_weight_write(staking1)).wait();
        await (await gaugeController.gauge_relative_weight_write(staking2)).wait();
        await (await gaugeController.gauge_relative_weight_write(staking3)).wait();
        await (await gaugeController.gauge_relative_weight_write(staking4)).wait();

        await gaugeController.connect(treasuryDao).kill_gauge(staking4);

        await time.increase(ONE_WEEK * 25n);

        await (await gaugeController.gauge_relative_weight_write(staking1)).wait();
        await (await gaugeController.gauge_relative_weight_write(staking2)).wait();
        await (await gaugeController.gauge_relative_weight_write(staking3)).wait();
        await (await gaugeController.gauge_relative_weight_write(staking4)).wait();

        await (await lockingPositionService.mintPosition(92, ethers.parseEther("100"), 0, owner, true)).wait();

        await (await gaugeController.simple_vote(TOKEN_4, staking1, "1000")).wait();
        await (await gaugeController.simple_vote(TOKEN_4, staking2, "1000")).wait();
        await (await gaugeController.simple_vote(TOKEN_4, staking3, "1000")).wait();
        await (await gaugeController.simple_vote(TOKEN_4, staking4, 0)).wait();

        await gaugeController.connect(treasuryDao).change_type_weight(2, 1);

        const votingPower1AfterWeightChange = await getVotingPower(staking1);
        const votingPower2AfterWeightChange = await getVotingPower(staking2);
        const votingPower3AfterWeightChange = await getVotingPower(staking3);

        expect(Number(votingPower3AfterWeightChange)).to.be.eq(Number(votingPower2AfterWeightChange));
        expect(Number(votingPower1AfterWeightChange)).to.be.eq(Number(votingPower2AfterWeightChange) * 2);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);

        await time.increase(ONE_WEEK * 91n);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);

        await (await gaugeController.simple_vote(TOKEN_4, staking1, 0)).wait();
        await (await gaugeController.simple_vote(TOKEN_4, staking2, 0)).wait();
        await (await gaugeController.simple_vote(TOKEN_4, staking3, 0)).wait();
    });
});
