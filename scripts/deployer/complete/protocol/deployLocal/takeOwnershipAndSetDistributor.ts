import {ethers} from "hardhat";
import {IUsers} from "../../../../../utils/contractInterface";
import {txCheck, getAddress, writeFile, getContract} from "../../../complete/helper";
import {SdtBlackHole} from "../../../../../typechain-types";
import {TOKEN_ADDR_SDT} from "../../../../../resources/tokens/common";

import {takesGaugeOwnershipAndSetDistributor} from "../../../../../utils/stakeDao/takesGaugeOwnershipAndSetDistributor";
import {TOKEN_ADDR_SD_FRAX_3CRV} from "../../../../../resources/tokens/stake-dao";
import fs from "fs";

export const takeOwnershipOfStakeGauge = async (u: IUsers) => {
    //REMOVE FROM PROD
    await txCheck(
        async () => {
            let stakingContracts = getAddress("stakingContracts");
            for (const stakingContractName in stakingContracts) {
                const sdtStaking = await ethers.getContractAt("ISdtStakingPositionService", stakingContracts[stakingContractName] as string);
                await takesGaugeOwnershipAndSetDistributor(await ethers.getContractAt("ISdAssetGauge", await sdtStaking.stakingAsset()), u.owner);
            }
        },
        "TAKE_OWNERSHIP_APPROVE_SDT_GAUGE_DISTRIBUTION",
        null,
        false,
        true
    );

    await txCheck(
        async () => {
            let stakingContracts = getAddress("stakingContracts");
            const json: Record<
                string,
                {
                    stakingAddress: string;
                    gaugeAddress: string;
                    gaugeRewards: {tokenName: string; tokenAddress: string; tokenDecimals: number; amountToDistribute: string}[];
                    bribeRewards: {tokenName: string; tokenAddress: string; tokenDecimals: number; amountToDistribute: string}[];
                }
            > = {
                CvgSdtStaking: {
                    stakingAddress: getAddress("CvgSdtStaking"),
                    gaugeAddress: ethers.ZeroAddress,
                    gaugeRewards: [
                        {tokenName: "SdFrax3CRV", tokenAddress: TOKEN_ADDR_SD_FRAX_3CRV, tokenDecimals: 18, amountToDistribute: "0"},
                        {tokenName: "Sdt", tokenAddress: TOKEN_ADDR_SDT, tokenDecimals: 18, amountToDistribute: "0"},
                        {tokenName: "CvgSdt", tokenAddress: getAddress("CvgSDT"), tokenDecimals: 18, amountToDistribute: "0"},
                    ],
                    bribeRewards: [],
                },
            };
            for (const stakingContractName in stakingContracts) {
                const stakingAddress = stakingContracts[stakingContractName] as string;
                const sdtStaking = await ethers.getContractAt("SdtStakingPositionService", stakingAddress);
                const gaugeAddress = await sdtStaking.stakingAsset();
                const buffer = await sdtStaking.buffer();
                json[stakingContractName] = {
                    stakingAddress,
                    gaugeAddress,
                    gaugeRewards: [],
                    bribeRewards: [],
                };
                const gauge = await ethers.getContractAt("ISdAssetGauge", gaugeAddress);
                const gaugeRewardAmount = await gauge.reward_count();
                json[stakingContractName]["gaugeRewards"] = [];
                json[stakingContractName]["bribeRewards"] = [];
                const BB_A_USD_HACKED = "0xA13a9247ea42D743238089903570127DdA72fE44";
                for (let index = 0; index < gaugeRewardAmount; index++) {
                    const token = await ethers.getContractAt("ERC20", await gauge.reward_tokens(index));
                    const tokenAddress = await token.getAddress();
                    if (tokenAddress !== BB_A_USD_HACKED) {
                        json[stakingContractName].gaugeRewards.push({
                            tokenName: await token.name(),
                            tokenAddress: await token.getAddress(),
                            tokenDecimals: Number(await token.decimals()),
                            amountToDistribute: "0",
                        });
                    }
                }
                const bribes = await (await getContract<SdtBlackHole>("SdtBlackHole")).getBribeTokensForBuffer(buffer);
                for (let index = 0; index < bribes.length; index++) {
                    const token = await ethers.getContractAt("ERC20", bribes[index].token);
                    const tokenAddress = await token.getAddress();
                    if (tokenAddress !== BB_A_USD_HACKED) {
                        json[stakingContractName].bribeRewards.push({
                            tokenName: await token.name(),
                            tokenAddress: await token.getAddress(),
                            tokenDecimals: Number(await token.decimals()),
                            amountToDistribute: "0",
                        });
                    }
                }
            }
            fs.writeFileSync("./tasks/staking/distribution.json", JSON.stringify(json, null, 4));
        },
        "SET_UP_STAKE_DAO_GAUGE_REWARDS_TASK",
        null,
        false,
        true
    );
};
