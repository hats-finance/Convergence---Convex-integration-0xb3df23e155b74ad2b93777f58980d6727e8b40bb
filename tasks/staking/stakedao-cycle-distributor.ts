import {task} from "hardhat/config";
import distribute from "./distribution.json";
import contractRegistry from "../../scripts/deployer/complete/contractRegistry.json";

import {TOKEN_ADDR_SDT} from "../../resources/tokens/common";
import {TOKEN_ADDR_SD_FRAX_3CRV} from "../../resources/tokens/stake-dao";
import {MaxUint256} from "ethers";

task("stakeDaoDistribute", "Distribute SDT rewards based on distribution.json", async function (taskArguments: {rewardAmount: number}, hre, b) {
    const signers = await hre.ethers.getSigners();
    const veSdtMultisig = signers[18];
    const rewardAmountForAll = taskArguments["rewardAmount"];
    for (const stakingContractName in distribute) {
        if (stakingContractName !== "CvgSdtStaking") {
            const contractName = stakingContractName as keyof typeof distribute;
            const item = distribute[contractName];

            const gauge = await hre.ethers.getContractAt("ISdAssetGauge", item.gaugeAddress);
            const staking = await hre.ethers.getContractAt("SdtStakingPositionService", item.stakingAddress);

            // Gauge rewards
            const gaugeRewards = item.gaugeRewards;
            for (let index = 0; index < gaugeRewards.length; index++) {
                const reward = gaugeRewards[index];
                const tokenAddress = reward.tokenAddress;
                let amountToDistribute = reward.amountToDistribute;
                if (rewardAmountForAll > 0) {
                    amountToDistribute = rewardAmountForAll.toString();
                }
                if (amountToDistribute != "0") {
                    // Deposit reward token
                    await gauge.deposit_reward_token(tokenAddress, hre.ethers.parseUnits(amountToDistribute, reward.tokenDecimals));
                }
            }
            // Bribes rewards
            const bribeRewards = item.bribeRewards;
            for (let index = 0; index < bribeRewards.length; index++) {
                const reward = bribeRewards[index];
                const erc20 = await hre.ethers.getContractAt("ERC20", reward.tokenAddress);
                let amountToDistribute = reward.amountToDistribute;
                if (rewardAmountForAll > 0) {
                    amountToDistribute = rewardAmountForAll.toString();
                }
                if (amountToDistribute != "0") {
                    // Deposit reward token directly into SdtBlackhole
                    await erc20.transfer(contractRegistry.addresses.SdtBlackHole, hre.ethers.parseUnits(amountToDistribute, reward.tokenDecimals));
                }
            }
            try {
                await staking.processSdtRewards();
                console.log(`rewards processed for ${contractName}`);
            } catch (e) {
                // console.log(`No process for ${contractName}`);
            }
        }
    }

    // CvgSdt Distribution

    const item = distribute["CvgSdtStaking"];
    const sdt = await hre.ethers.getContractAt("ERC20", TOKEN_ADDR_SDT);
    const cvgSdt = await hre.ethers.getContractAt("ERC20", contractRegistry.addresses.CvgSDT);
    const sdFrax3CRV = await hre.ethers.getContractAt("ERC20", TOKEN_ADDR_SD_FRAX_3CRV);
    const cvgSdtBuffer = contractRegistry.addresses.CvgSdtBuffer;
    let sdFrax3CrvAmount = item.gaugeRewards[0].amountToDistribute;
    let sdtAmount = item.gaugeRewards[1].amountToDistribute;
    let cvgSdtAmount = item.gaugeRewards[2].amountToDistribute;
    if (rewardAmountForAll > 0) {
        sdFrax3CrvAmount = rewardAmountForAll.toString();
        sdtAmount = rewardAmountForAll.toString();
        cvgSdtAmount = rewardAmountForAll.toString();
    }
    if (sdFrax3CrvAmount !== "0") {
        await sdFrax3CRV.connect(veSdtMultisig).approve(cvgSdtBuffer, MaxUint256);
        await sdFrax3CRV.transfer(veSdtMultisig, hre.ethers.parseEther(sdFrax3CrvAmount));
    }

    if (sdtAmount !== "0") {
        await sdt.transfer(cvgSdtBuffer, hre.ethers.parseEther(sdtAmount));
    }

    if (cvgSdtAmount !== "0") {
        await cvgSdt.transfer(cvgSdtBuffer, hre.ethers.parseEther(cvgSdtAmount));
    }

    const cvgSdtStaking = await hre.ethers.getContractAt("SdtStakingPositionService", contractRegistry.addresses.CvgSdtStaking);
    try {
        await cvgSdtStaking.processSdtRewards();
        console.log(`rewards processed for CvgSdtStaking`);
    } catch (e) {
        // console.log(`No process for CvgSdtStaking`);
    }

    console.info("SDT rewards processed");
}).addOptionalParam("rewardAmount", "Number of reward to distribute for ALL assets");
