import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
const expect = chai.expect;
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle, increaseCvgCycleWithoutTime} from "../../fixtures/stake-dao";
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {Signer, AddressLike, BigNumberish, parseEther} from "ethers";
import {ethers} from "hardhat";
import {
    SdtStakingPositionService,
    CvgSdtBuffer,
    LockingPositionService,
    ERC20,
    Cvg,
    CvgSDT,
    CvgRewards,
    TestStaking,
    CvgControlTower,
    LockingPositionManager,
} from "../../../typechain-types";
import {IContracts, IContractsUser, IUsers} from "../../../utils/contractInterface";
import {GaugeController} from "../../../typechain-types-vyper/GaugeController";
import {generateRandomMintParams, generateRandomNumbers} from "../../../utils/global/generateRandomNumbers";
import {getGaugeControllerVotes} from "../../../utils/gaugeController/getGaugeControllerState";
import {calcStakingInflation} from "../../../utils/global/computeCvgStakingInflation";
import {CYCLE_1, CYCLE_2, CYCLE_3, CYCLE_4, ONE_WEEK} from "../../../resources/constant";

describe("CvgRewards : write staking rewards full", function () {
    let contractsUsers: IContractsUser, contracts: IContracts, users: IUsers;
    let owner: Signer, user1: Signer, user2: Signer, veSdtMultisig: Signer, treasuryDao: Signer;
    let cvgSdtStakingContract: SdtStakingPositionService,
        cvgSdtBuffer: CvgSdtBuffer,
        cvgRewards: CvgRewards,
        gaugeController: GaugeController,
        lockingPositionService: LockingPositionService,
        lockingPositionManager: LockingPositionManager,
        cvgControlTower: CvgControlTower;
    let sdt: ERC20, cvg: Cvg, cvgSdt: CvgSDT, sdFRAX3CRV: ERC20;
    let gauges: TestStaking[];

    before(async () => {
        contractsUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractsUsers.contracts;
        users = contractsUsers.users;

        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        treasuryDao = users.treasuryDao;

        cvgRewards = contracts.rewards.cvgRewards;
        gaugeController = contracts.locking.gaugeController;
        cvgControlTower = contracts.base.cvgControlTower;
        lockingPositionService = contracts.locking.lockingPositionService;
        lockingPositionManager = contracts.locking.lockingPositionManager;

        cvg = contracts.tokens.cvg;

        const TestStakingFactory = await ethers.getContractFactory("TestStaking");
        gauges = [
            await TestStakingFactory.deploy(),
            await TestStakingFactory.deploy(),
            await TestStakingFactory.deploy(),
            await TestStakingFactory.deploy(),
            await TestStakingFactory.deploy(),
            await TestStakingFactory.deploy(),
            await TestStakingFactory.deploy(),
        ];

        await cvg.connect(owner).transfer(user1, parseEther("10000000"));
        await cvg.connect(owner).transfer(user2, parseEther("10000000"));

        await cvg.connect(user1).approve(lockingPositionService, ethers.MaxUint256);
        await cvg.connect(user2).approve(lockingPositionService, ethers.MaxUint256);
    });

    it("Success : Adding gauge type", async () => {
        const txAddTypeA = await (await gaugeController.connect(treasuryDao).add_type("A", "10")).wait();
        const txAddTypeB = await (await gaugeController.connect(treasuryDao).add_type("B", "15")).wait();
    });

    it("Success : Adding gauges in the Control tower", async () => {
        for (let index = 0; index < gauges.length - 3; index++) {
            const gauge = gauges[index];
            await cvgControlTower.connect(treasuryDao).toggleStakingContract(gauge);
            await gaugeController.connect(treasuryDao).add_gauge(gauge, 0, 0);
            await gaugeController.connect(treasuryDao).toggle_vote_pause(gauge);
            expect(await cvgRewards.gauges(index)).to.be.eq(await gauge.getAddress());
            expect(await cvgRewards.gaugesId(gauge)).to.be.eq(index);
        }

        for (let index = gauges.length - 3; index < gauges.length; index++) {
            const gauge = gauges[index];
            await cvgControlTower.connect(treasuryDao).toggleStakingContract(gauge);
            await gaugeController.connect(treasuryDao).add_gauge(gauge, 1, 0);
            await gaugeController.connect(treasuryDao).toggle_vote_pause(gauge);
            expect(await gaugeController.gauges(index)).to.be.eq(await gauge.getAddress());
            expect(await cvgRewards.gaugesId(gauge)).to.be.eq(index);
        }
    });

    it("Success: Create locking tokens", async () => {
        const CYCLE_1 = 1;
        const lock1 = generateRandomMintParams(CYCLE_1);
        await lockingPositionService.connect(user1).mintPosition(lock1.lockDuration, lock1.amount, lock1.ysPercentage, user1, true);

        const lock2 = generateRandomMintParams(CYCLE_1);
        await lockingPositionService.connect(user1).mintPosition(lock2.lockDuration, lock2.amount, lock2.ysPercentage, user1, true);

        const lock3 = generateRandomMintParams(CYCLE_1);
        await lockingPositionService.connect(user2).mintPosition(lock3.lockDuration, lock3.amount, lock3.ysPercentage, user2, true);

        const lock4 = generateRandomMintParams(CYCLE_1);
        await lockingPositionService.connect(user2).mintPosition(lock4.lockDuration, lock4.amount, lock4.ysPercentage, user2, true);
    });

    it("Success: Random voting on gauge sucess voting", async () => {
        for (let i = 1; i < 4; i++) {
            const votesGenerated = generateRandomNumbers(gauges.length);
            const listVotes: {
                gauge_address: AddressLike;
                weight: BigNumberish;
            }[] = [];

            for (let j = 0; j < gauges.length; j++) {
                const gaugeAddress = gauges[j];
                listVotes.push({
                    gauge_address: gaugeAddress,
                    weight: votesGenerated[j],
                });
            }

            await gaugeController.connect(await ethers.getSigner(await lockingPositionManager.ownerOf(i))).multi_vote([{tokenId: i, votes: listVotes}]);
        }
    });

    it("Success : Checks init state of CvgRewards", async () => {
        expect(await cvgRewards.state()).to.be.eq(0);
    });

    it("Fails : Need to wait 7 days to be able to trigger Cvg distribution", async () => {
        await expect(cvgRewards.writeStakingRewards(1)).to.be.revertedWith("NEED_WAIT_7_DAYS");
    });

    it("Success : Updating all gauge Weights on CHECKPOINT state", async () => {
        const votesBefore = await getGaugeControllerVotes(gaugeController, cvgRewards);

        await time.increase(7 * 86_400);
        await cvgRewards.writeStakingRewards(1);

        const votesAfter = await getGaugeControllerVotes(gaugeController, cvgRewards);

        // Verify that gauges weight are smaller after the checkpoint than before
        for (let index = 0; index < votesBefore.gaugeVotes.length; index++) {
            expect(votesBefore.gaugeVotes[index].veCvgAmount).to.be.gt(votesAfter.gaugeVotes[index].veCvgAmount);
        }

        expect(await cvgRewards.cursor()).to.be.eq(0);
        expect(await cvgRewards.state()).to.be.eq(1);
        expect(await gaugeController.isLock()).to.be.eq(true);
    });

    it("Success : Performing the DISTRIBUTE", async () => {
        await cvgRewards.writeStakingRewards(1);

        const votes = await getGaugeControllerVotes(gaugeController, cvgRewards);

        const cvgInflation = calcStakingInflation(1);
        for (let index = 0; index < votes.gaugeVotes.length; index++) {
            expect(await gauges[index].stakingCycle()).to.be.eq(CYCLE_1 + 1);
            const cycleInfo = await gauges[index].cycleInfo(CYCLE_1);
            expect(cycleInfo.isCvgProcessed).to.be.eq(true);
            expect(cycleInfo.cvgRewardsAmount).to.be.eq((cvgInflation * votes.gaugeVotes[index].veCvgAmount) / votes.totalVeCvg);
        }
        expect(await cvgRewards.cursor()).to.be.eq(0);
        expect(await cvgRewards.state()).to.be.eq(2);
        expect(await gaugeController.isLock()).to.be.eq(true);
    });

    it("Fails : Updating global Cvg Cycle through other address than CvgRewards", async () => {
        await expect(cvgControlTower.updateCvgCycle()).to.be.revertedWith("NOT_CVG_REWARDS");
    });

    it("Success : Updating global Cvg Cycle ", async () => {
        await cvgRewards.writeStakingRewards(1);
    });

    it("Success : Process CVG rewards for cycle 2", async () => {
        await increaseCvgCycle(contractsUsers, 1);

        const votes = await getGaugeControllerVotes(gaugeController, cvgRewards);

        const cvgInflation = calcStakingInflation(CYCLE_2);
        for (let index = 0; index < votes.gaugeVotes.length; index++) {
            expect(await gauges[index].stakingCycle()).to.be.eq(CYCLE_3);
            const cycleInfo = await gauges[index].cycleInfo(CYCLE_2);
            expect(cycleInfo.isCvgProcessed).to.be.eq(true);
            expect(cycleInfo.cvgRewardsAmount).to.be.eq((cvgInflation * votes.gaugeVotes[index].veCvgAmount) / votes.totalVeCvg);
        }
        expect(await cvgRewards.cursor()).to.be.eq(0);
        expect(await cvgRewards.state()).to.be.eq(0);
        expect(await gaugeController.isLock()).to.be.eq(false);
    });

    it("Success : Kill a gauge and modify the weight of the type", async () => {
        await gaugeController.connect(treasuryDao).kill_gauge(gauges[2]);
        await gaugeController.connect(treasuryDao).kill_gauge(gauges[4]);

        await gaugeController.connect(treasuryDao).change_type_weight(0, 1);
        await gaugeController.connect(treasuryDao).change_type_weight(1, 8);
    });

    it("Success : Process CVG rewards for cycle 3", async () => {
        await time.increase(ONE_WEEK);
        await increaseCvgCycleWithoutTime(contractsUsers, 1);

        const votes = await getGaugeControllerVotes(gaugeController, cvgRewards);

        const cvgInflation = calcStakingInflation(CYCLE_3);
        const activeGaugesLength = await cvgRewards.gaugesLength();
        for (let index = 0; index < activeGaugesLength; index++) {
            const gauge = await ethers.getContractAt("TestStaking", await cvgRewards.gauges(index));
            expect(await gauge.stakingCycle()).to.be.eq(CYCLE_4);
            const cycleInfo = await gauge.cycleInfo(CYCLE_3);
            expect(cycleInfo.isCvgProcessed).to.be.eq(true);
            expect(cycleInfo.cvgRewardsAmount).to.be.eq((cvgInflation * votes.gaugeVotes[index].veCvgAmount) / votes.totalVeCvg);
        }
        expect(await cvgRewards.cursor()).to.be.eq(0);
        expect(await cvgRewards.state()).to.be.eq(0);
        expect(await gaugeController.isLock()).to.be.eq(false);
    });

    for (let cycle = 4; cycle < 30; cycle++) {
        it("Success :  Process CVG rewards for cycle " + cycle, async () => {
            await time.increase(ONE_WEEK);
            await increaseCvgCycleWithoutTime(contractsUsers, 1);

            const votes = await getGaugeControllerVotes(gaugeController, cvgRewards);
            const cvgInflation = calcStakingInflation(cycle);
            for (let index = 0; index < votes.gaugeVotes.length; index++) {
                const gauge = await ethers.getContractAt("TestStaking", await cvgRewards.gauges(index));
                expect(await gauge.stakingCycle()).to.be.eq(cycle + 1);
                const cycleInfo = await gauge.cycleInfo(cycle);
                expect(cycleInfo.isCvgProcessed).to.be.eq(true);
                expect(cycleInfo.cvgRewardsAmount).to.be.eq((cvgInflation * votes.gaugeVotes[index].veCvgAmount) / votes.totalVeCvg);
            }
            expect(await cvgRewards.cursor()).to.be.eq(0);
            expect(await cvgRewards.state()).to.be.eq(0);
            expect(await gaugeController.isLock()).to.be.eq(false);
        });
    }
});
