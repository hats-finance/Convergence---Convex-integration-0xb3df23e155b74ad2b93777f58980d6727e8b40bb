import {CONTROL_TOWER_CONTRACT, CVGSDT_POOL, ORACLE_CONTRACT, SDT_REWARD_DISTRIBUTOR_CONTRACT} from "../../../../../resources/contracts";
import {CvgControlTower, SdtRewardDistributor, CvgOracle} from "../../../../../typechain-types";
import {getAddress, getContract, sanityCheck} from "../../../complete/helper";

export const sanityCheckLiquidity = async () => {
    console.info("\x1b[35m ************ ControlTower ************ \x1b[0m");
    let current = CONTROL_TOWER_CONTRACT;
    const controlTowerContract = await getContract<CvgControlTower>(current);
    sanityCheck(await controlTowerContract.poolCvgSdt(), getAddress(CVGSDT_POOL), CVGSDT_POOL, CONTROL_TOWER_CONTRACT);

    console.info("\x1b[35m ************ SDT Reward Receiver ************ \x1b[0m");
    current = SDT_REWARD_DISTRIBUTOR_CONTRACT;
    const sdtRewardDistributor = await getContract<SdtRewardDistributor>(current);
    sanityCheck(await sdtRewardDistributor.poolCvgSDT(), getAddress(CVGSDT_POOL), CVGSDT_POOL, current);

    console.info("\x1b[35m ************ CvgOracle ************ \x1b[0m");
    current = ORACLE_CONTRACT;
    const cvgOracle = await getContract<CvgOracle>(current);
    // sanityCheck(await cvgOracle.cvg(), getAddress(CVG), CVG_CONTRACT, current);
    //TODO: check oracle params ?
};
