import {TOKEN_ADDR_crvUSD} from "./tokens/common";
import {
    CHAINLINK_CRVUSD_USD,
    CHAINLINK_DAI_USD,
    CHAINLINK_ETH_USD,
    CHAINLINK_FRAX_USD,
    CHAINLINK_FXS_USD,
    CHAINLINK_USDC_USD,
    CHAINLINK_USDT_USD,
} from "./aggregators";
import {
    CRV_DUO_dYFI_ETH,
    CRV_DUO_ETH_CNC,
    CRV_DUO_ETH_CVX,
    CRV_DUO_ETH_FXN,
    CRV_DUO_SDT_ETH,
    CRV_DUO_YFI_ETH,
    CRV_TRI_CRYPTO_CRV,
    UNIV2_ANGLE_WETH,
    UNIV2_BAL_WETH,
    UNIV2_FXS_FRAX,
    UNIV2_PENDLE_WETH,
    UNIV2_wstETH_WETH, UNIV3_APW_ETH,
    UNIV3_USDC_ETH,
} from "./lp";

import {ethers} from "hardhat";
import { IOracleStruct } from "../typechain-types/contracts/Bond/CvgOracle";
import { IOracleStructV2 } from "../typechain-types/contracts/Bond/CvgOracleUpgradeable";

export const DAI_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_DAI_USD,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    maxLastUpdate: 86_400_000,
};

export const FRAX_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_FRAX_USD,
    deltaLimitOracle: 10000,
    minPrice: "0",
    maxPrice: ethers.parseEther("100000000000"),
    maxLastUpdate: 86_400_000,
};

export const USDC_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_USDC_USD,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    maxLastUpdate: 86_400_000,
};

export const CRVUSD_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_CRVUSD_USD,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    maxLastUpdate: 86_400_000,
};

export const _3CRV_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_DAI_USD,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    maxLastUpdate: 86_400_000,
};

export const USDT_ORACLE_PARAMS: IOracleStruct.StableParamsStruct = {
    aggregatorOracle: CHAINLINK_USDT_USD,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    maxLastUpdate: 86_400_000,
};

export const WETH_ORACLE_PARAMS: IOracleStruct.UniV3ParamsStruct = {
    poolAddress: UNIV3_USDC_ETH,
    isReversed: true,
    isEthPriceRelated: false,
    aggregatorOracle: CHAINLINK_ETH_USD,
    deltaLimitOracle: 1_200,
    twap: 30,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};

export const CRV_ORACLE_PARAMS: IOracleStruct.CurveTriParamsStruct = {
    poolAddress: CRV_TRI_CRYPTO_CRV,
    isReversed: false,
    isEthPriceRelated: false,
    deltaLimitOracle: 200,
    k: 1,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [TOKEN_ADDR_crvUSD],
    maxLastUpdate: 86_400_000,
};

export const CVX_ORACLE_PARAMS: IOracleStruct.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_ETH_CVX,
    isReversed: false,
    isEthPriceRelated: true,
    deltaLimitOracle: 200,
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

export const wstETH_ORACLE_PARAMS: IOracleStruct.UniV2ParamsStruct = {
    poolAddress: UNIV2_wstETH_WETH,
    aggregatorOracle: CHAINLINK_FXS_USD,
    isReversed: true,
    isEthPriceRelated: true,
    deltaLimitOracle: 1_000, // 10%
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};

export const SDT_ORACLE_PARAMS: IOracleStruct.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_SDT_ETH,
    isReversed: false,
    isEthPriceRelated: true,
    deltaLimitOracle: 1,
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

export const YFI_ORACLE_PARAMS: IOracleStructV2.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_YFI_ETH,
    isReversed: false,
    isEthPriceRelated: true,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
    isNg: false,
};

export const dYFI_ORACLE_PARAMS: IOracleStructV2.CurveDuoParamsStruct = {
    poolAddress: CRV_DUO_dYFI_ETH,
    isReversed: false,
    isEthPriceRelated: true,
    deltaLimitOracle: 1000,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
    isNg: false
};

export const APW_ORACLE_PARAMS: IOracleStructV2.UniV3ParamsStruct = {
    poolAddress: UNIV3_APW_ETH,
    isReversed: false,
    isEthPriceRelated: true,
    aggregatorOracle: CHAINLINK_DAI_USD, // on purpose
    deltaLimitOracle: 1_200,
    twap: 30,
    minPrice: "1",
    maxPrice: ethers.parseEther("10000000000"),
    stablesToCheck: [],
    maxLastUpdate: 86_400_000,
};