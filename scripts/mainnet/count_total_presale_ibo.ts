import dotenv from "dotenv";
dotenv.config();
import {ethers} from "hardhat";
import {IBO, PRESALE_WL} from "../../resources/cvg-mainnet";

async function main() {
    const presaleWl = await ethers.getContractAt("WlPresaleCvg", PRESALE_WL);
    const presaleIbo = await ethers.getContractAt("Ibo", IBO);

    let totalCvgWl = 0n;
    let totalCvgIbo = 0n;

    const totalSupplyWl = await presaleWl.totalSupply();
    for (let index = 1; index <= totalSupplyWl; index++) {
        totalCvgWl += (await presaleWl.presaleInfos(index)).cvgAmount;
    }

    const totalSupplyIbo = await presaleIbo.totalSupply();
    for (let index = 1; index <= totalSupplyIbo; index++) {
        totalCvgIbo += await presaleIbo.totalCvgPerToken(index);
    }

    const totalBoost = ((totalCvgWl + totalCvgIbo) * 500_000n) / 10_000_000n;

    console.log("Total Wl", totalCvgWl); // 2 449 940,909090909090909052
    console.log("Total Ibo", totalCvgIbo); // 861 179,784242950307040247

    console.log("TotalBoost", totalBoost); // 165 556,034666692969897464
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
