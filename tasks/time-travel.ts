import {task} from "hardhat/config";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {HardhatRuntimeEnvironment} from "hardhat/types";

task("timeTravel", "Travel", async function (taskArguments: {days: number}, hre: HardhatRuntimeEnvironment, b) {
    await time.increase(taskArguments["days"] * 86400);
}).addOptionalParam("days", "Number of days to time travel");
