import dotenv from "dotenv";
dotenv.config();
import {LockingPositionServiceV2, YsStreamer} from "../../typechain-types";
import {deployProxy, deployProxyImplem} from "../../utils/global/deployProxy";
import {getAddress, getContract, txCheck} from "../deployer/complete/helper";
import {PROXY_ADMIN} from "../../resources/contracts";
import {CVG} from "../../resources/cvg-mainnet";
import {TREASURY_DAO} from "../../resources/treasury";
import {ethers, upgrades} from "hardhat";
const BASE_YS_STREAMER = "BaseYsStreamer";
const BASE_LOCKING_SERVICE_V2 = "BaseLockingServiceV2";
const YS_STREAMER = "YsStreamer";

async function main() {
    //deploy Proxy Implem YsStreamer
    await txCheck(
        async () => {
            return await deployProxyImplem<YsStreamer>("YsStreamer");
        },
        "DEPLOY_BASE_YS_STREAMER",
        BASE_YS_STREAMER,
        true
    );
    // deploy Proxy YsStreamer
    const baseContracts = await getAddress("baseContracts");
    const proxyAdmin = getAddress(PROXY_ADMIN);
    console.log("BASE_YS_STREAMER", baseContracts[BASE_YS_STREAMER]);
    // deploy proxy ys streamer
    await txCheck(
        async () => {
            return await deployProxy<YsStreamer>("", [], "YsStreamer", proxyAdmin, true, baseContracts[BASE_YS_STREAMER]);
        },
        "DEPLOY_YS_STREAMER",
        YS_STREAMER
    );

    //deploy Proxy Implem Locking Service
    const LockingPositionServiceFactory = await ethers.getContractFactory("LockingPositionService");
    const LockingPositionServiceV2Factory = await ethers.getContractFactory("LockingPositionServiceV2");
    await upgrades.validateUpgrade(LockingPositionServiceFactory, LockingPositionServiceV2Factory);
    await txCheck(
        async () => {
            return await deployProxyImplem<LockingPositionServiceV2>("LockingPositionServiceV2");
        },
        "DEPLOY_BASE_LOCKING_SERVICE_V2",
        BASE_LOCKING_SERVICE_V2,
        true
    );
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

//npx hardhat run scripts/mainnet/deployYsStreamer.ts --network mainnet
