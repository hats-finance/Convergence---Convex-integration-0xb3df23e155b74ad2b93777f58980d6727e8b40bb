import dotenv from "dotenv";
dotenv.config();
import {ethers} from "hardhat";
import {CVG_PEPE} from "../../../../resources/cvg-mainnet";
import {getContract} from "../../../deployer/complete/helper";
import {AddressLike, BigNumberish} from "ethers";

//0x97efFB790f2fbB701D88f89DB4521348A2B77be8 (CVG)
//0xD152f549545093347A162Dce210e7293f1452150 (DISPERSE)

async function main() {
    const pepe = await ethers.getContractAt("CvgPepe", CVG_PEPE);

    const totalSupply = 117n;

    const drop = ethers.parseEther("1000");

    const airdropResult: {[address: string]: bigint} = {};
    for (let pepeId = 1n; pepeId <= totalSupply; pepeId++) {
        try {
            const ownerAddress = await pepe.ownerOf(pepeId);
            airdropResult[ownerAddress] = airdropResult[ownerAddress] ? airdropResult[ownerAddress] + drop : drop;
        } catch (e) {
            const ownerAddress = (await pepe.getBurnRecord(pepeId))[0];
            airdropResult[ownerAddress] = airdropResult[ownerAddress] ? airdropResult[ownerAddress] + drop : drop;
        }
    }
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

//npx hardhat run scripts/mainnet/snapshot/CvgPepe/pepe.ts --network mainnet

/*
- DROP 117 First holders (3k total)
    1) Drop done at launch (2k left) => tx:0xd07db2054c6c6d612040ea25b43b51828fee236baf76c435d7c3bc114d223564 31 days ago (Feb-03-2024 01:28:23 AM +UTC)
    2) 
DROP 3 last holders 118-120 (3k total) + Oliva (4k total)
    1) 

Les loosers
0xf6F85d9B96a43c87fD29E2FaCbF644DF6Bb029b0

0x6e674e64b2c5f6400b40d9aE6E555fF56e7D2F7C

0xE2E627D7971F6e3CCd209872fAB717701FE53D1f

31 days ago (Feb-02-2024 11:52:47 PM +UTC)
*/
