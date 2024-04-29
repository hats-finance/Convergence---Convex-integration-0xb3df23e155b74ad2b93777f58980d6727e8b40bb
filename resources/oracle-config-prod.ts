import {
    TOKEN_ADDR_ANGLE,
    TOKEN_ADDR_BAL,
    TOKEN_ADDR_CNC,
    TOKEN_ADDR_CRV,
    TOKEN_ADDR_crvUSD,
    TOKEN_ADDR_CVX,
    TOKEN_ADDR_DAI,
    TOKEN_ADDR_FRAX,
    TOKEN_ADDR_FXN,
    TOKEN_ADDR_FXS,
    TOKEN_ADDR_PENDLE,
    TOKEN_ADDR_SDT,
    TOKEN_ADDR_USDC,
    TOKEN_ADDR_USDT,
    TOKEN_ADDR_WETH,
    TOKEN_ADDR_wstETH,
} from "./tokens/common";
import {
    CHAINLINK_CRVUSD_USD,
    CHAINLINK_CRV_USD,
    CHAINLINK_CVX_USD,
    CHAINLINK_DAI_USD,
    CHAINLINK_ETH_USD,
    CHAINLINK_FRAX_USD,
    CHAINLINK_FXS_USD,
    CHAINLINK_USDC_USD,
    CHAINLINK_USDT_USD,
} from "./aggregators";
import {
    CRV_DUO_ETH_CNC,
    CRV_DUO_ETH_CVX,
    CRV_DUO_ETH_FXN,
    CRV_DUO_SDT_ETH,
    CRV_DUO_SDT_FRAX_BP,
    CRV_TRI_CRYPTO_CRV,
    CRV_TRI_CRYPTO_LLAMA,
    CRV_TRI_CRYPTO_SDT,
    POOL_TRI_CRYPTO_USDT2,
    TOKEN_ADDR_3CRV,
    UNIV2_ANGLE_WETH,
    UNIV2_BAL_WETH,
    UNIV2_FXS_FRAX,
    UNIV2_PENDLE_WETH,
    UNIV2_wstETH_WETH,
    UNIV3_USDC_ETH,
} from "./lp";

import {ethers} from "hardhat";
import {IOracleStruct} from "../typechain-types/contracts/Bond/CvgOracle";
import {IOracleStructV2} from "../typechain-types/contracts/Bond/CvgOracleUpgradeable.sol/CvgOracleUpgradeable";

export const THREE_HOURS = 60 * 60 * 3;
export const SIX_HOURS = 60 * 60 * 6;
export const ONE_DAY = 60 * 60 * 24;

export const DAI_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_DAI_USD,
    deltaLimitOracle: 50,
    minPrice: ethers.parseEther("0.995"),
    maxPrice: ethers.parseEther("1.005"),
    maxLastUpdate: SIX_HOURS,
};

export const FRAX_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_FRAX_USD,
    deltaLimitOracle: 50,
    minPrice: ethers.parseEther("0.995"),
    maxPrice: ethers.parseEther("1.005"),
    maxLastUpdate: SIX_HOURS,
};

export const USDC_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_USDC_USD,
    deltaLimitOracle: 50,
    minPrice: ethers.parseEther("0.995"),
    maxPrice: ethers.parseEther("1.005"),
    maxLastUpdate: ONE_DAY,
};

export const CRVUSD_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_CRVUSD_USD,
    deltaLimitOracle: 50,
    minPrice: ethers.parseEther("0.995"),
    maxPrice: ethers.parseEther("1.005"),
    maxLastUpdate: ONE_DAY,
};

export const _3CRV_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_DAI_USD,
    deltaLimitOracle: 50,
    minPrice: ethers.parseEther("0.995"),
    maxPrice: ethers.parseEther("1.005"),
    maxLastUpdate: SIX_HOURS,
};

