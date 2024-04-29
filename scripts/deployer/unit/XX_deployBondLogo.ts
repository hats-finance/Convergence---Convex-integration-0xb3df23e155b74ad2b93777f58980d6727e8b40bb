import {ethers} from "hardhat";
import {IContractsUser} from "../../../utils/contractInterface";
import {BondLogo} from "../../../typechain-types";
import {deployProxy} from "../../../utils/global/deployProxy";

export async function deployBondLogo(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;

    const cvgControlTower = contracts.base.cvgControlTower;

    const sigParams = "address";
    const params = [await cvgControlTower.getAddress()];
    const bondLogo = await deployProxy<BondLogo>(sigParams, params, "BondLogo", contracts.base.proxyAdmin);

    await (await contracts.bonds.bondPositionManager.connect(users.treasuryDao).setLogo(bondLogo)).wait();

    return {
        ...contractsUsers,
        contracts: {
            ...contracts,
            bonds: {
                ...contracts.bonds,
                bondLogo: bondLogo,
            },
        },
    };
}
