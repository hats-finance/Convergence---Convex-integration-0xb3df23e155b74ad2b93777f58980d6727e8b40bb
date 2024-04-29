import {TOKEN_ADDR_CVX_CRV, TOKEN_ADDR_CVX_FPIS, TOKEN_ADDR_CVX_FXN, TOKEN_ADDR_CVX_FXS, TOKEN_ADDR_CVX_PRISMA} from "../../resources/convex";
import {CVG} from "../../resources/cvg-mainnet";
import {
    CRV_DUO_agEUR_EUROC,
    CRV_DUO_alUSD_FRAXBP,
    CRV_DUO_COIL_FRAXBP,
    CRV_DUO_cvxCRV_CRV,
    CRV_DUO_DOLA_crvUSD,
    CRV_DUO_ETH_rETH,
    CRV_DUO_FRAXBP,
    CRV_DUO_frxETH_ETH,
    CRV_DUO_MIM_3CRV,
    CRV_DUO_dETH_frxETH,
    CRV_DUO_mkUSD_FRAXBP,
    CRV_DUO_SDCRV_CRV,
    CRV_DUO_SDFXS_FXS,
    CRV_DUO_stETH_ETH,
    CRV_DUO_STG_USDC,
    CRV_DUO_sUSD_CRVUSD,
    CRV_DUO_USDC_crvUSD,
    CRV_DUO_USDT_crvUSD,
    CRV_DUO_XAI_crvUSD,
    CRV_DUO_XAI_FRAXBP,
    CRV_TRI_CRYPTO_SDT,
    CRV_TRI_CRYPTO_USDC,
    CRV_TRI_CRYPTO_USDT,
    CRV_TRI_CRYPTO_USDT2,
    CRV_TRI_CRYPTO_CRV,
    CRV_TRI_CRYPTO_LLAMA,
    LP_CRV_DUO_ETH_CNC,
    TOKEN_ADDR_3CRV,
    CRV_DUO_crvUSD_FRAX,
    CRV_DUO_ETHp_WETH,
    CRV_DUO_WETH_SDT,
    CRV_DUO_pxETH_stETH,
    CRV_DUO_pxETH_frxETH,
    CRV_DUO_PYUSD_USDC,
    CRV_DUO_CVG_ETH,
    CRV_DUO_cvgSDT_SDT,
} from "../../resources/lp";
import {
    TOKEN_ADDR_CNC,
    TOKEN_ADDR_CRV,
    TOKEN_ADDR_crvUSD,
    TOKEN_ADDR_CVX,
    TOKEN_ADDR_DAI,
    TOKEN_ADDR_FRAX,
    TOKEN_ADDR_FXS,
    TOKEN_ADDR_SDT,
    TOKEN_ADDR_USDC,
    TOKEN_ADDR_USDT,
    TOKEN_ADDR_WETH,
    TOKEN_ADDR_wstETH,
    TOKEN_ADDR_FIS,
    TOKEN_ADDR_LDO,
    TOKEN_ADDR_SPELL,
    TOKEN_ADDR_ANGLE,
    TOKEN_ADDR_BAL,
    TOKEN_ADDR_FXN,
    TOKEN_ADDR_PENDLE,
    TOKEN_ADDR_eUSD,
    TOKEN_ADDR_PRISMA,
    TOKEN_ADDR_FPIS, TOKEN_ADDR_YFI, TOKEN_ADDR_APW,
} from "../../resources/tokens/common";
import {TOKEN_ADDR_eUSD_FRAXBP} from "../../resources/tokens/curve";
import {
    TOKEN_ADDR_80BAL_20WETH,
    TOKEN_ADDR_AG_EUR,
    TOKEN_ADDR_BB_A_USD,
    TOKEN_ADDR_SAN_USDC_EUR,
    TOKEN_ADDR_sdANGLE,
    TOKEN_ADDR_sdANGLE_GAUGE,
    TOKEN_ADDR_sdBAL,
    TOKEN_ADDR_sdBAL_GAUGE,
    TOKEN_ADDR_sdCRV,
    TOKEN_ADDR_sdCRV_GAUGE,
    TOKEN_ADDR_SD_FRAX_3CRV,
    TOKEN_ADDR_sdFXN,
    TOKEN_ADDR_sdFXN_GAUGE,
    TOKEN_ADDR_sdFXS,
    TOKEN_ADDR_sdFXS_GAUGE,
    TOKEN_ADDR_sdPENDLE,
    TOKEN_ADDR_sdPENDLE_GAUGE, TOKEN_ADDR_sdYFI, TOKEN_ADDR_sdAPW, TOKEN_ADDR_sdYFI_GAUGE, TOKEN_ADDR_sdAPW_GAUGE,
} from "../../resources/tokens/stake-dao";

