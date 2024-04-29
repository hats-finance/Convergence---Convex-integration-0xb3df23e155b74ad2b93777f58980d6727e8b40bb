import dotenv from "dotenv";
dotenv.config();
import {ethers} from "hardhat";
import {CVG_PEPE} from "../../resources/cvg-mainnet";
import {getContract} from "../deployer/complete/helper";
import {CVG_CONTRACT} from "../../resources/contracts";

import {Cvg} from "../../typechain-types/contracts/Token";

async function main() {
    const pepe = await ethers.getContractAt("CvgPepe", CVG_PEPE);

    const cvg = await getContract<Cvg>(CVG_CONTRACT);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
