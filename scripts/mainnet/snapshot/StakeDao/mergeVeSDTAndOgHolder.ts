import fs from "fs";
import eligibleVeSDTHolder from "./eligibleVeSDTHolder.json";
import ogSDTHolder from "./allHolderOgSdt.json";
import {getAddress} from "ethers";
const registryPath = "./scripts/mainnet/snapshot/finalListVeSDTAirdrop.json";
async function main() {
    const veSDTHolders = [];
    for (const holder in eligibleVeSDTHolder) {
        veSDTHolders.push(holder);
    }

    const mergedList = [...new Set([...veSDTHolders.map((address) => getAddress(address)), ...ogSDTHolder.map((address) => getAddress(address))])];

    fs.writeFileSync(registryPath, JSON.stringify(mergedList, null, 4));
}

main();

//ts-node scripts/mainnet/snapshot/mergeVeSDTAndOgHolder.ts
