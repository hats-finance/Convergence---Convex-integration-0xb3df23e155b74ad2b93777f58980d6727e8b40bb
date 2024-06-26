import {ethers} from "hardhat";
import {IContractsUser} from "../../../utils/contractInterface";
import {MerkleHelper} from "../../../utils/MerkleHelper";

export async function deployIbo(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;
    const pepeWl = [
        await users.user1.getAddress(),
        await users.user7.getAddress(),
        await users.user8.getAddress(),
        await users.user9.getAddress(),
        await users.user10.getAddress(),
    ];
    const classicWl = [
        await users.user2.getAddress(),
        await users.user3.getAddress(),
        await users.user4.getAddress(),
        await users.user5.getAddress(),
        await users.user6.getAddress(),
    ];

    const rootPepe = MerkleHelper.getRoot(pepeWl);
    const rootWl = MerkleHelper.getRoot(classicWl);

    const iboContract = await ethers.deployContract("Ibo", [users.treasuryPod, contracts.bonds.bondCalculator, contracts.bonds.cvgOracle, rootPepe, rootWl]);
    await iboContract.waitForDeployment();

    return {
        ...contractsUsers,
        contracts: {
            ...contracts,
            presaleVesting: {
                ...contracts.presaleVesting,
                ibo: iboContract,
            },
        },
    };
}
