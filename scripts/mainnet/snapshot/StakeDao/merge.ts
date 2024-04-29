import holderV1 from "./holderV1.json";
import holderV2 from "./holderV2.json";
import holderV3 from "./holderV3.json";
import stakers from "./listStakerOgSdt.json";
import {getAddress} from "ethers";
import fs from "fs";

const registryPath = "./scripts/mainnet/snapshot/allHolderOgSdt.json";
async function main() {
    const mergedList = [
        ...new Set([
            ...holderV1.map((address) => getAddress(address)),
            ...holderV2.map((address) => getAddress(address)),
            ...holderV3.map((address) => getAddress(address)),
            ...stakers.map((address) => getAddress(address)),
        ]),
    ];

    fs.writeFileSync(registryPath, JSON.stringify(mergedList, null, 4));
}

main();
//ts-node scripts/mainnet/snapshot/merge.ts
