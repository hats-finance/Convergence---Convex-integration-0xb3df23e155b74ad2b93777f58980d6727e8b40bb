import {Contract, JsonRpcProvider, EventLog, Log} from "ethers";
import fs from "fs";
import abiStakingOg from "./stakingOgAbi.json";
import listStakers from "./listStakerOgSdt.json";
const RPC_URL: string = "https://ethereum.publicnode.com/";
const provider = new JsonRpcProvider(RPC_URL);
const CHUNK_SIZE = 3000;
const registryPath = "./scripts/mainnet/snapshot/listStakerOgSdt.json";
async function main() {
    const stakingOgAddress = "0xa324a2e3a6f64bd588565e0e1e2dd50e7a68bdd9";
    const stakingOgContract = new Contract(stakingOgAddress, abiStakingOg, provider);
    const startBlock = 12515311; //genesis of staking
    const endBlock = 19239558;
    const list = [];
    let Stakeds: (Log | EventLog)[] = [];
    for (let fromBlock = startBlock; fromBlock < endBlock; fromBlock += CHUNK_SIZE) {
        let toBlock = fromBlock + CHUNK_SIZE - 1;

        if (toBlock > endBlock) {
            toBlock = endBlock;
        }

        const chunkLogs = await stakingOgContract.queryFilter("Staked", fromBlock, toBlock);
        Stakeds = Stakeds.concat(chunkLogs);
    }

    for (const decodedLog of Stakeds) {
        console.log(decodedLog);
        //@ts-ignore
        const staker = decodedLog.args[0];
        const idStaked = await stakingOgContract.getStakedNFT(staker);
        if (idStaked !== 0n) {
            list.push(staker);
        }
    }
    let listCleaned = [...new Set(listStakers)];
    fs.writeFileSync(registryPath, JSON.stringify(listCleaned, null, 4));
}
main();
//ts-node scripts/mainnet/snapshot/getStakedSdtOg.ts
