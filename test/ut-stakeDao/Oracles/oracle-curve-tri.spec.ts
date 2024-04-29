import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {Signer} from "ethers";
import {deployOracleFixture} from "../../fixtures/stake-dao";
import {CvgOracle} from "../../../typechain-types";

import {
    TOKEN_ADDR_crvUSD,
    TOKEN_ADDR_RSR,
    TOKEN_ADDR_STG,
    TOKEN_ADDR_tBTC,
    TOKEN_ADDR_wstETH,
    TOKEN_ADDR_WETH,
    TOKEN_ADDR_CRV,
    TOKEN_ADDR_CVX,
    TOKEN_ADDR_SDT,
    TOKEN_ADDR_CNC,
    TOKEN_ADDR_TOKEMAK,
} from "../../../resources/tokens/common";
import {CRV_TRI_CRYPTO_LLAMA} from "../../../resources/lp";

import {ApiHelper} from "../../../utils/ApiHelper";

describe("CvgOracle : Curve Tri", () => {
    const CURVE_TRIPOOL = 3;
    let treasuryDao: Signer, owner: Signer;

    let cvgOracle: CvgOracle;
    let prices: any;

    const DELTA_MAX = 250; // 2.5%
    const DELTA_MAX_FLOAT = 0.08;

    before(async () => {
        const {contracts, users} = await loadFixture(deployOracleFixture);

        prices = await ApiHelper.getDefiLlamaTokenPrices([
            TOKEN_ADDR_WETH,
            TOKEN_ADDR_CRV,
            TOKEN_ADDR_CVX,
            TOKEN_ADDR_SDT,
            TOKEN_ADDR_CNC,
            TOKEN_ADDR_TOKEMAK,
            TOKEN_ADDR_RSR,
            TOKEN_ADDR_tBTC,
            TOKEN_ADDR_STG,
            TOKEN_ADDR_wstETH,
        ]);
        treasuryDao = users.treasuryDao;
        owner = users.owner;
        cvgOracle = contracts.bonds.cvgOracle;
    });

    it("Success Verifiying the price of the wstETH & tBTC token", async () => {
        await cvgOracle.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_wstETH, CURVE_TRIPOOL);
        await cvgOracle.connect(treasuryDao).setCurveTriParams(TOKEN_ADDR_wstETH, {
            poolAddress: CRV_TRI_CRYPTO_LLAMA,
            isReversed: false,
            isEthPriceRelated: false,
            deltaLimitOracle: DELTA_MAX,
            k: 1,
            maxLastUpdate: 864000000,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_crvUSD],
        });

        await cvgOracle.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_tBTC, CURVE_TRIPOOL);
        await cvgOracle.connect(treasuryDao).setCurveTriParams(TOKEN_ADDR_tBTC, {
            poolAddress: CRV_TRI_CRYPTO_LLAMA,
            isReversed: false,
            isEthPriceRelated: false,
            deltaLimitOracle: DELTA_MAX,
            k: 0,
            maxLastUpdate: 864000000,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_crvUSD],
        });

        const wstETHPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_wstETH)));
        const expectedPriceWsETH = prices[TOKEN_ADDR_wstETH].price;
        expect(wstETHPrice).to.be.approximately(expectedPriceWsETH, expectedPriceWsETH * DELTA_MAX_FLOAT);

        const tBTCPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_tBTC)));
        const expectedPriceTBtc = prices[TOKEN_ADDR_tBTC].price;
        expect(tBTCPrice).to.be.approximately(expectedPriceTBtc, expectedPriceTBtc * DELTA_MAX_FLOAT);

        const poolAddress = await cvgOracle.getPoolAddressByToken(TOKEN_ADDR_wstETH);
        expect(poolAddress).to.be.equal(CRV_TRI_CRYPTO_LLAMA);
    });
});
