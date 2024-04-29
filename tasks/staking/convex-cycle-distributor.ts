import {task} from "hardhat/config";
import convexDistribute from "./convexDistribution.json";
import {ConvexDistribution} from "../../scripts/deployer/complete/protocol/deployLocal/createConvexDistribution";
const distribute: ConvexDistribution = convexDistribute;

task("convexDistribute", "Distribute CVX rewards based on convexDistribution.json", async function (taskArguments, hre, b) {
    for (const stakingContractName in distribute) {
        const staking = await hre.ethers.getContractAt("CvgCvxStakingPositionService", distribute[stakingContractName].stakingAddress);
        const buffer = await hre.ethers.getContractAt("CvxAssetStakerBuffer", distribute[stakingContractName].bufferAddress);
        for (const reward of distribute[stakingContractName].rewards) {
            const erc20 = await hre.ethers.getContractAt("ERC20", reward.tokenAddress);
            let amountToDistribute = reward.amountToDistribute;
            if (amountToDistribute != "0") {
                await erc20.transfer(buffer, hre.ethers.parseUnits(amountToDistribute, reward.tokenDecimals));
            }
        }
        try {
            await staking.processCvxRewards();
            console.log(`rewards processed for ${stakingContractName}`);
        } catch (e) {
            // console.log(`No process for ${contractName}`);
        }
    }

    console.info("CVX rewards processed");
});
