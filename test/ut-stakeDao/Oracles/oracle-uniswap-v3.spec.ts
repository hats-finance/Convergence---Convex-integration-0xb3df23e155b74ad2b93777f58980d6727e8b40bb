import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {Signer} from "ethers";
import {deployOracleFixture} from "../../fixtures/stake-dao";
import {CvgOracle} from "../../../typechain-types";
import {ApiHelper} from "../../../utils/ApiHelper";
import {TOKEN_ADDR_LINK, TOKEN_ADDR_USDC, TOKEN_ADDR_USDT, TOKEN_ADDR_WBTC, TOKEN_ADDR_WETH} from "../../../resources/tokens/common";
import {UNIV3_LINK_ETH, UNIV3_USDC_ETH, UNIV3_WBTC_ETH, UNIV3_WBTC_USDT} from "../../../resources/lp";
import {CHAINLINK_BTC_USD, CHAINLINK_ETH_USD, CHAINLINK_LINK_USD, CHAINLINK_USDC_USD} from "../../../resources/aggregators";
import {manipulateUniV3Lp} from "../../../utils/swapper/univ3-manipulator";
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CvgOracle : Uniswap V3", () => {
    const UNI_V3 = 4;

    const DELTA_MAX_FLOAT = 0.04;

    let treasuryDao: Signer, owner: Signer;

    let cvgOracle: CvgOracle;
    let prices: any;

    before(async () => {
        const {contracts, users} = await loadFixture(deployOracleFixture);

        prices = await ApiHelper.getDefiLlamaTokenPrices([TOKEN_ADDR_WETH, TOKEN_ADDR_WBTC, TOKEN_ADDR_LINK]);
        treasuryDao = users.treasuryDao;
        owner = users.owner;

        cvgOracle = contracts.bonds.cvgOracle;
    });

    it("Success : Setting up the price feed of WETH with UniswapV3 ", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV3_USDC_ETH,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            twap: 30,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });
    });

    it("Success : Compute price of WBTC/ETH with UNIV3", async () => {
        await cvgOracle.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_WBTC, UNI_V3);

        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WBTC, {
            poolAddress: UNIV3_WBTC_ETH,
            isReversed: false,
            isEthPriceRelated: true,
            aggregatorOracle: CHAINLINK_BTC_USD,
            deltaLimitOracle: 250,
            twap: 30,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [],
        });

        const wBTCPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_WBTC)));
        const expectedWBTC = prices[TOKEN_ADDR_WBTC].price;
        expect(wBTCPrice).to.be.approximately(expectedWBTC, expectedWBTC * DELTA_MAX_FLOAT);
    });

    it("Success : Compute price of WBTC/USDT with UNIV3", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WBTC, {
            poolAddress: UNIV3_WBTC_USDT,
            isReversed: false,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_BTC_USD,
            deltaLimitOracle: 250,
            twap: 30,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDT],
        });

        const wBTCPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_WBTC)));
        const expectedWBTC = prices[TOKEN_ADDR_WBTC].price;
        expect(wBTCPrice).to.be.approximately(expectedWBTC, expectedWBTC * DELTA_MAX_FLOAT);
    });

    it("Success : Compute price of LINK/ETH with UNIV3", async () => {
        await cvgOracle.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_LINK, UNI_V3);

        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_LINK, {
            poolAddress: UNIV3_LINK_ETH,
            isReversed: false,
            isEthPriceRelated: true,
            aggregatorOracle: CHAINLINK_LINK_USD,
            deltaLimitOracle: 250,
            twap: 30,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [],
        });

        const linkPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_LINK)));
        const expectedLinkPrice = prices[TOKEN_ADDR_LINK].price;
        expect(linkPrice).to.be.approximately(expectedLinkPrice, expectedLinkPrice * DELTA_MAX_FLOAT);
    });

    it("Success : Update LINK maxPrice to prevent swap under a certain value", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_LINK, {
            poolAddress: UNIV3_LINK_ETH,
            isReversed: false,
            isEthPriceRelated: true,
            aggregatorOracle: CHAINLINK_LINK_USD,
            deltaLimitOracle: 250,
            twap: 30,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("1"),
            stablesToCheck: [],
        });
    });

    it("Fail: Fails, execution price is too high compare to the maxPrice setup", async () => {
        await expect(cvgOracle.getPriceVerified(TOKEN_ADDR_LINK)).to.be.revertedWith("USD_OUT_OF_RANGE");
    });

    it("Success : Update ETH params to fail", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV3_USDC_ETH,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            twap: 30,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("1"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });
    });

    it("Fail: Fails, verification of ETH failed on USD price", async () => {
        await expect(cvgOracle.getPriceVerified(TOKEN_ADDR_LINK)).to.be.revertedWith("ETH_PRICE_NOT_VERIFIED");
    });

    it("Success : Buy some LINK with 3000 ETH to pump the LINK price", async () => {
        await manipulateUniV3Lp(UNIV3_LINK_ETH, [{type: "swap", direction: 0, amountIn: 5000}], owner);
        // Wait for the TWAP
        await time.increase(30);
    });

    it("Fail: Fails, execution price is too high compare to Aggregator price", async () => {
        await expect(cvgOracle.getPriceVerified(TOKEN_ADDR_LINK)).to.be.revertedWith("EXECUTION_LIMIT_DEPEG");
    });

    it("Success : Update ETH params to dont fail", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV3_USDC_ETH,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            twap: 30,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("1000000"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });
    });

    it("Success : Make the USDC price fetching fails with very low max USD value", async () => {
        await cvgOracle.connect(treasuryDao).setStableParams(TOKEN_ADDR_USDC, {
            aggregatorOracle: CHAINLINK_USDC_USD,
            deltaLimitOracle: 50,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: 1,
        });
    });

    it("Fail: Fails, execution price is too high compare to Aggregator price", async () => {
        await expect(cvgOracle.getPriceVerified(TOKEN_ADDR_WETH)).to.be.revertedWith("STABLE_NOT_VERIFIED");
    });

    it("Success : Update ETH params to fail on stale price", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV3_USDC_ETH,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            twap: 30,
            maxLastUpdate: 1,
            minPrice: "1",
            maxPrice: ethers.parseEther("1000000"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });
    });

    it("Fail: Fails, execution price is too high compare to Aggregator price", async () => {
        await expect(cvgOracle.getPriceVerified(TOKEN_ADDR_WETH)).to.be.revertedWith("STALE_PRICE");
    });
});
