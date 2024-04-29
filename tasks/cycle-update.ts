import {task} from "hardhat/config";
import contracts from "../scripts/deployer/complete/contractRegistryMainnet.json";
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";

task("cvgCycleUpdate", "Distribute rewards and update Cvg cycle", async function (taskArguments: {cycle: number}, hre, b) {
    let addresses = contracts.addresses;

    const accounts = await hre.ethers.getSigners();
    const cvgRewardsContract = await hre.ethers.getContractAt("CvgRewards", addresses.CvgRewards);
    const oneWeek = 86_400n * 7n;
    const lastTimestamp = (BigInt(await time.latest()) / oneWeek) * oneWeek;
    let nextTimestamp = lastTimestamp + oneWeek;
    for (let i = 0; i < taskArguments["cycle"]; i++) {
        await time.increaseTo(nextTimestamp);
        await (await cvgRewardsContract.connect(accounts[13]).writeStakingRewards(3)).wait();
        nextTimestamp += oneWeek;
    }
    const controlTower = await hre.ethers.getContractAt("CvgControlTower", addresses.CvgControlTower);
    console.info("New cvg cycle:", await controlTower.cvgCycle());
}).addOptionalParam("cycle", "Number of cycle to go forward");
