import {ethers} from "hardhat";
import {CVG_CONTRACT} from "../../../../../resources/contracts";
import {IUsers} from "../../../../../utils/contractInterface";
import {THIEF_TOKEN_CONFIG} from "../../../../../utils/thief/thiefConfig";
import {giveTokensToAddresses} from "../../../../../utils/thief/thiefv2";
import {txCheck, getAddress, writeFile, getContract} from "../../../complete/helper";
import {SDT_ASSET_SD_GAUGE_ASSET, LP_ASSET_LP_STRAT_LP_GAUGE} from "../../../complete/protocol/_config";
import {TOKEN_ADDR_FRAX, TOKEN_ADDR_FXS, TOKEN_ADDR_LDO, TOKEN_ADDR_SDT, TOKEN_ADDR_WETH} from "../../../../../resources/tokens/common";
import {FRAXSWAP_ROUTER} from "../../../../../resources/frax";
import {setStorageAt, time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import abiRouterV3 from "../../../../../abis/UniswapRouterV3.json";
import {UNISWAP_V3_ROUTER} from "../../../../../resources/uniswap";
import {CvgSDT} from "../../../../../typechain-types/contracts/Token";

export const getTokens = async (u: IUsers) => {
    console.info("\x1b[33m ************ Get Token process ************ \x1b[0m");

    const testersSmall = [u.owner, u.user1, u.user2];

    const testersBig = [u.owner, u.user1, u.user2, u.user3, u.user4, u.user5, u.user6, u.user7, u.user8, u.user9, u.user10, u.treasuryPdd];
    const amount = 100_000_000;

    const TESTERS = testersBig;
    await txCheck(
        async () => {
            const CVG_ADDRESS = getAddress(CVG_CONTRACT);

            const CVG = {
                name: "Convergence",
                ticker: "CVG",
                decimals: 18,
                slotBalance: 0,
                address: CVG_ADDRESS,
                isVyper: false,
            };

            const tokensToDistribute = {
                CVG,
                DAI: THIEF_TOKEN_CONFIG.DAI,
                FRAX: THIEF_TOKEN_CONFIG.FRAX,
                WETH: THIEF_TOKEN_CONFIG.WETH,
                CVX: THIEF_TOKEN_CONFIG.CVX,
                CNC: THIEF_TOKEN_CONFIG.CNC,
                SDT: THIEF_TOKEN_CONFIG.SDT,
                FRAXBP: THIEF_TOKEN_CONFIG.FRAXBP,
                USDC: THIEF_TOKEN_CONFIG.USDC,
                USDT: THIEF_TOKEN_CONFIG.USDT,
                FXS: THIEF_TOKEN_CONFIG.FXS,
                CRVUSD: THIEF_TOKEN_CONFIG.CRVUSD,

                SD_CRV: THIEF_TOKEN_CONFIG.sd_CRV,
                SD_BAL: THIEF_TOKEN_CONFIG.sd_BAL,
                SD_ANGLE: THIEF_TOKEN_CONFIG.sd_ANGLE,
                SD_PENDLE: THIEF_TOKEN_CONFIG.sd_PENDLE,
                SD_FXS: THIEF_TOKEN_CONFIG.sd_FXS,
                SD_FXN: THIEF_TOKEN_CONFIG.sd_FXN,

                CRV: THIEF_TOKEN_CONFIG.CRV,
                BAL: THIEF_TOKEN_CONFIG.BAL,
                ANGLE: THIEF_TOKEN_CONFIG.ANGLE,
                PENDLE: THIEF_TOKEN_CONFIG.PENDLE,
                FXN: THIEF_TOKEN_CONFIG.FXN,

                _3CRV: THIEF_TOKEN_CONFIG._3CRV,

                _80BAL_20WETH: THIEF_TOKEN_CONFIG._80_BAL_20_WETH,

                BB_A_USD: THIEF_TOKEN_CONFIG.BB_A_USD,

                AG_EUR: THIEF_TOKEN_CONFIG.AG_EUR,
                SAN_USD_EUR: THIEF_TOKEN_CONFIG.SAN_USD_EUR,

                TRICRYPTOLLAMA: THIEF_TOKEN_CONFIG.TRICRYPTO_LLAMA,
                TRICRYPTO_USDC: THIEF_TOKEN_CONFIG.TRICRYPTO_USDC,
                TRICRYPTO_USDT: THIEF_TOKEN_CONFIG.TRICRYPTO_USDT,
                TRICRYPTO_USDT2: THIEF_TOKEN_CONFIG.TRICRYPTO_USDT2,

                CRVUSD_USDT: THIEF_TOKEN_CONFIG.CRVUSD_USDT,
                STG_USDC: THIEF_TOKEN_CONFIG.STG_USDC,

                SDCRV_CRV: THIEF_TOKEN_CONFIG.SDCRV_CRV,
                CRVUSD_USDC: THIEF_TOKEN_CONFIG.CRVUSD_USDC,
                FRX_ETH_ETH: THIEF_TOKEN_CONFIG.FRX_ETH_ETH,

                AGEUR_EUROC: THIEF_TOKEN_CONFIG.AGEUR_EUROC,

                MIM_3CRV: THIEF_TOKEN_CONFIG.MIM_3CRV,
                DETH_FRXETH: THIEF_TOKEN_CONFIG.DETH_FRXETH,
                CVXCRV_CRV: THIEF_TOKEN_CONFIG.CVXCRV_CRV,
                SDFXS_FXS: THIEF_TOKEN_CONFIG.SDFXS_FXS,

                FRAX_USDC: THIEF_TOKEN_CONFIG.FRAX_USDC,
                ALUSD_FRAX_USDC: THIEF_TOKEN_CONFIG.ALUSD_FRAX_USDC,

                RETH_ETH: THIEF_TOKEN_CONFIG.RETH_ETH,
                CRVUSD_XAI: THIEF_TOKEN_CONFIG.CRVUSD_XAI,
                COIL_FRAX_USDC: THIEF_TOKEN_CONFIG.COIL_FRAX_USDC,

                CRVUSD_SUSD: THIEF_TOKEN_CONFIG.CRVUSD_SUSD,
                CRVUSD_DOLA: THIEF_TOKEN_CONFIG.CRVUSD_DOLA,

                MKUSD_FRAX_USDC: THIEF_TOKEN_CONFIG.MKUSD_FRAX_USDC,
                CNC_ETH: THIEF_TOKEN_CONFIG.CNC_ETH,
                XAI_FRAX_USDC: THIEF_TOKEN_CONFIG.XAI_FRAX_USDC,

                CRVUSD_FRXETH_SDT: THIEF_TOKEN_CONFIG.CRVUSD_FRXETH_SDT,
                STETH_ETH: THIEF_TOKEN_CONFIG.STETH_ETH,

                TRICRV: THIEF_TOKEN_CONFIG.TRICRV,

                SETH_ETH: THIEF_TOKEN_CONFIG.STETH_ETH,
                SD_FRAX_3CRV: THIEF_TOKEN_CONFIG.SD_FRAX_3CRV,
                WST_ETH: THIEF_TOKEN_CONFIG.wstETH,
                FIS: THIEF_TOKEN_CONFIG.FIS,
                SPELL: THIEF_TOKEN_CONFIG.SPELL,
                CRVUSD_FRAX: THIEF_TOKEN_CONFIG.CRVUSD_FRAX,
                ETHp_WETH: THIEF_TOKEN_CONFIG.ETHp_WETH,
                WETH_SDT: THIEF_TOKEN_CONFIG.WETH_SDT,
                PXETH_STETH: THIEF_TOKEN_CONFIG.PXETH_STETH,
                PXETH_FRXETH: THIEF_TOKEN_CONFIG.PXETH_FRXETH,
                PYUSD_USDC: THIEF_TOKEN_CONFIG.PYUSD_USDC,
            };

            //remove trackingVotes on FXS
            await setStorageAt(THIEF_TOKEN_CONFIG.FXS.address, 11, 0);

            // Preparation of tokens

            const distribution = [];
            let tokenContracts: {[key: string]: string} = {};

            for (const [tokenName, token] of Object.entries(tokensToDistribute)) {
                distribution.push({
                    token: token,
                    amount: ethers.parseUnits(amount.toString(), token.decimals),
                });
                if (token.address !== CVG_ADDRESS) {
                    tokenContracts[tokenName] = token.address;
                }
            }

            await giveTokensToAddresses(TESTERS, distribution);

            for (const [tokenName, token] of Object.entries(tokensToDistribute)) {
                const contract = await ethers.getContractAt("ERC20", token.address);
                const balance = await contract.balanceOf(u.owner);
                console.info(tokenName + " " + ethers.formatUnits(balance, await contract.decimals()));
            }

            writeFile("tokenContracts", tokenContracts, null, null);
        },
        "SET_STORAGE_TOKENS",
        null,
        false,
        true
    );

    await txCheck(
        async () => {
            const sdt = await ethers.getContractAt("ERC20", TOKEN_ADDR_SDT);
            const cvgSdt = await getContract<CvgSDT>("CvgSDT");
            await sdt.approve(cvgSdt, ethers.parseEther("100000"));
            await cvgSdt.mint(u.owner, ethers.parseEther("100000"));
        },
        "GET_CVG_SDT_ON_OWNER",
        null,
        false,
        true
    );
};
