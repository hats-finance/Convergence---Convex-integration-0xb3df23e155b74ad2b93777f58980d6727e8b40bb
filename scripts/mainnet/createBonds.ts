import dotenv from "dotenv";
dotenv.config();
import {ethers} from "hardhat";
import {IBO, PRESALE_SEED, PRESALE_WL} from "../../resources/cvg-mainnet";

async function main() {
    const seed = await ethers.getContractAt("SeedPresaleCvg", PRESALE_SEED);
    const supplySeed = await seed.totalSupply();
    let totalSeed = 0n;
    for (let index = 0; index <= supplySeed; index++) {
        totalSeed += (await seed.presaleInfoTokenId(index)).cvgAmount;
    }

    const wl = await ethers.getContractAt("WlPresaleCvg", PRESALE_WL);
    const supplyWl = await wl.totalSupply();
    let totalWl = 0n;
    for (let index = 0; index <= supplyWl; index++) {
        totalWl += (await wl.presaleInfos(index)).cvgAmount;
    }

    const ibo = await ethers.getContractAt("Ibo", IBO);
    const supplyIbo = await ibo.totalSupply();
    let totalIbo = 0n;
    for (let index = 0; index <= supplyIbo; index++) {
        totalIbo += await ibo.totalCvgPerToken(index);
    }

    console.log(`Total seed ${totalSeed}`);
    console.log(`Total wl ${totalWl}`);
    console.log(`Total ibo ${totalIbo}`);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
