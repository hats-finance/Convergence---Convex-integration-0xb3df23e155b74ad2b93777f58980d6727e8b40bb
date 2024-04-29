import {ethers} from "hardhat";
import {ApiHelper} from "../../../../../utils/ApiHelper";
import {getAddress, getAbi, getAddressType} from "../../helper";
import fs from "fs";
import {SDT_BUFFER_CONTRACT, SDT_STAKING_CONTRACT} from "../../../../../resources/contracts";
import {IUsers} from "../../../../../utils/contractInterface";
import {VE_SDT_ADDRESS} from "../../../../../resources/stake";
const registryPath = "./scripts/deployer/complete/contractRegistry.json";

export const verifyContracts = async () => {
    const mockERC20Factory = await ethers.getContractFactory("ERC20");
    const sdtStakingFactory = await ethers.getContractFactory(SDT_STAKING_CONTRACT);
    const sdtBufferFactory = await ethers.getContractFactory(SDT_BUFFER_CONTRACT);

    const contractToVerify = JSON.parse(fs.readFileSync(registryPath).toString())["addresses"];
    const veSDTContract = await ethers.getContractFactory("veCVG");
    await ApiHelper.verifyContractEthernal("VeSDT", VE_SDT_ADDRESS, getAbi(veSDTContract.interface));
    for (const contractName in contractToVerify) {
        switch (contractName) {
            case "tokenContracts": {
                for (const contract in contractToVerify[contractName]) {
                    await ApiHelper.verifyContractEthernal(contract, getAddressType("tokenContracts", contract), getAbi(mockERC20Factory.interface));
                }
                break;
            }
            case "curvePoolContracts": {
                for (const contract in contractToVerify[contractName]) {
                    const curvePool = await ethers.getContractAt("ICrvPool", getAddressType("curvePoolContracts", contract));
                    await ApiHelper.verifyContractEthernal(contract, await curvePool.getAddress(), getAbi(curvePool.interface));
                }
                break;
            }
            case "v2PoolContracts": {
                for (const contract in contractToVerify[contractName]) {
                    const univ2Pool = await ethers.getContractAt("IUniswapV2Pair", getAddressType("v2PoolContracts", contract));
                    await ApiHelper.verifyContractEthernal(contract, await univ2Pool.getAddress(), getAbi(univ2Pool.interface));
                }
                break;
            }
            case "v3PoolContracts": {
                for (const contract in contractToVerify[contractName]) {
                    const univ3Pool = await ethers.getContractAt("IUniswapV3Pool", getAddressType("v3PoolContracts", contract));
                    await ApiHelper.verifyContractEthernal(contract, await univ3Pool.getAddress(), getAbi(univ3Pool.interface));
                }
                break;
            }
            case "stakingContracts": {
                for (const contract in contractToVerify[contractName]) {
                    await ApiHelper.verifyContractEthernal(contract, getAddressType("stakingContracts", contract), getAbi(sdtStakingFactory.interface));
                }
                break;
            }
            case "bufferContracts": {
                for (const contract in contractToVerify[contractName]) {
                    await ApiHelper.verifyContractEthernal(contract, getAddressType("bufferContracts", contract), getAbi(sdtBufferFactory.interface));
                }
                break;
            }
            case "baseContracts": {
                for (const contract in contractToVerify[contractName]) {
                    const contractFactory = await ethers.getContractFactory(contract.substring(4));
                    await ApiHelper.verifyContractEthernal(contract, getAddressType("baseContracts", contract), getAbi(contractFactory.interface));
                }
                break;
            }
            case "CvgSdtStaking": {
                const cvgSdtStaking = await ethers.getContractAt("SdtStakingPositionService", getAddress(contractName));
                await ApiHelper.verifyContractEthernal(contractName, await cvgSdtStaking.getAddress(), getAbi(cvgSdtStaking.interface));
                break;
            }
            case "CVG_POOL": {
                const curvePool = await ethers.getContractAt("ICrvPool", getAddress(contractName));
                await ApiHelper.verifyContractEthernal(contractName, await curvePool.getAddress(), getAbi(curvePool.interface));
                break;
            }
            case "CVGSDT_POOL": {
                const curvePlainPool = await ethers.getContractAt("ICrvPoolPlain", getAddress(contractName));
                await ApiHelper.verifyContractEthernal(contractName, await curvePlainPool.getAddress(), getAbi(curvePlainPool.interface));
                break;
            }
            case "UpgradeableBeacon-staking": {
                const contractFactory = await ethers.getContractFactory("UpgradeableBeacon");
                await ApiHelper.verifyContractEthernal(contractName, getAddress(contractName), getAbi(contractFactory.interface));
                break;
            }
            case "UpgradeableBeacon-buffer": {
                const contractFactory = await ethers.getContractFactory("UpgradeableBeacon");
                await ApiHelper.verifyContractEthernal(contractName, getAddress(contractName), getAbi(contractFactory.interface));
                break;
            }
            case "GaugeController": {
                const contractFactory = await ethers.getContractFactory(contractName);
                await ApiHelper.verifyContractEthernal(contractName, getAddress(contractName), getAbi(contractFactory.interface));
                break;
            }
            case "veCVG":
                const contractFactory = await ethers.getContractFactory(contractName);
                await ApiHelper.verifyContractEthernal(contractName, getAddress(contractName), getAbi(contractFactory.interface));
                break;
            case "FeeDistributor":
                break;
            case "treasuryAirdrop":
                break;
            case "treasuryDao":
                break;
            case "treasuryPod":
                break;
            case "treasuryPdd":
                break;
            case "treasuryTeam":
                break;
            case "veSdtMultisig":
                break;
            case "treasuryPartners":
                break;
            default: {
                const contractFactory = await ethers.getContractFactory(contractName);
                await ApiHelper.verifyContractEthernal(contractName, getAddress(contractName), getAbi(contractFactory.interface));
                break;
            }
        }
    }
};
