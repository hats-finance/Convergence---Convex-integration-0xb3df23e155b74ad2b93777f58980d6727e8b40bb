import * as SDT_ASSET from "../../../../resources/tokens/stake-dao";
import * as LP from "../../../../resources/lp";
import * as tokens from "../../../../resources/tokens/common";
import * as oracleParams from "../../../../resources/oracle_config";

export const SDT_ASSET_SD_GAUGE_ASSET = [
    {
        sdAsset: SDT_ASSET.TOKEN_ADDR_sdCRV,
        sdGaugeAsset: SDT_ASSET.TOKEN_ADDR_sdCRV_GAUGE,
    },
    {
        sdAsset: SDT_ASSET.TOKEN_ADDR_sdBAL,
        sdGaugeAsset: SDT_ASSET.TOKEN_ADDR_sdBAL_GAUGE,
    },
    {
        sdAsset: SDT_ASSET.TOKEN_ADDR_sdFXS,
        sdGaugeAsset: SDT_ASSET.TOKEN_ADDR_sdFXS_GAUGE,
    },
    {
        sdAsset: SDT_ASSET.TOKEN_ADDR_sdANGLE,
        sdGaugeAsset: SDT_ASSET.TOKEN_ADDR_sdANGLE_GAUGE,
    },
    {
        sdAsset: SDT_ASSET.TOKEN_ADDR_sdPENDLE,
        sdGaugeAsset: SDT_ASSET.TOKEN_ADDR_sdPENDLE_GAUGE,
    },
    {
        sdAsset: SDT_ASSET.TOKEN_ADDR_sdFXN,
        sdGaugeAsset: SDT_ASSET.TOKEN_ADDR_sdFXN_GAUGE,
    },
];

export const LP_ASSET_LP_STRAT_LP_GAUGE = [
    {
        lpAsset: LP.CRV_TRI_CRYPTO_USDC,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_triUSDC_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_triUSDC_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_USDT_crvUSD,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_crvUSD_USDT_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_crvUSD_USDT_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_STG_USDC,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_STG_USDC_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_STG_USDC_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_SDCRV_CRV,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_sdCRV_CRV_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_sdCRV_CRV_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_USDC_crvUSD,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_USDC_crvUSD_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_USDC_crvUSD_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_frxETH_ETH,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_frxETH_ETH_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_frxETH_ETH_GAUGE,
    },

    {
        lpAsset: LP.CRV_TRI_CRYPTO_USDT,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_triUSDT_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_triUSDT_GAUGE,
    },
    {
        lpAsset: LP.CRV_TRI_CRYPTO_LLAMA,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_triLLAMA_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_triLLAMA_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_agEUR_EUROC,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_agEUR_EUROC_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_agEUR_EUROC_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_MIM_3CRV,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_MIM_3CRV_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_MIM_3CRV_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_dETH_frxETH,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_dETH_frxETH_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_dETH_frxETH_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_cvxCRV_CRV,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_cvxCRV_CRV_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_cvxCRV_CRV_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_SDFXS_FXS,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_sdFXS_FXS_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_sdFXS_FXS_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_FRAXBP,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_FRAXBP_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_FRAXBP_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_alUSD_FRAXBP,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_alUSD_FRAXBP_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_alUSD_FRAXBP_GAUGE,
    },

    {
        lpAsset: LP.CRV_TRI_CRYPTO_USDT2,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_triUSDT2_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_triUSDT2_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_ETH_rETH,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_ETH_rETH_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_ETH_rETH_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_XAI_crvUSD,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_XAI_crvUSD_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_XAI_crvUSD_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_COIL_FRAXBP,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_COIL_FRAXBP_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_COIL_FRAXBP_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_sUSD_CRVUSD,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_sUSD_crvUSD_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_sUSD_crvUSD_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_DOLA_crvUSD,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_DOLA_crvUSD_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_DOLA_crvUSD_GAUGE,
    },
    {
        lpAsset: LP.CRV_TRI_CRYPTO_CRV,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_triCRV_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_triCRV_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_mkUSD_FRAXBP,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_mkUSD_FRAXBP_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_mkUSD_FRAXBP_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_ETH_CNC,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_CNC_ETH_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_CNC_ETH_GAUGE,
    },

    {
        lpAsset: LP.CRV_DUO_XAI_FRAXBP,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_XAI_FRAXBP_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_XAI_FRAXBP_GAUGE,
    },
    {
        lpAsset: LP.CRV_TRI_CRYPTO_SDT,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_triSDT_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_triSDT_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_stETH_ETH,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_stETH_ETH_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_stETH_ETH_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_crvUSD_FRAX,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_crvUSD_FRAX_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_crvUSD_FRAX_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_ETHp_WETH,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_ETHp_WETH_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_ETHp_WETH_GAUGE,
    },
    {
        lpAsset: LP.CRV_DUO_WETH_SDT,
        lpStratAsset: SDT_ASSET.TOKEN_ADDR_WETH_SDT_STRAT,
        lpGaugeAsset: SDT_ASSET.TOKEN_ADDR_WETH_SDT_GAUGE,
    },
];

