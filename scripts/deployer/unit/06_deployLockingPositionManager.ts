import {LockingPositionDelegate, LockingPositionManager, LockingPositionService} from "../../../typechain-types/contracts/Locking";
import {IContractsUser} from "../../../utils/contractInterface";
import {deployProxy} from "../../../utils/global/deployProxy";

export async function deployLockingPositionManagerContract(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;

    const cvgControlTower = contracts.base.cvgControlTower;
    const proxyAdmin = contracts.base.proxyAdmin;

    const sigParams = "address";

    const params = [await contracts.base.cvgControlTower.getAddress()];

    // LOCKING POSITION DELEGATE
    const lockingPositionDelegateContract = await deployProxy<LockingPositionDelegate>(sigParams, params, "LockingPositionDelegate", proxyAdmin);
    await (await cvgControlTower.connect(users.treasuryDao).setLockingPositionDelegate(lockingPositionDelegateContract)).wait();

    // LOCKING POSITION MANAGER
    const lockingPositionManagerContract = await deployProxy<LockingPositionManager>(sigParams, params, "LockingPositionManager", proxyAdmin);
    await (await cvgControlTower.connect(users.treasuryDao).setLockingPositionManager(lockingPositionManagerContract)).wait();

    // LOCKING POSITION SERVICE
    const lockingPositionServiceContract = await deployProxy<LockingPositionService>(sigParams, params, "LockingPositionService", proxyAdmin);

    await (await cvgControlTower.connect(users.treasuryDao).setLockingPositionService(lockingPositionServiceContract)).wait();

    await lockingPositionManagerContract.setLockingPositionService(lockingPositionServiceContract);
    await lockingPositionDelegateContract.setLockingPositionManager(lockingPositionManagerContract);

    await (await lockingPositionServiceContract.setCvgRewards(contracts.rewards.cvgRewards)).wait();
    await (await lockingPositionServiceContract.setVotingPowerEscrow(contracts.locking.veCvg)).wait();

    //transferOwnership
    await lockingPositionDelegateContract.transferOwnership(users.treasuryDao);
    await lockingPositionDelegateContract.connect(users.treasuryDao).acceptOwnership();
    await lockingPositionManagerContract.transferOwnership(users.treasuryDao);
    await lockingPositionManagerContract.connect(users.treasuryDao).acceptOwnership();
    await lockingPositionServiceContract.transferOwnership(users.treasuryDao);
    await lockingPositionServiceContract.connect(users.treasuryDao).acceptOwnership();

    return {
        ...contractsUsers,
        contracts: {
            ...contracts,
            locking: {
                ...contracts.locking,
                lockingPositionManager: lockingPositionManagerContract,
                lockingPositionService: lockingPositionServiceContract,
                lockingPositionDelegate: lockingPositionDelegateContract,
            },
        },
    };
}