export const USDT_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_USDT_USD,
    deltaLimitOracle: 50,
    minPrice: ethers.parseEther("0.995"),
    maxPrice: ethers.parseEther("1.005"),
    maxLastUpdate: ONE_DAY,
};

export const WETH_ORACLE_PARAMS: IOracleStruct.CurveTriParamsStruct = {
    poolAddress: POOL_TRI_CRYPTO_USDT2,
    isReversed: false,
    isEthPriceRelated: false,
    k: 1,
    deltaLimitOracle: 500,
    minPrice: ethers.parseEther("2500"),
    maxPrice: ethers.parseEther("5000"),
    stablesToCheck: [TOKEN_ADDR_USDT],
    maxLastUpdate: THREE_HOURS,
};

export const CRV_ORACLE_PARAMS: IOracleStruct.CurveTriParamsStruct = {
    poolAddress: CRV_TRI_CRYPTO_CRV,
    isReversed: false,
    isEthPriceRelated: false,
    deltaLimitOracle: 500,
    k: 1,
    minPrice: ethers.parseEther("0.25"),
    maxPrice: ethers.parseEther("0.8"),
    stablesToCheck: [],
    maxLastUpdate: THREE_HOURS,
};

export const CVX_ORACLE_PARAMS: IOracleStruct.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_ETH_CVX,
    isReversed: false,
    isEthPriceRelated: true,
    deltaLimitOracle: 500,
    minPrice: ethers.parseEther("1"),
    maxPrice: ethers.parseEther("5"),
    stablesToCheck: [],
    maxLastUpdate: THREE_HOURS,
};
export const CVX_ORACLE_PARAMS_V2: IOracleStructV2.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_ETH_CVX,
    isReversed: false,
    isEthPriceRelated: true,
    isNg: false,
    deltaLimitOracle: 500,
    minPrice: ethers.parseEther("1"),
    maxPrice: ethers.parseEther("5"),
    stablesToCheck: [],
    maxLastUpdate: THREE_HOURS,
};

export const BAL_ORACLE_PARAMS: IOracleStruct.UniV2ParamsStruct = {
    poolAddress: UNIV2_BAL_WETH,
    aggregatorOracle: CHAINLINK_FXS_USD,
    isReversed: true,
    isEthPriceRelated: true,
    deltaLimitOracle: 1_000, // 10%
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};
export const ANGLE_ORACLE_PARAMS: IOracleStruct.UniV2ParamsStruct = {
    poolAddress: UNIV2_ANGLE_WETH,
    aggregatorOracle: CHAINLINK_FXS_USD,
    isReversed: true,
    isEthPriceRelated: true,
    deltaLimitOracle: 1_000, // 10%
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};
export const PENDLE_ORACLE_PARAMS: IOracleStruct.UniV2ParamsStruct = {
    poolAddress: UNIV2_PENDLE_WETH,
    aggregatorOracle: CHAINLINK_FXS_USD,
    isReversed: true,
    isEthPriceRelated: true,
    deltaLimitOracle: 1_000, // 10%
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};

export const wstETH_ORACLE_PARAMS: IOracleStruct.CurveTriParamsStruct = {
    poolAddress: CRV_TRI_CRYPTO_LLAMA,
    isReversed: false,
    isEthPriceRelated: false,
    k: 1,
    deltaLimitOracle: 500, // 5%
    minPrice: ethers.parseEther("1500"),
    maxPrice: ethers.parseEther("5000"),
    stablesToCheck: [],
    maxLastUpdate: SIX_HOURS,
};

export const SDT_ORACLE_PARAMS: IOracleStruct.CurveTriParamsStruct = {
    poolAddress: CRV_TRI_CRYPTO_SDT,
    isReversed: false,
    isEthPriceRelated: false,
    deltaLimitOracle: 500,
    k: 1,
    minPrice: ethers.parseEther("0.13"),
    maxPrice: ethers.parseEther("0.46"),
    stablesToCheck: [],
    maxLastUpdate: SIX_HOURS,
};

