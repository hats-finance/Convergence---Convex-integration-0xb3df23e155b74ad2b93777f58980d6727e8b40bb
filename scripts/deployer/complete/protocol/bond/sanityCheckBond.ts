import {CONTROL_TOWER_CONTRACT} from "../../../../../resources/contracts";

import {CvgControlTower} from "../../../../../typechain-types";

import {getContract, sanityCheck} from "../../../complete/helper";

export const sanityCheckBond = async () => {
    console.info("\x1b[35m ************ ControlTower ************ \x1b[0m");
    let current = CONTROL_TOWER_CONTRACT;
    const controlTowerContract = await getContract<CvgControlTower>(current);

    //TODO: check bond params ?
};
