import {ethers} from "hardhat";
import {IContractsConvex} from "../../../../../utils/contractInterface";
import {CvxAssetStakerBuffer, CvxAssetStakingService} from "../../../../../typechain-types";
import {TOKEN_ADDR_CRV, TOKEN_ADDR_CVX, TOKEN_ADDR_FXS} from "../../../../../resources/tokens/common";
import fs from "fs";

interface TokenReward {
    tokenName: string;
    tokenAddress: string;
    tokenDecimals: number;
    amountToDistribute: string;
}

interface StakingInfo {
    stakingAddress: string;
    bufferAddress: string;
    rewards: TokenReward[];
}
export interface ConvexDistribution {
    [stakingName: string]: StakingInfo;
}

export const createConvexDistribution = async (contractsUsers: IContractsConvex) => {
    const convexContracts = contractsUsers.convex;
    let json: ConvexDistribution = {};
    //cvgCVX
    const cvgCvxStakingAddress = await convexContracts.cvgCvxStakingPositionService.getAddress();
    json["CvgCvxStaking"] = {
        stakingAddress: cvgCvxStakingAddress,
        bufferAddress: await convexContracts.cvxConvergenceLocker.getAddress(),
        rewards: [
            {tokenName: "CVX", tokenAddress: TOKEN_ADDR_CVX, tokenDecimals: 18, amountToDistribute: "0"},
            {tokenName: "CRV", tokenAddress: TOKEN_ADDR_CRV, tokenDecimals: 18, amountToDistribute: "0"},
            {tokenName: "FXS", tokenAddress: TOKEN_ADDR_FXS, tokenDecimals: 18, amountToDistribute: "0"},
        ],
    };
    //CvxCRV
    json = await getRewardsForCvxAsset("CvxCrvStaking", convexContracts.cvxCrvStakingPositionService, convexContracts.cvxCrvStakerBuffer, json);
    //CvxFPIS
    json = await getRewardsForCvxAsset("CvxFpisStaking", convexContracts.cvxFpisStakingPositionService, convexContracts.cvxFpisStakerBuffer, json);
    //CvxFXN
    json = await getRewardsForCvxAsset("CvxFxnStaking", convexContracts.cvxFxnStakingPositionService, convexContracts.cvxFxnStakerBuffer, json);
    //CvxFXS
    json = await getRewardsForCvxAsset("CvxFxsStaking", convexContracts.cvxFxsStakingPositionService, convexContracts.cvxFxsStakerBuffer, json);
    //CvxPRISMA
    json = await getRewardsForCvxAsset("CvxPrismaStaking", convexContracts.cvxPrismaStakingPositionService, convexContracts.cvxPrismaStakerBuffer, json);

    fs.writeFileSync("./tasks/staking/convexDistribution.json", JSON.stringify(json, null, 4));
};

async function getRewardsForCvxAsset(name: string, staking: CvxAssetStakingService, buffer: CvxAssetStakerBuffer, json: ConvexDistribution) {
    const rewardTokensConfigs = await buffer.getRewardTokensConfig();
    const rewards = [];
    for (const rewardToken of rewardTokensConfigs) {
        const tokenContract = await ethers.getContractAt("ERC20", rewardToken.token);
        rewards.push({
            tokenName: await tokenContract.symbol(),
            tokenAddress: rewardToken.token,
            tokenDecimals: Number(await tokenContract.decimals()),
            amountToDistribute: "0",
        });
    }
    json[name] = {
        stakingAddress: await staking.getAddress(),
        bufferAddress: await buffer.getAddress(),
        rewards: rewards,
    };
    return json;
}
