import dotenv from "dotenv";
dotenv.config();

import {deployStkContracts} from "../../../test/fixtures/stkCvg-fixtures";
import {TOKEN_ADDR_CVG_SDT, TOKEN_ADDR_wstETH} from "../../../resources/tokens/common";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../resources/treasury";
import {giveTokensToAddresses} from "../../../utils/thief/thiefv2";

const rewardsDistributionConfig = [
    {
        token: {
            isVyper: false,
            slotBalance: 0,
            address: TOKEN_ADDR_wstETH,
        },
        amount: ethers.parseEther("50"),
    },
    {
        token: {
            isVyper: false,
            slotBalance: 0,
            address: TOKEN_ADDR_CVG_SDT,
        },
        amount: ethers.parseEther("20000"),
    },
];

async function main() {
    // We deploy.
    const {stkCvgEth, stkCvgCvgSdt} = await deployStkContracts();
    console.log("STK ETH Contract deployed at : " + (await stkCvgEth.getAddress()));
    console.log("STK cvgSDT Contract deployed at : " + (await stkCvgCvgSdt.getAddress()));

    // We give rewards tokens to the DAO.
    const operator = await ethers.getSigner(TREASURY_DAO);
    await giveTokensToAddresses([operator], rewardsDistributionConfig);

    // We add the reward to the stkCvgEth contract.
    const wstETH = await ethers.getContractAt("ERC20", TOKEN_ADDR_wstETH);
    await stkCvgEth.connect(operator).addReward(TOKEN_ADDR_wstETH, TREASURY_DAO);
    await wstETH.connect(operator).approve(await stkCvgEth.getAddress(), ethers.parseEther("50"));
    await stkCvgEth.connect(operator).notifyRewardAmount(TOKEN_ADDR_wstETH, ethers.parseEther("10"));

    // We add the reward to the stkCvgCvgSdt contract.
    const cvgDT = await ethers.getContractAt("ERC20", TOKEN_ADDR_CVG_SDT);
    await stkCvgCvgSdt.connect(operator).addReward(TOKEN_ADDR_CVG_SDT, TREASURY_DAO);
    await cvgDT.connect(operator).approve(await stkCvgCvgSdt.getAddress(), ethers.parseEther("20000"));
    await stkCvgCvgSdt.connect(operator).notifyRewardAmount(TOKEN_ADDR_CVG_SDT, ethers.parseEther("5000"));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
