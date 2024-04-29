import merkleData from "./merkle-02-04-2024.json";
import {toBigInt, formatEther} from "ethers";
//https://github.com/stake-dao/bounties-report/blob/main/history/merkle-05-03-2024.json

const sdtBlackHole = "0x21777106355ba506a31ff7984c0ae5c924deb77f";
// const multiMerkleStash = "0x03E34b085C52985F6a5D27243F20C84bDdc01Db4";

type DataClaim = {
    token: string;
    index: number;
    amount: bigint;
    merkleProof: string[];
};
async function main() {
    const dataClaim: DataClaim[] = [];
    for (const rewardData of merkleData) {
        const addressReward = rewardData.address;
        const blackHoleRewardsData = rewardData.merkle[sdtBlackHole];

        const indexReward = blackHoleRewardsData?.index;
        const amountReward = blackHoleRewardsData?.amount;
        const proofReward = blackHoleRewardsData?.proof;
        if (blackHoleRewardsData) {
            dataClaim.push({
                token: addressReward,
                index: indexReward!,
                amount: toBigInt(amountReward!.hex),
                merkleProof: proofReward!,
            });
        }
    }
    console.log("dataClaim", dataClaim);
}

main();

//ts-node scripts/multiMerkle/getDataForClaim.ts
