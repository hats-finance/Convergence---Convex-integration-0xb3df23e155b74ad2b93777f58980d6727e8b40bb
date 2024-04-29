import fs from "fs";
import {network, ethers} from "hardhat";
import {VE_SDT_ADDRESS} from "../../../../resources/stake";
import abiVeSDT from "../../../../abis/VeSDT.json";
const CHUNK_SIZE = 3000;
const registryPath = "./scripts/mainnet/snapshot/listHolderVeSDT.json";
async function main() {
    const veSDT = await ethers.getContractAt(abiVeSDT, VE_SDT_ADDRESS);

    const fromBlock = 14062634; //genesis of veSDT
    // const toBlock = 14169850; //for test only
    const toBlock = 19239558;
    const listHolder = await getListHolder(fromBlock, toBlock);

    fs.writeFileSync(registryPath, JSON.stringify(listHolder, null, 4));
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

async function getListHolder(initialFromBlock: number, finalToBlock: number) {
    let listHolder: {[address: string]: string} = {};
    const veSDT = await ethers.getContractAt(abiVeSDT, VE_SDT_ADDRESS);
    let Deposits = [];
    for (let fromBlock = initialFromBlock; fromBlock < finalToBlock; fromBlock += CHUNK_SIZE) {
        let toBlock = fromBlock + CHUNK_SIZE - 1;

        if (toBlock > finalToBlock) {
            toBlock = finalToBlock;
        }

        const chunkLogs = await veSDT.queryFilter("Deposit", fromBlock, toBlock);
        console.log(toBlock);
        Deposits = Deposits.concat(chunkLogs);
    }

    for (const decodedLog of Deposits) {
        console.log(decodedLog);
        const tx = decodedLog.transactionHash;
        const args = decodedLog.args;

        listHolder[args.provider] = "0";
    }

    return Object.keys(listHolder);
}
