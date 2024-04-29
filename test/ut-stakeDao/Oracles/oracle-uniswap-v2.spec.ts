import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {Signer} from "ethers";
import {deployOracleFixture} from "../../fixtures/stake-dao";
import {CvgOracle} from "../../../typechain-types";
import {ApiHelper} from "../../../utils/ApiHelper";
import {TOKEN_ADDR_FRAX, TOKEN_ADDR_FXS, TOKEN_ADDR_USDC, TOKEN_ADDR_USDT, TOKEN_ADDR_WBTC, TOKEN_ADDR_WETH} from "../../../resources/tokens/common";
import {UNIV2_BTC_USDC, UNIV2_ETH_USDT, UNIV2_FXS_FRAX, UNIV2_USDC_ETH} from "../../../resources/lp";
import {CHAINLINK_BTC_USD, CHAINLINK_ETH_USD, CHAINLINK_FXS_USD} from "../../../resources/aggregators";

describe("CvgOracle : Uniswap V2", () => {
    const UNI_V2 = 5;

    const DELTA_MAX_FLOAT = 0.04;

    let treasuryDao: Signer;

    let cvgOracle: CvgOracle;
    let prices: any;

    before(async () => {
        const {contracts, users} = await loadFixture(deployOracleFixture);

        prices = await ApiHelper.getDefiLlamaTokenPrices([TOKEN_ADDR_WETH, TOKEN_ADDR_FXS, TOKEN_ADDR_WBTC]);
        treasuryDao = users.treasuryDao;

        cvgOracle = contracts.bonds.cvgOracle;
    });

    it("Success : Compute price of WBTC/USDC with UNIV2", async () => {
        await cvgOracle.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_WBTC, UNI_V2);

        await cvgOracle.connect(treasuryDao).setUniV2Params(TOKEN_ADDR_WBTC, {
            poolAddress: UNIV2_BTC_USDC,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_BTC_USD,
            deltaLimitOracle: 250,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });

        const wBTCPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_WBTC)));
        const expectedPricWBTC = prices[TOKEN_ADDR_WBTC].price;
        expect(wBTCPrice).to.be.approximately(expectedPricWBTC, expectedPricWBTC * DELTA_MAX_FLOAT);
        const poolAddress = await cvgOracle.getPoolAddressByToken(TOKEN_ADDR_WBTC);
        expect(poolAddress).to.be.equal(UNIV2_BTC_USDC);
    });

    it("Success : Compute price of ETH/USDT with UNIV2", async () => {
        await cvgOracle.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_WETH, UNI_V2);

        await cvgOracle.connect(treasuryDao).setUniV2Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV2_ETH_USDT,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDT],
        });

        const ethPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_WETH)));
        const expectedETH = prices[TOKEN_ADDR_WETH].price;
        expect(ethPrice).to.be.approximately(expectedETH, expectedETH * DELTA_MAX_FLOAT);
    });

    it("Success : Compute price of USDC/ETH with UNIV2", async () => {
        await cvgOracle.connect(treasuryDao).setUniV2Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV2_USDC_ETH,
            isReversed: false,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });

        const ethPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_WETH)));
        const expectedETH = prices[TOKEN_ADDR_WETH].price;
        expect(ethPrice).to.be.approximately(expectedETH, expectedETH * DELTA_MAX_FLOAT);
    });

    it("Success : Compute price of FRAX/FXS with UNIV2", async () => {
        await (
            await cvgOracle.connect(treasuryDao).setUniV2Params(TOKEN_ADDR_FXS, {
                poolAddress: UNIV2_FXS_FRAX,
                isReversed: true,
                isEthPriceRelated: false,
                aggregatorOracle: CHAINLINK_FXS_USD,
                deltaLimitOracle: 250,
                maxLastUpdate: 800_600_400,
                minPrice: "1",
                maxPrice: ethers.parseEther("10000000000"),
                stablesToCheck: [TOKEN_ADDR_FRAX],
            })
        ).wait();

        const fxsPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_FXS)));
        const expectedFxs = prices[TOKEN_ADDR_FXS].price;
        expect(fxsPrice).to.be.approximately(expectedFxs, expectedFxs * DELTA_MAX_FLOAT);
    });
});
