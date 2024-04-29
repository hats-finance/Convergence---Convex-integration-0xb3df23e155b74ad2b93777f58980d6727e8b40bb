import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {impersonateAccount, time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {getSigner} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {ethers, upgrades} from "hardhat";
import {Signer} from "ethers";

import {CvgControlTower, CvgRewards, CvgRewardsV2, Mock_CvgControlTowerV2, ProxyAdmin} from "../../../typechain-types";
import {IUsers, IContractsUserMainnet} from "../../../utils/contractInterface";
import {deployRewardsFixture, fetchMainnetContracts, increaseCvgCycle} from "../../fixtures/stake-dao";
import {getAddress, getContract, getMainnetAddress} from "../../../scripts/deployer/complete/helper";
import {CVG_REWARDS_CONTRACT} from "../../../resources/contracts";
import {TREASURY_DAO} from "../../../resources/treasury";

import {goOnNextWeek} from "../../../utils/locking/invariants.checks";

import {calcStakingInflation} from "../../../utils/global/computeCvgStakingInflation";
import {GaugeController} from "../../../typechain-types-vyper";

chai.use(chaiAsPromised).should();
const expect = chai.expect;

describe.skip("CvgRewardsV2 - Test migration", () => {
    let treasuryDao: Signer;
    let controlTowerContract: CvgControlTower;

    let proxyAdmin: ProxyAdmin;
    let cvgRewards: CvgRewards;
    let gaugeController: GaugeController;

    let cvgRewardsV2: CvgRewardsV2;
    let baseTestContract: any;
    let contractsUsers: IContractsUserMainnet, users: IUsers;

    before(async () => {
        contractsUsers = await loadFixture(fetchMainnetContracts);
        users = contractsUsers.users;

        baseTestContract = await ethers.deployContract("BaseTest", []);
        await baseTestContract.waitForDeployment();

        treasuryDao = users.treasuryDao;
        proxyAdmin = contractsUsers.base.proxyAdmin;
        controlTowerContract = contractsUsers.base.cvgControlTower;
        cvgRewards = contractsUsers.rewards.cvgRewards;
        gaugeController = contractsUsers.locking.gaugeController;
    });

    it("Success : Upgrade the CvgRewards on the V2", async () => {
        await users.user1.sendTransaction({
            to: TREASURY_DAO,
            value: ethers.parseEther("100"),
        });

        await impersonateAccount(TREASURY_DAO);
        const treasuryDao = await ethers.getSigner(TREASURY_DAO);

        //implementation
        const CvgRewardsFactory = await ethers.getContractFactory("CvgRewards");
        const CvgRewardsFactoryV2 = await ethers.getContractFactory("CvgRewardsV2");
        await upgrades.validateUpgrade(CvgRewardsFactory, CvgRewardsFactoryV2);

        cvgRewardsV2 = await ethers.deployContract("CvgRewardsV2", []);
        await cvgRewardsV2.waitForDeployment();

        //upgrade proxy
        await proxyAdmin.connect(treasuryDao).upgrade(cvgRewards, cvgRewardsV2);
        cvgRewardsV2 = (await ethers.getContractAt("CvgRewardsV2", cvgRewards)) as CvgRewardsV2;
        (await cvgRewardsV2.cvgControlTower()).should.be.equal(await cvgRewardsV2.cvgControlTower());
        (await cvgRewardsV2.owner()).should.be.equal(await treasuryDao.getAddress());
        (await cvgRewardsV2.getAddress()).should.be.equal(await getMainnetAddress(CVG_REWARDS_CONTRACT));
    });
    let gaugesResultRepeted: CvgRewardsV2.GaugeViewStructOutput[];
    let lastWeights: bigint[] = [];
    it("Success : Cycle passage of cycle 4 -> 5", async () => {
        // Uses old method and stores actual gauges votes
        await goOnNextWeek();

        await cvgRewardsV2.connect(treasuryDao).writeStakingRewards(3);
        gaugesResultRepeted = await cvgRewardsV2.getGaugeChunk(0, 50);

        const totalWeight = await gaugeController.get_total_weight();
        for (let i = 0; i < gaugesResultRepeted.length; i++) {
            const lastWeight = await cvgRewardsV2.lastWeights(gaugesResultRepeted[i].stakingAddress);
            const staking = await ethers.getContractAt("SdtStakingPositionService", gaugesResultRepeted[i].stakingAddress);
            expect((await staking.cycleInfo(4)).cvgRewardsAmount).to.be.eq((lastWeight * calcStakingInflation(4)) / totalWeight);
            lastWeights.push(lastWeight);
        }
    });

    it("Success : Votes in cycle 5, will not impact vote gauges", async () => {
        const veOwner = "0x85659407220A0D0bE9D142A578649759CE71533E";
        await users.user2.sendTransaction({
            to: veOwner,
            value: ethers.parseEther("100"),
        });

        await impersonateAccount(veOwner);
        await gaugeController.connect(await ethers.getSigner(veOwner)).multi_vote([
            {
                tokenId: 198,
                votes: [{gauge_address: "0x11886B0ed77e9a434cB3185eF27F211C6BD696bF", weight: 1000}],
            },
        ]);
    });
    it("Success : Cycle passage of cycle 5 -> 6", async () => {
        const lastTotalWeight = await cvgRewardsV2.lastTotalWeight();

        await goOnNextWeek();
        await cvgRewardsV2.connect(treasuryDao).writeStakingRewards(3);

        for (let i = 0; i < gaugesResultRepeted.length; i++) {
            const staking = await ethers.getContractAt("SdtStakingPositionService", gaugesResultRepeted[i].stakingAddress);

            const distrib5 = (await staking.cycleInfo(5)).cvgRewardsAmount;
            expect(distrib5).to.be.eq((lastWeights[i] * calcStakingInflation(5)) / lastTotalWeight);
            expect(distrib5).to.be.eq((await staking.cycleInfo(4)).cvgRewardsAmount);
            lastWeights[i] = await cvgRewardsV2.lastWeights(gaugesResultRepeted[i].stakingAddress);
        }
    });

    it("Success : Cycle passage of cycle 6 -> 7", async () => {
        const lastTotalWeight = await cvgRewardsV2.lastTotalWeight();

        await goOnNextWeek();
        await cvgRewardsV2.connect(treasuryDao).writeStakingRewards(3);

        for (let i = 0; i < gaugesResultRepeted.length; i++) {
            const staking = await ethers.getContractAt("SdtStakingPositionService", gaugesResultRepeted[i].stakingAddress);

            expect((await staking.cycleInfo(6)).cvgRewardsAmount).to.be.eq((lastWeights[i] * calcStakingInflation(6)) / lastTotalWeight);
        }
    });
});
