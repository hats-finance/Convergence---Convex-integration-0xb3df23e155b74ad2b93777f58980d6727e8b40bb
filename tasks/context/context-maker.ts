import {MaxUint256, ZeroAddress, parseUnits, parseEther} from "ethers";
import {task} from "hardhat/config";
import {HardhatRuntimeEnvironment} from "hardhat/types";
import contracts from "../../scripts/deployer/complete/contractRegistry.json";
task(
    "context-maker",
    "Set a given context (front testing purpose)",
    async function (taskArguments: {context: string}, hre: HardhatRuntimeEnvironment, runSuper) {
        const context = require(`./${taskArguments["context"]}`);
        let addresses = contracts.addresses;

        const accounts = await hre.ethers.getSigners();
        const owner = accounts[0];
        const user1 = accounts[1];
        const user2 = accounts[2];
        const user3 = accounts[3];
        const user4 = accounts[4];
        const user5 = accounts[5];
        const user6 = accounts[6];
        const user7 = accounts[7];
        const user8 = accounts[8];
        const user9 = accounts[9];
        const user10 = accounts[10];
        const treasuryDao = accounts[13];
        const treasuryStaking = accounts[14];
        const users = {owner, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10, treasuryDao, treasuryStaking};

        for (const cycle in context) {
            //do functions
            const txs = context[cycle];
            for (const tx of txs) {
                if (tx.log) {
                    console.info(tx.log);
                } else if (tx.processCvg) {
                    await processCvg(tx, hre);
                } else if (tx.processSdt) {
                    await processSdt(tx, hre);
                } else {
                    const contract = await getContract(addresses, tx, hre);
                    await triggerFunction(contract, tx, users);
                }
            }
        }
    }
).addParam("context", "Context to make");

async function processCvg(tx: any, hre: any) {
    await hre.run("cvgCycleUpdate", {cycle: tx.processCvg});
}
async function processSdt(tx: any, hre: any) {
    await hre.run("stakeDaoDistribute", {rewardAmount: tx.processSdt});
}

async function triggerFunction(contract: any, tx: any, users: any) {
    const signer = users[tx.signer];
    let params = "";
    let addresses: any = contracts.addresses;
    for (const param of tx.params) {
        if (params.length > 0) {
            params += ", ";
        }
        let keys = [];
        let matchAmount;
        const isBool = typeof param === "boolean";
        if (!isBool) {
            keys = param.split(".");
            matchAmount = param.match(/amount\((\d+),(\d+)\)/);
        }
        if (users[param] != undefined) {
            //alias user param
            const aliasAddress = await users[param].getAddress();
            params += `"` + aliasAddress + `"`;
        } else if (addresses[param] != undefined) {
            //alias contract address param
            const aliasAddress = addresses[param];
            params += `"` + aliasAddress + `"`;
        } else if (keys.length > 1) {
            //alias contract address param with multiple keys
            const aliasAddress = addresses[keys[0]][keys[1]];
            params += `"` + aliasAddress + `"`;
        } else if (matchAmount) {
            //param with amount
            params += `"` + parseUnits(matchAmount[1], Number(matchAmount[2])) + `"`;
        } else if (param == "max") {
            //param with maxUint
            params += `"` + MaxUint256 + `"`;
        } else if (param == "addressZero") {
            //param with addressZero
            params += `"` + ZeroAddress + `"`;
        } else if (isBool) {
            //param with boolean
            params += param;
        } else {
            //normal param
            params += `"` + param + `"`;
        }
    }
    const call = await eval(`contract.connect(signer).${tx.method}(${params})`);
    if (tx.isView != undefined) {
        console.log(tx.name, call.toString());
    } else {
        console.log(tx.name);
    }
}
async function getContract(addresses: any, tx: any, hre: HardhatRuntimeEnvironment) {
    const keys: string[] = tx.pathAddress.split(".");
    let address = Object.assign({}, addresses);
    keys.forEach((key: string) => {
        address = address[key];
    });

    return await hre.ethers.getContractAt(getAbi(keys, tx), address);
}
function getAbi(keys: any, tx: any) {
    let abi = tx.pathAddress;
    switch (keys[0]) {
        case "tokenContracts":
            abi = "ERC20";
            break;
        case "bondContracts":
            abi = "BondDepository";
            break;
        case "CvgSdtStaking":
            abi = "SdtStakingPositionService";
            break;
        case "stakingContracts":
            abi = "SdtStakingPositionService";
            break;
    }
    return abi;
}
