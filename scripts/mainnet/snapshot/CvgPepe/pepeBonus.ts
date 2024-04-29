import dotenv from "dotenv";
dotenv.config();
import {ethers} from "hardhat";
import {CVG_PEPE} from "../../../../resources/cvg-mainnet";
import {getContract} from "../../../deployer/complete/helper";
import {AddressLike, BigNumberish} from "ethers";

async function main() {
    const olivaAddress = "0xdb3B2d1B37985fbfB28298106d6721cAd2211146";
    const pepe = await ethers.getContractAt("CvgPepe", CVG_PEPE);

    const totalSupply = 120n;

    const drop = ethers.parseEther("1000");

    const airdropResult: {[address: string]: bigint} = {};
    for (let pepeId = 118n; pepeId <= totalSupply; pepeId++) {
        console.log(pepeId);
        try {
            const ownerAddress = await pepe.ownerOf(pepeId);
            airdropResult[ownerAddress] = airdropResult[ownerAddress] ? airdropResult[ownerAddress] + drop : drop;
        } catch (e) {
            const ownerAddress = (await pepe.getBurnRecord(pepeId))[0];
            airdropResult[ownerAddress] = airdropResult[ownerAddress] ? airdropResult[ownerAddress] + drop : drop;
        }
    }

    //add oliva drop
    airdropResult[olivaAddress] = ethers.parseEther("1000");

    const recipients: AddressLike[] = [];
    const values: BigNumberish[] = [];
    let total: bigint = 0n;

    Object.entries(airdropResult).forEach(([recipient, value]) => {
        recipients.push(recipient);
        values.push(value);

        total += value;
    });
    console.log(airdropResult);
    console.log("recipients", recipients);
    console.log("values", values);
    console.log("total", total);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

//npx hardhat run scripts/mainnet/snapshot/CvgPepe/pepeBonus.ts --network mainnet
