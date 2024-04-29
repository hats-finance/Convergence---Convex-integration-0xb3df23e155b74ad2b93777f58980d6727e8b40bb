import hre, {ethers} from "hardhat";
import {deployConvexFixture, fetchMainnetConvexContracts} from "../../../../../test/fixtures/convex-fixtures";
import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {writeMultiple} from "../../helper";
import {TREASURY_DAO} from "../../../../../resources/treasury";
import {getPositionsConvex} from "./getPositionsConvex";
import {createConvexDistribution} from "./createConvexDistribution";

async function main() {
    let contractsUsers = await loadFixture(deployConvexFixture);
    writeMultiple(contractsUsers);
    // transfer 1 wei of to initialize the staker position of the locker contract
    const treasuryDao = await ethers.getSigner(TREASURY_DAO);
    const cvgeUSDFRAXBPStaking = contractsUsers.convex.cvgFraxLpStaking.cvgeUSDFRAXBPStaking;
    const cvgeUSDFRAXBPLocker = contractsUsers.convex.cvgFraxLpLocker.cvgeUSDFRAXBPLocker;
    const eusdfraxbp = contractsUsers.contractsUserMainnet.curveLps!.eusdfraxbp;
    await eusdfraxbp.transfer(cvgeUSDFRAXBPLocker, "1");
    await cvgeUSDFRAXBPLocker.connect(treasuryDao).setupLocker(cvgeUSDFRAXBPStaking);

    //POSITIONS
    await getPositionsConvex(contractsUsers);

    await createConvexDistribution(contractsUsers);

    //TODO: VOTE
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
