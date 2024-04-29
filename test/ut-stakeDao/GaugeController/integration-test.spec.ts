import chai from "chai";
import {ethers} from "hardhat";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle} from "../../fixtures/stake-dao";

const expect = chai.expect;
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {LockingPositionDelegate, LockingPositionManager, LockingPositionService} from "../../../typechain-types/contracts/Locking";
import {Cvg} from "../../../typechain-types/contracts/Token";

import {PositionLocker} from "../../../typechain-types/contracts/mocks";
import {formatEther, Signer} from "ethers";
import {GaugeController} from "../../../typechain-types-vyper/GaugeController";
import {contracts, CvgControlTower, CvgRewards} from "../../../typechain-types";
import {ONE_ETHER, ONE_WEEK, TOKEN_1, TOKEN_2} from "../../../resources/constant";
import {IContractsUser} from "../../../utils/contractInterface";
import {verifySumVotesGaugeControllerEqualsTotalVotes} from "../../../utils/locking/invariants.checks";

describe("GaugeController : Integration tests", () => {
    let lockingPositionManager: LockingPositionManager,
        lockingPositionService: LockingPositionService,
        lockingPositionDelegate: LockingPositionDelegate,
        cvgContract: Cvg,
        gaugeController: GaugeController,
        cvgRewards: CvgRewards,
        cvgControlTower: CvgControlTower,
        positionLocker: PositionLocker,
        getVotingPower: (stakingAddress: string) => Promise<number>;

    let owner: Signer, user1: Signer, user2: Signer, treasuryDao: Signer, veSdtMultisig: Signer;

    let contractsUsers: IContractsUser;

    const staking1 = "0x385080Bbc63b8D84d579bAEfE6b9677032c5CCac";
    const staking2 = "0x4D85Ccb6284d85f136820287A3737cF10586B825";
    const staking3 = "0xA86Be651E41531a61e10ceE04d1EE93F0Ef962fe";

    const ownerLockAmount = ethers.parseEther("100000");

    getVotingPower = async (stakingAddress: string) => {
        const votingPower = await gaugeController.get_gauge_weight(stakingAddress);
        return parseFloat(formatEther(votingPower));
    };

    beforeEach(async () => {
        contractsUsers = await loadFixture(deployYsDistributorFixture);
        const contracts = contractsUsers.contracts;
        const users = contractsUsers.users;

        lockingPositionService = contracts.locking.lockingPositionService;
        lockingPositionManager = contracts.locking.lockingPositionManager;
        lockingPositionDelegate = contracts.locking.lockingPositionDelegate;
        cvgContract = contracts.tokens.cvg;
        gaugeController = contracts.locking.gaugeController;
        positionLocker = contracts.tests.positionLocker;
        cvgRewards = contracts.rewards.cvgRewards;
        cvgControlTower = contracts.base.cvgControlTower;

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
    it("Fail : Cannot initialize twice the lockingPositionManager", async () => {
        await lockingPositionManager.initialize(owner).should.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Fail : Set the lockingPositionService as not the owner", async () => {
        await lockingPositionManager.setLockingPositionService(lockingPositionService).should.be.revertedWith("Ownable: caller is not the owner");
    });

    it("FAIL  : adding twice the same gauge should be reverted with GAUGE_ALREADY_ADDED", async () => {
        await (await gaugeController.connect(treasuryDao).add_gauge(staking1, 0, "10000")).wait();
        await expect(gaugeController.connect(treasuryDao).add_gauge(staking1, 0, "10000")).to.be.revertedWith("GAUGE_ALREADY_ADDED");
    });

    it("FAIL  : adding a non staking contract should be reverted with NOT_A_STAKING_CONTRACT ", async () => {
        await expect(gaugeController.connect(treasuryDao).add_gauge(await user2.getAddress(), 0, "10000")).to.be.revertedWith("NOT_A_STAKING_CONTRACT");
    });

    it("FAIL  : set_lock from a non locker  should be reverted with NOT_LOCKER ", async () => {
        await expect(gaugeController.connect(owner).set_lock(true)).to.be.revertedWith("NOT_LOCKER");
    });

    it("FAIL  : vote on a initial/paused gauged ", async () => {
        await (await gaugeController.connect(treasuryDao).add_gauge(staking1, 0, "10000")).wait();
        await expect(gaugeController.simple_vote(1, staking1, "1000")).to.be.revertedWith("VOTE_GAUGE_PAUSED");

        await (await gaugeController.connect(treasuryDao).toggle_vote_pause(staking1)).wait();
        await expect(gaugeController.simple_vote(1, staking1, "1000")).not.be.reverted;

        await (await gaugeController.connect(treasuryDao).toggle_vote_pause(staking1)).wait();
        await expect(gaugeController.simple_vote(1, staking1, "1000")).to.be.revertedWith("VOTE_GAUGE_PAUSED");
    });

    it("Success : vote : 1 gauge  / equal vote / 1 token   should be equal to 1 ", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2);

        await (await gaugeController.simple_vote(1, staking1, "1000")).wait();
        await (await gaugeController.simple_vote(1, staking2, "1000")).wait();
        const votingPower1 = await getVotingPower(staking1);
        const votingPower2 = await getVotingPower(staking2);
        expect(Number(votingPower1)).to.be.eq(Number(votingPower2));

        await time.increase(ONE_WEEK * 47n);
        await gaugeController.gauge_relative_weight_writes(0, 2);
        await gaugeController.checkpoint();

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);
    });

    it("Success : vote : 1 gauge  / equal vote / 2 token[1,1] : should be equal to 1", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2);

        await (await gaugeController.simple_vote(1, staking1, "1000")).wait();
        await (await gaugeController.simple_vote(3, staking2, "1000")).wait();
        const votingPower1 = await getVotingPower(staking1);
        const votingPower2 = await getVotingPower(staking2);
        expect(Number(votingPower1)).to.be.closeTo(Number(votingPower2), 250);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);
    });

    it("Success : vote : 2 gauge[2,1]  / equal vote / 1 token :  should be equal to 2", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2, 1);

        await (await gaugeController.simple_vote(1, staking1, "1000")).wait();
        await (await gaugeController.simple_vote(1, staking2, "1000")).wait();
        const votingPower1 = await getVotingPower(staking1);
        const votingPower2 = await getVotingPower(staking2);

        expect(Number(votingPower1)).to.be.eq(Number(votingPower2) * 2);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);
    });

    it("Success : vote : 1 gauge  / equal vote / 2 token[2,1] : should be equal to 2", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2);

        await (await gaugeController.simple_vote(2, staking1, "1000")).wait();
        await (await gaugeController.simple_vote(1, staking2, "1000")).wait();
        const votingPower1 = await getVotingPower(staking1);
        const votingPower2 = await getVotingPower(staking2);
        expect(Number(votingPower1)).to.be.closeTo(Number(votingPower2) * 2, 250);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);
    });

    it("Success : vote : 2 gauge[2,1]  / equal vote / 2 token[2,1] : should be equal to 4", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2, 1);

        await (await gaugeController.simple_vote(2, staking1, "1000")).wait();
        await (await gaugeController.simple_vote(1, staking2, "1000")).wait();
        const votingPower1 = await getVotingPower(staking1);
        const votingPower2 = await getVotingPower(staking2);
        expect(Number(votingPower1)).to.be.closeTo(Number(votingPower2) * 4, 250);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);
    });

    it("Success : vote : 3 gauge[2,1,1]  / equal vote / 1 token : should be equal to 2 ", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2, 1);
        await createAndActivateGauge(staking3, 2);

        await (await gaugeController.simple_vote(1, staking1, "1000")).wait();
        await (await gaugeController.simple_vote(1, staking2, "1000")).wait();
        await (await gaugeController.simple_vote(1, staking3, "1000")).wait();

        const votingPower1 = await getVotingPower(staking1);
        const votingPower2 = await getVotingPower(staking2);
        const votingPower3 = await getVotingPower(staking3);
        expect(Number(votingPower1)).to.be.eq(Number(votingPower2) * 2);
        expect(Number(votingPower3)).to.be.eq(Number(votingPower2) * 10);
    });
    it("Success : vote : 1 gauge  / vote[2,1,1] / 1 token : should be equal to 2", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2);
        await createAndActivateGauge(staking3);

        await (await gaugeController.simple_vote(1, staking1, "2000")).wait();
        await (await gaugeController.simple_vote(1, staking2, "1000")).wait();
        await (await gaugeController.simple_vote(1, staking3, "1000")).wait();

        const votingPower1 = await getVotingPower(staking1);
        const votingPower2 = await getVotingPower(staking2);
        const votingPower3 = await getVotingPower(staking3);

        expect(Number(votingPower1)).to.be.closeTo(Number(votingPower2) * 2, 0.03);
        expect(Number(votingPower1)).to.be.closeTo(Number(votingPower3) * 2, 0.03);
    });

    it("sucess : Add a gauge type", async () => {
        const type1 = await gaugeController.gauge_type_names(0);
        const type2 = await gaugeController.gauge_type_names(1);
        const type3 = await gaugeController.gauge_type_names(2);

        expect(type1).to.be.eq("A");
        expect(type2).to.be.eq("B");
        expect(type3).to.be.eq("C");
    });

    it("Success :  re-voting for same gauge with same params after 10 days should not change gauge weight", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2);
        await createAndActivateGauge(staking3);

        await gaugeController.simple_vote(1, staking1, "5000");
        await gaugeController.simple_vote(1, staking2, "3000");
        await gaugeController.simple_vote(1, staking3, "2000");

        await time.increase(10 * 86400);

        await gaugeController.gauge_relative_weight_write(staking1);

        const weightBeforeVote = await gaugeController.get_gauge_weight(staking1);
        await gaugeController.simple_vote(1, staking1, "5000");
        await gaugeController.simple_vote(1, staking2, "3000");
        await gaugeController.simple_vote(1, staking3, "2000");

        const weightAfterVote = await gaugeController.get_gauge_weight(staking1);
        expect(weightBeforeVote).to.be.equal(weightAfterVote);

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);
    });

    it("Fail : re-vote after 10 days with more than 100% in total should revert", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking3);
        await gaugeController.simple_vote(1, staking3, "1000");
        await time.increase(10 * 86400);
        await gaugeController.simple_vote(1, staking3, "1000");
        await expect(gaugeController.simple_vote(1, staking1, "10000")).to.be.revertedWith("Used too much power");
    });

    it("Fail : re-vote after 10 days with more than 100% in one gauge should revert", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking3);
        await time.increase(10 * 86400);
        await gaugeController.simple_vote(1, staking3, "0");
        await expect(gaugeController.simple_vote(1, staking1, "11000")).to.be.revertedWith("You used all your voting power");
    });

    it("Fail : Tries to vote for gauge with non-owned or non-delegated NFT", async () => {
        await createAndActivateGauge(staking1);
        await expect(gaugeController.connect(user1).simple_vote(1, staking1, 100)).to.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Success : Delegates vote from owner to user2 and votes", async () => {
        await createAndActivateGauge(staking1);
        await lockingPositionDelegate.delegateVeCvg(1, user2);
        expect(await gaugeController.connect(user2).simple_vote(1, staking1, "100")).to.not.throw;
    });

    it("Fail : cannot vote with a Timelock token", async () => {
        await createAndActivateGauge(staking2);
        const timestamp = (await ethers.provider.getBlock("latest"))?.timestamp;
        await lockingPositionManager.connect(owner).setLock(1, (timestamp || 0) + 5 * 86400);
        await expect(gaugeController.connect(owner).simple_vote(1, staking2, "100")).to.be.revertedWith("TOKEN_TIMELOCKED");
    });

    it("Success : Vote  is possible after end of timelock", async () => {
        await createAndActivateGauge(staking2);
        const timestamp = (await ethers.provider.getBlock("latest"))?.timestamp;
        await lockingPositionManager.connect(owner).setLock(1, (timestamp || 0) + 5 * 86400);
        await expect(gaugeController.connect(owner).simple_vote(1, staking2, "100")).to.be.revertedWith("TOKEN_TIMELOCKED");
        await time.increase(5 * 86400);
        expect(await gaugeController.connect(owner).simple_vote(1, staking2, "100")).not.throw;
    });

    it("Success : Vote multiple", async () => {
        await createAndActivateGauge(staking1);
        await createAndActivateGauge(staking2);
        await createAndActivateGauge(staking3);

        await gaugeController.multi_vote([
            {
                tokenId: "1",
                votes: [
                    {
                        gauge_address: staking2,
                        weight: "1000",
                    },
                    {
                        gauge_address: staking3,
                        weight: "2000",
                    },
                ],
            },
        ]);
        {
            const votingPower1 = await gaugeController.get_gauge_weight(staking1);
            const votingPower2 = await gaugeController.get_gauge_weight(staking2);
            const votingPower3 = await gaugeController.get_gauge_weight(staking3);
            expect(votingPower1).to.be.eq(0n);
            expect(votingPower3 / votingPower2).to.be.eq(2n);
        }

        await verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController);
    });

    it("Fails : Voting on gauge controller if not WL contract NOT_ALLOWED", async () => {
        await createAndActivateGauge(staking2);

        await lockingPositionManager.transferFrom(owner, positionLocker, 3);
        const txFail = positionLocker.voteGauge(3, staking2, 500);
        await expect(txFail).to.be.revertedWith("NOT_ALLOWED");
    });

    it("Success : Voting on gauge controller if WL contract", async () => {
        await createAndActivateGauge(staking2);
        await lockingPositionService.connect(treasuryDao).toggleContractLocker(positionLocker);
        await lockingPositionManager.transferFrom(owner, positionLocker, 3);
        await expect(positionLocker.voteGauge(3, staking2, 500)).not.to.be.reverted;
    });
});
