import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
const expect = chai.expect;
import {zeroAddress} from "@nomicfoundation/ethereumjs-util";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deploySdtStakingFixture, deployYsDistributorFixture, increaseCvgCycle, increaseCvgCycleWithoutTime} from "../../fixtures/stake-dao";
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {Signer, AddressLike, BigNumberish, parseEther} from "ethers";
import {ethers} from "hardhat";
import {
    SdtStakingPositionService,
    CvgSdtBuffer,
    MockFeeDistributor,
    LockingPositionService,
    ERC20,
    Cvg,
    CvgSDT,
    contracts,
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
import {CYCLE_1, TOKEN_1} from "../../../resources/constant";
import {verifyYsSumBalancesEqualsTotalSupply} from "../../../utils/locking/invariants.checks";

describe("CvgRewards : Pass 1 cycle without triggering", function () {
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
    it("Fail: add gauge with random user", async () => {
        await cvgRewards.addGauge(user1).should.be.revertedWith("NOT_GAUGE_CONTROLLER");
    });
    it("Fail: remove gauge with random user", async () => {
        await cvgRewards.removeGauge(user1).should.be.revertedWith("NOT_GAUGE_CONTROLLER");
    });
    it("Fail: initialize ysDistributor", async () => {
        await cvgRewards.initialize(user1).should.be.revertedWith("Initializable: contract is already initialized");
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
    const CHUNK_CHECKPOINT = 3;
    const CHUNK_TOTAL_WEIGHT = 6;
    const CHUNK_DISTRIBUTE = 4;

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
            await verifyYsSumBalancesEqualsTotalSupply;

            await gaugeController.connect(await ethers.getSigner(await lockingPositionManager.ownerOf(i))).multi_vote([{tokenId: i, votes: listVotes}]);
        }
    });

    it("Success : Update in time 2 weeks, Create a lock on cycle 3 in time", async () => {
        let votesBefore = await getGaugeControllerVotes(gaugeController, cvgRewards);

        await time.increase(14 * 86_400);
        await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_1, ethers.parseEther("100"), ethers.ZeroAddress);

        expect(await cvgControlTower.cvgCycle()).to.be.eq(1);
    });

    it("Success : Update Cycle from 1 to 3 diretcly", async () => {
        await increaseCvgCycle(contractsUsers, 1);

        expect(await cvgControlTower.cvgCycle()).to.be.eq(2);

        await increaseCvgCycle(contractsUsers, 1);
        expect(await cvgControlTower.cvgCycle()).to.be.eq(3);
    });
});
