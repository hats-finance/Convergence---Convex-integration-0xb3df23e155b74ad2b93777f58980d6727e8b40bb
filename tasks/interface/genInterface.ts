import {task} from "hardhat/config";
import abi2solidity from "abi2solidity";
import fs from "fs";

task("genInterface", "Generate a new Solidity interface for a given file", async function (taskArguments: {contract: any}, hre) {
    const artifact = await hre.artifacts.readArtifact(taskArguments.contract);
    const outputFile = hre.config.paths.root + "/contracts/interfaces/" + `I${taskArguments.contract}.sol`;
    const solidity = abi2solidity(JSON.stringify(artifact.abi))
        .replace("GeneratedInterface", `I${taskArguments.contract}`)
        .replace("pragma solidity >=0.1.0 <0.9.0;", "pragma solidity ^0.8.0;");
    fs.writeFileSync(outputFile, solidity);
}).addOptionalParam("contract", "Solidity contract name");
