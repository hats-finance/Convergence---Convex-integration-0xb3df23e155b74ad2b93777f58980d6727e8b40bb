import {ethers} from "hardhat";
import {IContractsUser} from "../../../utils/contractInterface";
import {deployProxy} from "../../../utils/global/deployProxy";
import {BondDepository} from "../../../typechain-types";

export async function deployBondDepositoryContract(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;
    const cvgControlTower = contracts.base.cvgControlTower;

    const sigParams = "address";
    const params = [await cvgControlTower.getAddress()];
    const bondDepository = await deployProxy<BondDepository>(sigParams, params, "BondDepository", contracts.base.proxyAdmin);

    await (await cvgControlTower.connect(users.treasuryDao).setBondDepository(bondDepository)).wait();
    await (await cvgControlTower.connect(users.treasuryDao).toggleBond(bondDepository)).wait();

    await (await contracts.bonds.bondPositionManager.connect(users.treasuryDao).setBondDepository(bondDepository)).wait();
    await contracts.locking.lockingPositionService.connect(users.treasuryDao).toggleSpecialLocker(bondDepository);

    return {
        users: users,
        contracts: {
            ...contracts,
            bonds: {
                ...contracts.bonds,
                bondDepository: bondDepository,
            },
        },
    };
}