// ORACLE PARAMS
export const oracleStableParams = [
    {name: "DAI", token: tokens.TOKEN_ADDR_DAI, oracleParams: oracleParams.DAI_ORACLE_PARAMS},
    {name: "FRAX", token: tokens.TOKEN_ADDR_FRAX, oracleParams: oracleParams.FRAX_ORACLE_PARAMS},
    {name: "USDC", token: tokens.TOKEN_ADDR_USDC, oracleParams: oracleParams.USDC_ORACLE_PARAMS},
    {name: "crvUSD", token: tokens.TOKEN_ADDR_crvUSD, oracleParams: oracleParams.CRVUSD_ORACLE_PARAMS},
    {name: "USDT", token: tokens.TOKEN_ADDR_USDT, oracleParams: oracleParams.USDT_ORACLE_PARAMS},
    {name: "3CRV", token: LP.TOKEN_ADDR_3CRV, oracleParams: oracleParams._3CRV_ORACLE_PARAMS},
];

export const oracleCurveDuoParams = [
    {name: "CVX", token: tokens.TOKEN_ADDR_CVX, oracleParams: oracleParams.CVX_ORACLE_PARAMS},
    {name: "SDT", token: tokens.TOKEN_ADDR_SDT, oracleParams: oracleParams.SDT_ORACLE_PARAMS},
    {name: "CNC", token: tokens.TOKEN_ADDR_CNC, oracleParams: oracleParams.CNC_ORACLE_PARAMS},
    {name: "FXN", token: tokens.TOKEN_ADDR_FXN, oracleParams: oracleParams.FXN_ORACLE_PARAMS},
];

export const oracleCurveTriParams = [{name: "CRV", token: tokens.TOKEN_ADDR_CRV, oracleParams: oracleParams.CRV_ORACLE_PARAMS}];

export const oracleUniV3Params = [{name: "WETH", token: tokens.TOKEN_ADDR_WETH, oracleParams: oracleParams.WETH_ORACLE_PARAMS}];

export const oracleUniV2Params = [
    {name: "FXS", token: tokens.TOKEN_ADDR_FXS, oracleParams: oracleParams.FXS_ORACLE_PARAMS},
    {name: "BAL", token: tokens.TOKEN_ADDR_BAL, oracleParams: oracleParams.BAL_ORACLE_PARAMS},
    {name: "ANGLE", token: tokens.TOKEN_ADDR_ANGLE, oracleParams: oracleParams.ANGLE_ORACLE_PARAMS},
    {name: "PENDLE", token: tokens.TOKEN_ADDR_PENDLE, oracleParams: oracleParams.PENDLE_ORACLE_PARAMS},
    {name: "wstETH", token: tokens.TOKEN_ADDR_wstETH, oracleParams: oracleParams.wstETH_ORACLE_PARAMS},
];
