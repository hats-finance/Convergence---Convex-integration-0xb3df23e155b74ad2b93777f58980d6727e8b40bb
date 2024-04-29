import fs from "fs";
import artifact from "../../../../artifacts/contracts/ChainView/BalanceVeSDT.sol/BalanceVeSDT.json";
import {chainView} from "../../../chainview";
import {JsonRpcProvider, formatEther} from "ethers";
const registryPath = "./scripts/mainnet/snapshot/listHolderVeSDT.json";
const snapshotPath = "./scripts/mainnet/snapshot/eligibleVeSDTHolder.json";
const listHolderVeSDT = JSON.parse(fs.readFileSync(registryPath).toString());
const RPC_URL: string = "https://eth.llamarpc.com";
const provider = new JsonRpcProvider(RPC_URL);
type ParamCall = [string[]];
type BalanceVeSDTInfo = {
    holder: string;
    balance: bigint;
};
async function main() {
    const params: ParamCall = [listHolderVeSDT];
    const [chainViewResponse] = await chainView<ParamCall, BalanceVeSDTInfo[][]>(artifact.abi, artifact.bytecode, params, provider);
    const holdersEligible: {[address: string]: string} = {};
    for (const balanceInfo of chainViewResponse) {
        if (balanceInfo.balance > 1000000000000000000000n) {
            holdersEligible[balanceInfo.holder] = formatEther(balanceInfo.balance);
        }
    }

    fs.writeFileSync(snapshotPath, JSON.stringify(holdersEligible, null, 4));
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
