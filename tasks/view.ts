import {task} from "hardhat/config";
import contracts from "../scripts/deployer/complete/contractRegistry.json";
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {HardhatRuntimeEnvironment} from "hardhat/types";

task("view", "task used to call view function", async function (taskArguments, hre: HardhatRuntimeEnvironment, b) {
    let addresses = contracts.addresses;

    const controlTower = await hre.ethers.getContractAt("CvgControlTower", addresses.CvgControlTower);
    const bondAddresses = await controlTower.getBondContractsPerVersionPaginate(1, 0, 8);
    console.info(bondAddresses);
    const bondAddresses2 = await controlTower.getBondContractsPerVersion(1);
    console.info(bondAddresses2);
});
