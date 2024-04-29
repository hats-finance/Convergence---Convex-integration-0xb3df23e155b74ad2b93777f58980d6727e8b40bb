import dotenv from "dotenv";
dotenv.config();
import {CvgOracleUpgradeable} from "../../typechain-types";
import {deployProxy, deployProxyImplem} from "../../utils/global/deployProxy";
import {getAddress, getContract, txCheck} from "../deployer/complete/helper";
import {PROXY_ADMIN} from "../../resources/contracts";
import {oracleCurveDuoParamsV2, oracleCurveTriParams, oracleStableParams, oracleUniV2Params} from "../../resources/oracle-config-prod";
import {CVG} from "../../resources/cvg-mainnet";
import {TREASURY_DAO} from "../../resources/treasury";

const BASE_CVG_ORACLE_UPGRADEABLE = "BaseCvgOracleUpgradeable";
const CVG_ORACLE_UPGRADEABLE = "CvgOracleUpgradeable";

async function main() {
    //deploy base cvg oracle v2
    await txCheck(
        async () => {
            return await deployProxyImplem<CvgOracleUpgradeable>("CvgOracleUpgradeable");
        },
        "DEPLOY_BASE_CVG_ORACLE_UPGRADEABLE",
        BASE_CVG_ORACLE_UPGRADEABLE,
        true
    );

    const baseContracts = await getAddress("baseContracts");

    // deploy proxy cvg oracle
    const proxyAdmin = getAddress(PROXY_ADMIN);
    await txCheck(
        async () => {
            return await deployProxy<CvgOracleUpgradeable>("", [], "CvgOracleUpgradeable", proxyAdmin, true, baseContracts[BASE_CVG_ORACLE_UPGRADEABLE]);
        },
        "DEPLOY_CVG_ORACLE_UPGRADEABLE",
        CVG_ORACLE_UPGRADEABLE
    );

    const cvgOracle = await getContract<CvgOracleUpgradeable>(CVG_ORACLE_UPGRADEABLE);

    //set tokens
    for (const param of oracleStableParams) {
        await txCheck(async () => {
            return cvgOracle.setPoolTypeForToken(param.token, 1);
        }, "V2_SET_POOL_TYPE_STABLE_FOR_" + param.name);

        await txCheck(async () => {
            return cvgOracle.setStableParams(param.token, param.oracleParams);
        }, "V2_SET_STABLE_PARAM_FOR_" + param.name);
    }

    for (const param of oracleCurveDuoParamsV2) {
        await txCheck(async () => {
            return cvgOracle.setPoolTypeForToken(param.token, 2);
        }, "V2_SET_POOL_TYPE_CURVE_DUO_FOR_" + param.name);

        await txCheck(async () => {
            return cvgOracle.setCurveDuoParams(param.token, param.oracleParams);
        }, "V2_SET_CURVE_DUO_PARAM_FOR_" + param.name);
    }

    for (const param of oracleCurveTriParams) {
        await txCheck(async () => {
            return cvgOracle.setPoolTypeForToken(param.token, 3);
        }, "V2_SET_POOL_TYPE_CURVE_TRI_FOR_" + param.name);

        await txCheck(async () => {
            return cvgOracle.setCurveTriParams(param.token, param.oracleParams);
        }, "V2_SET_CURVE_TRI_PARAM_FOR_" + param.name);
    }

    for (const param of oracleUniV2Params) {
        await txCheck(async () => {
            return cvgOracle.setPoolTypeForToken(param.token, 5);
        }, "V2_SET_POOL_TYPE_UNIV2_FOR_" + param.name);

        await txCheck(async () => {
            return cvgOracle.setUniV2Params(param.token, param.oracleParams);
        }, "V2_SET_UNIV2_PARAM_FOR_" + param.name);
    }

    ///////////////////////CVG

    await txCheck(async () => {
        return cvgOracle.setPoolTypeForToken(CVG, 2);
    }, "V2_SET_POOL_TYPE_UNIV2_FOR_CVG");

    await txCheck(async () => {
        const cvgCurveDuoParamsV2 = {
            isReversed: false,
            isEthPriceRelated: true,
            isNg: true,
            poolAddress: "0x004c167d27ada24305b76d80762997fa6eb8d9b2",
            deltaLimitOracle: 1000n,
            maxLastUpdate: 21600n,
            minPrice: 200000000000000000n,
            maxPrice: 10000000000000000000n,
            stablesToCheck: [],
        };
        return cvgOracle.setCurveDuoParams(CVG, cvgCurveDuoParamsV2);
    }, "V2_SET_UNIV2_PARAM_FOR_CVG");

    //VERIFY

    //TRANSFER OWNERSHIP
    await txCheck(async () => {
        return cvgOracle.transferOwnership(TREASURY_DAO);
    }, "V2_CVG_ORACLE_TRANSFER_OWNERSHIP");
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

//npx hardhat run scripts/mainnet/deployAndSetOracle.ts --network localhost
