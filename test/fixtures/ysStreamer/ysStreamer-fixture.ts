import {ethers, upgrades} from "hardhat";
import {TREASURY_DAO} from "../../../resources/treasury";
import {YsStreamer} from "../../../typechain-types";
import {deployProxy} from "../../../utils/global/deployProxy";
import {fetchMainnetContracts} from "../stake-dao";
import {impersonateAccount, setStorageAt, time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {THIEF_TOKEN_CONFIG} from "../../../utils/thief/thiefConfig";
import {chainView} from "../../../scripts/chainview";
import {JsonRpcProvider} from "ethers";

export async function ysStreamerFixture(isSetup: boolean) {
    const contractsUsers = await fetchMainnetContracts();
    const users = contractsUsers.users;
    await users.user1.sendTransaction({to: TREASURY_DAO, value: ethers.parseEther("100")});
    await impersonateAccount(TREASURY_DAO);
    const treasuryDao = await ethers.getSigner(TREASURY_DAO);

    const crv = contractsUsers.globalAssets.crv;
    const cvx = contractsUsers.globalAssets.cvx;
    const fxs = contractsUsers.globalAssets.fxs;

    const ysStreamer = await deployProxy<YsStreamer>("", [], "YsStreamer", contractsUsers.base.proxyAdmin);

    /// Migration LockingPositionService
    const LockingPositionServiceFactory = await ethers.getContractFactory("LockingPositionService");
    const LockingPositionServiceV2Factory = await ethers.getContractFactory("LockingPositionServiceV2");
    await upgrades.validateUpgrade(LockingPositionServiceFactory, LockingPositionServiceV2Factory);

    let lockingV2Implem = await ethers.deployContract("LockingPositionServiceV2", []);
    await lockingV2Implem.waitForDeployment();

    await contractsUsers.base.proxyAdmin.connect(treasuryDao).upgrade(contractsUsers.locking.lockingPositionService, lockingV2Implem);

    if (isSetup) {
        await setStorageAt(THIEF_TOKEN_CONFIG.FXS.address, 11, 0);
        // Mint some locking position
        const actualCycle = Number(await contractsUsers.rewards.cvgRewards.getCycleLocking((await ethers.provider.getBlock("latest"))!.timestamp));

        const maxDuration = (actualCycle + 12) % 12 === 0 ? 96 : 96 - (12 - (Math.trunc((actualCycle + 12) / 12) * 12 - actualCycle));
        const nextId = await contractsUsers.locking.lockingPositionManager.nextId();

        const lockingService = contractsUsers.locking.lockingPositionService;
        await contractsUsers.cvg.connect(users.user1).approve(lockingService, ethers.MaxUint256);
        await contractsUsers.cvg.connect(users.user2).approve(lockingService, ethers.MaxUint256);

        await lockingService.connect(users.user1).mintPosition(maxDuration, ethers.parseEther("10000"), 100, users.user1, true);
        await lockingService.connect(users.user1).mintPosition(maxDuration, ethers.parseEther("95324"), 30, users.user1, true);
        await lockingService.connect(users.user2).mintPosition(maxDuration, ethers.parseEther("100000"), 80, users.user2, true);

        // Add & distribute rewards
        await crv.connect(users.user2).approve(ysStreamer, ethers.MaxUint256);
        await cvx.connect(users.user2).approve(ysStreamer, ethers.MaxUint256);
        await fxs.connect(users.user2).approve(ysStreamer, ethers.MaxUint256);

        await ysStreamer.connect(treasuryDao).addReward([
            {token: crv, distributor: users.user2},
            {token: cvx, distributor: users.user2},
            {token: fxs, distributor: users.user2},
        ]);

        await ysStreamer.connect(users.user2).notifyRewardAmount([
            {token: crv, amount: ethers.parseEther("10000")},
            {token: cvx, amount: ethers.parseEther("10000")},
            {token: fxs, amount: ethers.parseEther("10000")},
        ]);

        // Checkin some positions ( not all for testing)
        await ysStreamer.checkInMultiple([nextId, nextId + 1n]);
    }

    console.log(await ysStreamer.getAddress());

    return {
        ...contractsUsers,
        ysStreamer,
    };
}

ysStreamerFixture(true);
