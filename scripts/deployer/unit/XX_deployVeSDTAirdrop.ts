import {ethers} from "hardhat";
import {IContractsUser} from "../../../utils/contractInterface";
import {GlobalHelper} from "../../../utils/GlobalHelper";

export async function deployVeSDTAirdrop(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;
    const VeSDTAirdropFactory = await ethers.getContractFactory("VeSDTAirdrop");

    const veSDTAirdrop = await VeSDTAirdropFactory.deploy(contracts.base.cvgControlTower);
    await veSDTAirdrop.waitForDeployment();

    return {
        ...contractsUsers,
        contracts: {
            ...contracts,
            presaleVesting: {
                ...contracts.presaleVesting,
                veSDTAirdrop: veSDTAirdrop,
            },
        },
    };
}
