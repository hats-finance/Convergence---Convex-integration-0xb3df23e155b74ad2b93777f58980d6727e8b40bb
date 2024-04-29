import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {Signer} from "ethers";
import {deployOracleFixture} from "../../fixtures/stake-dao";
import {CvgOracle} from "../../../typechain-types";
import {ApiHelper} from "../../../utils/ApiHelper";
import {
    TOKEN_ADDR_CVX,
    TOKEN_ADDR_STG,
    TOKEN_ADDR_USDC,
    TOKEN_ADDR_USDT,
    TOKEN_ADDR_WETH,
    TOKEN_ADDR_crvUSD,
    TOKEN_ADDR_wstETH,
} from "../../../resources/tokens/common";
import {
    CRV_TRI_CRYPTO_LLAMA,
    LP_CRV_DUO_STG_USDC,
    UNIV2_BTC_USDC,
    UNIV2_ETH_USDT,
    UNIV2_USDC_ETH,
    UNIV3_LINK_ETH,
    UNIV3_USDC_ETH,
    UNIV3_WBTC_ETH,
    UNIV3_WBTC_USDT,
} from "../../../resources/lp";
import {CHAINLINK_BTC_USD, CHAINLINK_ETH_USD, CHAINLINK_LINK_USD} from "../../../resources/aggregators";

describe("Coverage Oracle", () => {
    let treasuryDao: Signer;

    let cvgOracle: CvgOracle;

    before(async () => {
        const {contracts, users} = await loadFixture(deployOracleFixture);

        treasuryDao = users.treasuryDao;

        cvgOracle = contracts.bonds.cvgOracle;
    });
    it("Fail : Setting cvg random user", async () => {
        await cvgOracle.setCvg(TOKEN_ADDR_USDC).should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Fail : Setting up the price with random user", async () => {
        await cvgOracle
            .setUniV3Params(TOKEN_ADDR_WETH, {
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
            })
            .should.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Success : Setting up the price feed of WETH with twapOrk 0 and deltaLimit to 0", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV3_USDC_ETH,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 0,
            twap: 0,
            maxLastUpdate: 800_600_400,
            minPrice: "0",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });
    });
    it("Fail: getAndVerifyOracle with delta limit too high", async () => {
        await cvgOracle.getPriceVerified(TOKEN_ADDR_WETH).should.be.revertedWith("EXECUTION_LIMIT_DEPEG");
    });

    it("Success: getEthPriceOracleUnverified", async () => {
        await cvgOracle.getPriceUnverified(TOKEN_ADDR_WETH);
    });
    it("Success : Setting up the price feed of WETH with twapOrk 0 and deltaLimit to 250", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV3_USDC_ETH,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            twap: 0,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });
    });

    it("Success : Setting up the price feed of USDC with params of WETH token", async () => {
        await cvgOracle.connect(treasuryDao).setStableParams(TOKEN_ADDR_USDC, {
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
        });
        const poolAddress = await cvgOracle.getPoolAddressByToken(TOKEN_ADDR_USDC);
        expect(poolAddress).to.be.equal(ethers.ZeroAddress);
    });
    it("Fail: getAndVerifyOracle with stables not verified due to wrong stable parameters", async () => {
        await cvgOracle.getPriceVerified(TOKEN_ADDR_WETH).should.be.revertedWith("STABLE_NOT_VERIFIED");
    });
    it("Success : Setting up the price feed of WETH with maxLastUpdate 0", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV3_USDC_ETH,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            twap: 30,
            maxLastUpdate: 0,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });
    });
    it("Fail: getAndVerifyOracle with stables not verified due to wrong stable parameters", async () => {
        await cvgOracle.getPriceVerified(TOKEN_ADDR_CVX).should.be.revertedWith("ETH_PRICE_NOT_VERIFIED");
    });
    it("Success : Setting up the price feed of WETH with limit max price equals to limit min price", async () => {
        await cvgOracle.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_WETH, {
            poolAddress: UNIV3_USDC_ETH,
            isReversed: true,
            isEthPriceRelated: false,
            aggregatorOracle: CHAINLINK_ETH_USD,
            deltaLimitOracle: 250,
            twap: 0,
            maxLastUpdate: 800_600_400,
            minPrice: "1",
            maxPrice: "1",
            stablesToCheck: [],
        });
        const poolAddress = await cvgOracle.getPoolAddressByToken(TOKEN_ADDR_WETH);
        expect(poolAddress).to.be.equal(UNIV3_USDC_ETH);
    });
    it("Fail: getAndVerifyOracle with delta limit too high", async () => {
        await cvgOracle.getPriceVerified(TOKEN_ADDR_WETH).should.be.revertedWith("USD_OUT_OF_RANGE");
    });
    it("Fail : Setting setStableParams with random user", async () => {
        await cvgOracle
            .setStableParams(TOKEN_ADDR_USDC, {
                aggregatorOracle: CHAINLINK_ETH_USD,
                deltaLimitOracle: 250,
                maxLastUpdate: 800_600_400,
                minPrice: "1",
                maxPrice: ethers.parseEther("10000000000"),
            })
            .should.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Fail : Setting up the price with random user", async () => {
        await cvgOracle.setPoolTypeForToken(TOKEN_ADDR_STG, 2).should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Fail : setCurveDuoParams with random user", async () => {
        await cvgOracle
            .setCurveDuoParams(TOKEN_ADDR_STG, {
                poolAddress: LP_CRV_DUO_STG_USDC,
                isReversed: true,
                isEthPriceRelated: false,
                deltaLimitOracle: 100000,
                maxLastUpdate: 864000000,
                minPrice: "1",
                maxPrice: ethers.parseEther("10000000000"),
                stablesToCheck: [TOKEN_ADDR_USDC],
            })
            .should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Fail : setCurveTriParams with random user", async () => {
        await cvgOracle
            .setCurveTriParams(TOKEN_ADDR_wstETH, {
                poolAddress: CRV_TRI_CRYPTO_LLAMA,
                isReversed: false,
                isEthPriceRelated: false,
                deltaLimitOracle: 100000,
                k: 1,
                maxLastUpdate: 864000000,
                minPrice: "1",
                maxPrice: ethers.parseEther("10000000000"),
                stablesToCheck: [TOKEN_ADDR_crvUSD],
            })
            .should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Fail : setUniV2Params with random user", async () => {
        await cvgOracle
            .setUniV2Params(TOKEN_ADDR_WETH, {
                poolAddress: UNIV2_ETH_USDT,
                isReversed: true,
                isEthPriceRelated: false,
                aggregatorOracle: CHAINLINK_ETH_USD,
                deltaLimitOracle: 250,
                maxLastUpdate: 800_600_400,
                minPrice: "1",
                maxPrice: ethers.parseEther("10000000000"),
                stablesToCheck: [TOKEN_ADDR_USDT],
            })
            .should.be.revertedWith("Ownable: caller is not the owner");
    });
});
