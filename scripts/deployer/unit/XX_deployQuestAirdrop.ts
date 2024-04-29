import {ethers} from "hardhat";
import {IContractsUser} from "../../../utils/contractInterface";

export async function deployQuestAirdrop(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;
    const QuestAirdropFactory = await ethers.getContractFactory("QuestAirdrop");
    const questAirdrop = await QuestAirdropFactory.deploy(contracts.base.cvgControlTower);
    await questAirdrop.waitForDeployment();

    return {
        ...contractsUsers,
        contracts: {
            ...contracts,
            presaleVesting: {
                ...contracts.presaleVesting,
                questAirdrop: questAirdrop,
            },
        },
    };
}