export const SDASSET_GAUGE_TOKENS = {
    sdCRV: {
        ticker: "sdCRV",
        isVyper: true,
        slotBalance: 12,
        address: TOKEN_ADDR_sdCRV_GAUGE,
    },
    sdANGLE: {
        ticker: "sdANGLE",
        isVyper: true,
        slotBalance: 12,
        address: TOKEN_ADDR_sdANGLE_GAUGE,
    },
    sdFXS: {
        ticker: "sdFXS",
        isVyper: true,
        slotBalance: 12,
        address: TOKEN_ADDR_sdFXS_GAUGE,
    },
    sdBAL: {
        ticker: "sdBAL",
        isVyper: true,
        slotBalance: 12,
        address: TOKEN_ADDR_sdBAL_GAUGE,
    },
    sdPENDLE: {
        ticker: "sdPENDLE",
        isVyper: true,
        slotBalance: 12,
        address: TOKEN_ADDR_sdPENDLE_GAUGE,
    },
    sdFXN: {
        ticker: "sdFXN",
        isVyper: true,
        slotBalance: 12,
        address: TOKEN_ADDR_sdFXN_GAUGE,
    },
    sdYFI: {
        ticker: "sdYFI",
        isVyper: true,
        slotBalance: 12,
        address: TOKEN_ADDR_sdYFI_GAUGE,
    },
    sdAPW: {
        ticker: "sdAPW",
        isVyper: true,
        slotBalance: 12,
        address: TOKEN_ADDR_sdAPW_GAUGE,
    },
};

