import {ethers} from "hardhat";
import {IContractsUser} from "../../../utils/contractInterface";
import {LockingLogo} from "../../../typechain-types";
import {deployProxy} from "../../../utils/global/deployProxy";

export async function deployLockingLogo(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;
    const cvgControlTower = contracts.base.cvgControlTower;

    const sigParams = "address";
    const params = [await cvgControlTower.getAddress()];
    const lockingLogo = await deployProxy<LockingLogo>(sigParams, params, "LockingLogo", contracts.base.proxyAdmin);

    await (await contracts.locking.lockingPositionManager.connect(users.treasuryDao).setLogo(lockingLogo)).wait();

    return {
        ...contractsUsers,
        contracts: {
            ...contracts,
            locking: {
                ...contracts.locking,
                lockingLogo: lockingLogo,
            },
        },
    };
}
