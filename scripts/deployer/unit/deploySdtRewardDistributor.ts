import {ethers} from "hardhat";
import {SdtRewardDistributor} from "../../../typechain-types";
import {IContractsUser} from "../../../utils/contractInterface";
import {deployProxy} from "../../../utils/global/deployProxy";

export async function deploySdtRewardDistributor(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;
    const cvgControlTower = contracts.base.cvgControlTower;

    const sigParams = "address";
    const params = [await cvgControlTower.getAddress()];
    const sdtRewardDistributor = await deployProxy<SdtRewardDistributor>(sigParams, params, "SdtRewardDistributor", contracts.base.proxyAdmin);

    await (await cvgControlTower.connect(users.treasuryDao).setSdtRewardDistributor(sdtRewardDistributor)).wait();

    await (await sdtRewardDistributor.connect(users.treasuryDao).setPoolCvgSdtAndApprove(contracts.lp.stablePoolCvgSdt, ethers.MaxUint256)).wait();
    await (await cvgControlTower.connect(users.treasuryDao).toggleStakingContract(sdtRewardDistributor)).wait();

    return {
        ...contractsUsers,
        contracts: {
            ...contracts,
            stakeDao: {
                ...contracts.stakeDao,
                sdtRewardDistributor: sdtRewardDistributor,
            },
        },
    };
}