export const FXN_ORACLE_PARAMS: IOracleStruct.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_ETH_FXN,
    isReversed: false,
    isEthPriceRelated: true,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};
export const FXN_ORACLE_PARAMS_V2: IOracleStructV2.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_ETH_FXN,
    isReversed: false,
    isEthPriceRelated: true,
    isNg: false,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};

export const CNC_ORACLE_PARAMS: IOracleStruct.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_ETH_CNC,
    isReversed: false,
    isEthPriceRelated: true,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};
export const CNC_ORACLE_PARAMS_V2: IOracleStructV2.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_ETH_CNC,
    isReversed: false,
    isEthPriceRelated: true,
    isNg: false,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};

export const FXS_ORACLE_PARAMS: IOracleStruct.UniV2ParamsStruct = {
    poolAddress: UNIV2_FXS_FRAX,
    aggregatorOracle: CHAINLINK_FXS_USD,
    isReversed: true,
    isEthPriceRelated: false,
    deltaLimitOracle: 1_000, // 10%
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};

export const oracleStableParams = [
    {name: "DAI", token: TOKEN_ADDR_DAI, oracleParams: DAI_ORACLE_PARAMS},
    {name: "FRAX", token: TOKEN_ADDR_FRAX, oracleParams: FRAX_ORACLE_PARAMS},
    {name: "USDC", token: TOKEN_ADDR_USDC, oracleParams: USDC_ORACLE_PARAMS},
    {name: "crvUSD", token: TOKEN_ADDR_crvUSD, oracleParams: CRVUSD_ORACLE_PARAMS},
    {name: "USDT", token: TOKEN_ADDR_USDT, oracleParams: USDT_ORACLE_PARAMS},
    {name: "3CRV", token: TOKEN_ADDR_3CRV, oracleParams: _3CRV_ORACLE_PARAMS},
];

export const oracleCurveDuoParams = [
    {name: "CVX", token: TOKEN_ADDR_CVX, oracleParams: CVX_ORACLE_PARAMS},
    {name: "FXN", token: TOKEN_ADDR_FXN, oracleParams: FXN_ORACLE_PARAMS},
    {name: "CNC", token: TOKEN_ADDR_CNC, oracleParams: CNC_ORACLE_PARAMS},
];
export const oracleCurveDuoParamsV2 = [
    {name: "CVX", token: TOKEN_ADDR_CVX, oracleParams: CVX_ORACLE_PARAMS_V2},
    {name: "FXN", token: TOKEN_ADDR_FXN, oracleParams: FXN_ORACLE_PARAMS_V2},
    {name: "CNC", token: TOKEN_ADDR_CNC, oracleParams: CNC_ORACLE_PARAMS_V2},
];

export const oracleCurveTriParams = [
    {name: "CRV", token: TOKEN_ADDR_CRV, oracleParams: CRV_ORACLE_PARAMS},
    {name: "WETH", token: TOKEN_ADDR_WETH, oracleParams: WETH_ORACLE_PARAMS},
    {name: "SDT", token: TOKEN_ADDR_SDT, oracleParams: SDT_ORACLE_PARAMS},
    {name: "wstETH", token: TOKEN_ADDR_wstETH, oracleParams: wstETH_ORACLE_PARAMS},
];

export const oracleUniV2Params = [
    {name: "FXS", token: TOKEN_ADDR_FXS, oracleParams: FXS_ORACLE_PARAMS},
    {name: "BAL", token: TOKEN_ADDR_BAL, oracleParams: BAL_ORACLE_PARAMS},
    {name: "ANGLE", token: TOKEN_ADDR_ANGLE, oracleParams: ANGLE_ORACLE_PARAMS},
    {name: "PENDLE", token: TOKEN_ADDR_PENDLE, oracleParams: PENDLE_ORACLE_PARAMS},
];