export const THIEF_TOKEN_CONFIG = {
    CVG: {
        isVyper: false,
        slotBalance: 0,
        address: CVG,
        decimals: 18,
    },

    DAI: {
        isVyper: false,
        slotBalance: 2,
        address: TOKEN_ADDR_DAI,
        decimals: 18,
    },
    FRAX: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_FRAX,
        decimals: 18,
    },
    WETH: {
        isVyper: false,
        slotBalance: 3,
        address: TOKEN_ADDR_WETH,
        decimals: 18,
    },
    CRV: {
        isVyper: true,
        slotBalance: 3,
        address: TOKEN_ADDR_CRV,
        decimals: 18,
    },
    CVX: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_CVX,
        decimals: 18,
    },
    CNC: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_CNC,
        decimals: 18,
    },
    FXS: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_FXS,
        decimals: 18,
    },
    PENDLE: {
        isVyper: false,
        slotBalance: 15,
        address: TOKEN_ADDR_PENDLE,
        decimals: 18,
    },
    SDT: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_SDT,
        decimals: 18,
    },
    FRAXBP: {
        isVyper: true,
        slotBalance: 7,
        address: CRV_DUO_FRAXBP,
        decimals: 18,
    },
    USDC: {
        isVyper: false,
        slotBalance: 9,
        address: TOKEN_ADDR_USDC,
        decimals: 6,
    },
    USDT: {
        isVyper: false,
        slotBalance: 2,
        address: TOKEN_ADDR_USDT,
        decimals: 6,
    },
    _3CRV: {
        isVyper: true,
        slotBalance: 3,
        address: TOKEN_ADDR_3CRV,
        decimals: 18,
    },

    CRVUSD: {
        isVyper: true,
        slotBalance: 1,
        address: TOKEN_ADDR_crvUSD,
        decimals: 18,
    },

    SDFRAX3CRV: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_SD_FRAX_3CRV,
        decimals: 18,
    },

    wstETH: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_wstETH,
        decimals: 18,
    },

    FIS: {
        isVyper: false,
        slotBalance: 1,
        address: TOKEN_ADDR_FIS,
        decimals: 18,
    },
    LDO: {
        isVyper: false,
        slotBalance: 1,
        address: TOKEN_ADDR_LDO,
        decimals: 18,
    },
    SPELL: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_SPELL,
        decimals: 18,
    },

    sd_CRV: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_sdCRV,
        decimals: 18,
    },
    sd_CRV_GAUGE: {
        isVyper: true,
        slotBalance: 12,
        address: TOKEN_ADDR_sdCRV_GAUGE,
        decimals: 18,
    },

    sd_PENDLE: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_sdPENDLE,
        decimals: 18,
    },

    sd_FXS: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_sdFXS,
        decimals: 18,
    },

    // BAL

    sd_BAL: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_sdBAL,
        decimals: 18,
    },

    BB_A_USD: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_BB_A_USD,
        decimals: 18,
    },

    BAL: {
        isVyper: false,
        slotBalance: 1,
        address: TOKEN_ADDR_BAL,
        decimals: 18,
    },

    // ANGLE

    sd_ANGLE: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_sdANGLE,
        decimals: 18,
    },

    SAN_USD_EUR: {
        isVyper: false,
        slotBalance: 51,
        address: TOKEN_ADDR_SAN_USDC_EUR,
        decimals: 6,
    },

    AG_EUR: {
        isVyper: false,
        slotBalance: 51,
        address: TOKEN_ADDR_AG_EUR,
        decimals: 18,
    },

    ANGLE: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_ANGLE,
        decimals: 18,
    },

    FXN: {
        isVyper: true,
        slotBalance: 6,
        address: TOKEN_ADDR_FXN,
        decimals: 18,
    },

    sd_FXN: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_sdFXN,
        decimals: 18,
    },

    // LP
    TRICRYPTO_USDC: {
        isVyper: true,
        slotBalance: 23,
        address: CRV_TRI_CRYPTO_USDC,
        decimals: 18,
    },

    CRVUSD_USDT: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_USDT_crvUSD,
        decimals: 18,
    },

    STG_USDC: {
        isVyper: true,
        slotBalance: 6,
        address: CRV_DUO_STG_USDC,
        decimals: 18,
    },

    // TricryptoLlama V2
    TRICRYPTO_LLAMA: {
        isVyper: true,
        slotBalance: 23,
        address: CRV_TRI_CRYPTO_LLAMA,
        decimals: 18,
    },

    SDCRV_CRV: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_SDCRV_CRV,
        decimals: 18,
    },

    CRVUSD_USDC: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_USDC_crvUSD,
        decimals: 18,
    },

    FRX_ETH_ETH: {
        isVyper: true,
        slotBalance: 7,
        address: CRV_DUO_frxETH_ETH,
        decimals: 18,
    },
    TRICRYPTO_USDT: {
        isVyper: true,
        slotBalance: 23,
        address: CRV_TRI_CRYPTO_USDT,
        decimals: 18,
    },

    CVXCRV_CRV: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_cvxCRV_CRV,
        decimals: 18,
    },
    SDFXS_FXS: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_SDFXS_FXS,
        decimals: 18,
    },

    AGEUR_EUROC: {
        isVyper: true,
        slotBalance: 24,
        address: CRV_DUO_agEUR_EUROC,
        decimals: 18,
    },
    MIM_3CRV: {
        isVyper: true,
        slotBalance: 15,
        address: CRV_DUO_MIM_3CRV,
        decimals: 18,
    },
    DETH_FRXETH: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_dETH_frxETH,
        decimals: 18,
    },

    FRAX_USDC: {
        isVyper: true,
        slotBalance: 24,
        address: CRV_DUO_FRAXBP,
        decimals: 18,
    },
    ALUSD_FRAX_USDC: {
        isVyper: true,
        slotBalance: 17,
        address: CRV_DUO_alUSD_FRAXBP,
        decimals: 18,
    },
    TRICRYPTO_USDT2: {
        isVyper: true,
        slotBalance: 2,
        address: CRV_TRI_CRYPTO_USDT2,
        decimals: 18,
    },
    RETH_ETH: {
        isVyper: true,
        slotBalance: 2,
        address: CRV_DUO_ETH_rETH,
        decimals: 18,
    },
    CRVUSD_XAI: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_XAI_crvUSD,
        decimals: 18,
    },
    COIL_FRAX_USDC: {
        isVyper: true,
        slotBalance: 6,
        address: CRV_DUO_COIL_FRAXBP,
        decimals: 18,
    },
    CRVUSD_SUSD: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_sUSD_CRVUSD,
        decimals: 18,
    },
    CRVUSD_DOLA: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_DOLA_crvUSD,
        decimals: 18,
    },

    MKUSD_FRAX_USDC: {
        isVyper: true,
        slotBalance: 17,
        address: CRV_DUO_mkUSD_FRAXBP,
        decimals: 18,
    },
    CNC_ETH: {
        isVyper: true,
        slotBalance: 6,
        address: LP_CRV_DUO_ETH_CNC,
        decimals: 18,
    },
    XAI_FRAX_USDC: {
        isVyper: true,
        slotBalance: 17,
        address: CRV_DUO_XAI_FRAXBP,
        decimals: 18,
    },
    CRVUSD_FRXETH_SDT: {
        isVyper: true,
        slotBalance: 23,
        address: CRV_TRI_CRYPTO_SDT,
        decimals: 18,
    },

    TRICRV: {
        isVyper: true,
        slotBalance: 23,
        address: CRV_TRI_CRYPTO_CRV,
        decimals: 18,
    },
    STETH_ETH: {
        isVyper: true,
        slotBalance: 2,
        address: CRV_DUO_stETH_ETH,
        decimals: 18,
    },

    _80_BAL_20_WETH: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_80BAL_20WETH,
        decimals: 18,
    },

    SD_FRAX_3CRV: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_SD_FRAX_3CRV,
        decimals: 18,
    },

    CRVUSD_FRAX: {
        isVyper: true,
        slotBalance: 20,
        address: CRV_DUO_crvUSD_FRAX,
        decimals: 18,
    },

    ETHp_WETH: {
        isVyper: true,
        slotBalance: 6,
        address: CRV_DUO_ETHp_WETH,
        decimals: 18,
    },

    WETH_SDT: {
        isVyper: true,
        slotBalance: 6,
        address: CRV_DUO_WETH_SDT,
        decimals: 18,
    },

    PXETH_STETH: {
        isVyper: true,
        slotBalance: 38,
        address: CRV_DUO_pxETH_stETH,
        decimals: 18,
    },

    PXETH_FRXETH: {
        isVyper: true,
        slotBalance: 38,
        address: CRV_DUO_pxETH_frxETH,
        decimals: 18,
    },
    PYUSD_USDC: {
        isVyper: true,
        slotBalance: 38,
        address: CRV_DUO_PYUSD_USDC,
        decimals: 18,
    },
    sd_YFI: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_sdYFI,
        decimals: 18,
    },
    sd_APW: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_sdAPW,
        decimals: 18,
    },

    CVG_ETH: {
        isVyper: true,
        slotBalance: 22,
        address: CRV_DUO_CVG_ETH,
        decimals: 18,
    },
    cvgSDT_SDT: {
        isVyper: true,
        slotBalance: 38,
        address: CRV_DUO_cvgSDT_SDT,
        decimals: 18,
    },

    // CONVEX
    CVX_CRV: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_CVX_CRV,
        decimals: 18,
    },

    CVX_FXS: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_CVX_FXS,
        decimals: 18,
    },

    CVX_PRISMA: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_CVX_PRISMA,
        decimals: 18,
    },

    CVX_FXN: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_CVX_FXN,
        decimals: 18,
    },

    CVX_FPIS: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_CVX_FPIS,
        decimals: 18,
    },

    //FRAXLP ASSETS
    eUSD: {
        isVyper: false,
        slotBalance: 201,
        address: TOKEN_ADDR_eUSD,
        decimals: 18,
    },

    eUSD_FRAXLP: {
        isVyper: true,
        slotBalance: 17,
        address: TOKEN_ADDR_eUSD_FRAXBP,
        decimals: 18,
    },

    PRISMA: {
        isVyper: false,
        slotBalance: 7,
        address: TOKEN_ADDR_PRISMA,
        decimals: 18,
    },

    FPIS: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_FPIS,
        decimals: 18,
    },

    YFI: {
        isVyper: false,
        slotBalance: 0,
        address: TOKEN_ADDR_YFI,
        decimals: 18,
    },

    APW: {
        isVyper: false,
        slotBalance: 101,
        address: TOKEN_ADDR_APW,
        decimals: 18,
    }
};
