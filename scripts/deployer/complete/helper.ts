import fs from "fs";
import {ethers, network} from "hardhat";
import {Interface, ContractTransactionResponse} from "ethers";
import {ERC20, ISdAssetGauge} from "../../../typechain-types";
import {IContractsConvex} from "../../../utils/contractInterface";

const REGISTRY_MAINNET = "./scripts/deployer/complete/contractRegistryMainnet.json";
const REGISTRY_LOCAL = "./scripts/deployer/complete/contractRegistry.json";

let registryPath = network.name === "mainnet" ? REGISTRY_MAINNET : REGISTRY_LOCAL;

export async function getContract<T>(contractName: string): Promise<T> {
    return (await ethers.getContractAt(contractName, getAddress(contractName))) as T;
}

export const getMainnetAddress = (contractName: string) => {
    return JSON.parse(fs.readFileSync(REGISTRY_MAINNET).toString())["addresses"][contractName];
};
export const getAddress = (contractName: string) => {
    return JSON.parse(fs.readFileSync(registryPath).toString())["addresses"][contractName];
};
export async function getToken(name: string): Promise<ERC20> {
    return JSON.parse(fs.readFileSync(registryPath).toString())["addresses"]["tokenContracts"][name];
}

export async function getGaugeToken(name: string): Promise<ISdAssetGauge> {
    return JSON.parse(fs.readFileSync(registryPath).toString())["addresses"]["tokenContracts"][name];
}
export const getTrigger = (triggerName: string) => {
    return JSON.parse(fs.readFileSync(registryPath).toString())["triggers"][triggerName];
};

export const writeMultiple = (contractsUsers: IContractsConvex) => {
    const contractToInclude = ["cvgFraxLpLocker", "cvgFraxLpStaking", "convexVault"];
    const convexContracts: any = contractsUsers.convex;
    const json = JSON.parse(fs.readFileSync(registryPath).toString());
    const convexContractObject: any = {};
    for (const contract in convexContracts) {
        if (contractToInclude.includes(contract)) {
            const contractObjectIncluded: any = {};
            for (const contractIncluded in convexContracts[contract]) {
                contractObjectIncluded[contractIncluded] = convexContracts[contract][contractIncluded].target;
            }
            convexContractObject[contract] = contractObjectIncluded;
        } else {
            convexContractObject[contract] = convexContracts[contract].target;
        }
    }
    fs.writeFileSync(registryPath, JSON.stringify({...json, ...convexContractObject}, null, 4));
};
export const writeFile = (contractName: string | null, address: string | object | null, triggerName: string | null, txHash: string | null) => {
    const json = JSON.parse(fs.readFileSync(registryPath).toString());
    if (address !== null && contractName !== null) {
        json["addresses"][contractName] = address;
    }
    if (triggerName !== null) {
        json["triggers"][triggerName] = txHash == null ? true : txHash;
    }

    fs.writeFileSync(registryPath, JSON.stringify(json, null, 4));
};
export const writeStaking = (contractName: string | null, address: string | object | null, triggerName: string | null, txHash: string | null) => {
    const json = JSON.parse(fs.readFileSync(registryPath).toString());
    if (address !== null && contractName !== null) {
        json["addresses"]["stakingContracts"][contractName] = address;
    }
    if (triggerName !== null) {
        json["triggers"][triggerName] = txHash;
    }
    fs.writeFileSync(registryPath, JSON.stringify(json, null, 4));
};

export const writeBuffer = (contractName: string | null, address: string | object | null, triggerName: string | null, txHash: string | null) => {
    const json = JSON.parse(fs.readFileSync(registryPath).toString());
    if (address !== null && contractName !== null) {
        json["addresses"]["bufferContracts"][contractName] = address;
    }
    if (triggerName !== null) {
        json["triggers"][triggerName] = txHash;
    }
    fs.writeFileSync(registryPath, JSON.stringify(json, null, 4));
};
export const writeBase = (contractName: string | null, address: string | object | null, triggerName: string | null, txHash: string | null) => {
    const json = JSON.parse(fs.readFileSync(registryPath).toString());
    if (address !== null && contractName !== null) {
        json["addresses"]["baseContracts"][contractName] = address;
    }
    if (triggerName !== null) {
        json["triggers"][triggerName] = txHash;
    }
    fs.writeFileSync(registryPath, JSON.stringify(json, null, 4));
};

export const writeBlockStart = (blockId: number) => {
    const json = JSON.parse(fs.readFileSync(registryPath).toString());
    json["blockId"] = blockId;
    fs.writeFileSync(registryPath, JSON.stringify(json, null, 4));
};
export const getStaking = (contractName: string) => {
    return JSON.parse(fs.readFileSync(registryPath).toString())["addresses"]["stakingContracts"][contractName];
};
export const getAbi = (_interface: Interface) => {
    return _interface.format();
};
export const getAddressType = (type: string, contractName: string) => {
    return JSON.parse(fs.readFileSync(registryPath).toString())["addresses"][type][contractName];
};

export const txCheck = async (
    stepFunc: any,
    stepName: string,
    contractName: string | null = null,
    isBaseContract: boolean = false,
    isCaca: boolean = false
) => {
    if (!getTrigger(stepName)) {
        let txHash;
        if (contractName) {
            const contract = await (await stepFunc()).waitForDeployment();
            const contractTx = contract.deploymentTransaction();
            if (contractTx !== undefined) {
                txHash = contractTx?.hash;
            }
            if (!isBaseContract) {
                writeFile(contractName, await contract.getAddress(), stepName, txHash);
            } else {
                writeBase(contractName, await contract.getAddress(), stepName, txHash);
            }
        } else {
            if (!isCaca) {
                const tx = await (await stepFunc()).wait();
                if (tx !== undefined) {
                    txHash = tx.hash;
                }
            } else {
                await stepFunc();
            }

            writeFile(null, null, stepName, txHash);
        }
        console.info(stepName);
    }
};
export const userCheck = (userAddress: string, stepName: string, userName: string) => {
    if (!getTrigger(stepName)) {
        writeFile(userName, userAddress, stepName, null);
        console.info(stepName);
    }
};

export const sanityCheck = (call: any, exp: string, callName: string, callContract: string) => {
    if (call !== exp) {
        console.info(`${callName} NOT SET on ${callContract} !!!!!!!!!!!!!!`);
        console.info(`call: ${call} | expected: ${exp}`);
    } else {
        console.info(`${callName} on ${callContract}: OK`);
    }
    console.info("----------");
};

// sanity check on numbers with an allowed delta percentage in value comparison
export const sanityCheckWithDelta = (currentValue: number, expectedValue: number, allowedDeltaPercentage: number, callName: string, callContract: string) => {
    const deltaValue = (expectedValue * allowedDeltaPercentage) / 100;
    const expectedMinValue = expectedValue - deltaValue;
    const expectedMaxValue = expectedValue + deltaValue;

    if (currentValue < expectedMinValue || currentValue > expectedMaxValue) {
        console.info(`WRONG VALUE FOR ${callName} ON ${callContract} !!!!!!!!!!!!!!`);
        console.info(`got: ${currentValue} | expected: ${expectedValue} +/-${allowedDeltaPercentage}%`);
    } else {
        console.log("price:", currentValue);
        console.info(`${callName} on ${callContract}: OK`);
    }

    console.info("----------");
};
