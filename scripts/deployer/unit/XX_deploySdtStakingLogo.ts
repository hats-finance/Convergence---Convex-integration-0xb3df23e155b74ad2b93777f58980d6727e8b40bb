import {IContractsUser} from "../../../utils/contractInterface";
import {ethers} from "hardhat";
import {sdtStakingLogos} from "../../../resources/staking_logos";
import {TOKEN_ADDR_SD_FRAX_3CRV} from "../../../resources/tokens/stake-dao";
import {SdtStakingLogo} from "../../../typechain-types";
import {deployProxy} from "../../../utils/global/deployProxy";

export async function deploySdtStakingLogo(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;
    const cvgControlTower = contractsUsers.contracts.base.cvgControlTower;

    const sigParams = "address";
    const params = [await cvgControlTower.getAddress()];
    const sdtStakingLogo = await deployProxy<SdtStakingLogo>(sigParams, params, "SdtStakingLogo", contracts.base.proxyAdmin);

    await (await contracts.stakeDao.sdtStakingPositionManager.connect(contractsUsers.users.treasuryDao).setLogo(sdtStakingLogo)).wait();
    await (await sdtStakingLogo.setTokensLogo(Object.keys(sdtStakingLogos), Object.values(sdtStakingLogos))).wait();
    await sdtStakingLogo.transferOwnership(contractsUsers.users.treasuryDao);
    await sdtStakingLogo.connect(contractsUsers.users.treasuryDao).acceptOwnership();

    return {
        ...contractsUsers,
        contracts: {
            ...contractsUsers.contracts,
            stakeDao: {
                ...contractsUsers.contracts.stakeDao,
                sdtStakingLogo: sdtStakingLogo,
            },
        },
    };
}
