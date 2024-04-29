import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers, network} from "hardhat";
import {Signer} from "ethers";
import {deployOracleFixture} from "../../fixtures/stake-dao";
import {CvgOracle} from "../../../typechain-types";

import {
    TOKEN_ADDR_FRAX,
    TOKEN_ADDR_RSR,
    TOKEN_ADDR_STG,
    TOKEN_ADDR_tBTC,
    TOKEN_ADDR_USDC,
    TOKEN_ADDR_wstETH,
    TOKEN_ADDR_WETH,
    TOKEN_ADDR_CRV,
    TOKEN_ADDR_CVX,
    TOKEN_ADDR_SDT,
    TOKEN_ADDR_CNC,
    TOKEN_ADDR_TOKEMAK,
} from "../../../resources/tokens/common";
import {CRV_DUO_RSR_FRAX_BP, LP_CRV_DUO_STG_USDC} from "../../../resources/lp";

import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ApiHelper} from "../../../utils/ApiHelper";
import {manipulateCurveDuoLp} from "../../../utils/swapper/curve-duo-manipulator";

describe("CvgOracle : Curve Duo", () => {
    const CURVE_NORMAL = 2;
    let treasuryDao: Signer, owner: Signer;

    let cvgOracle: CvgOracle;
    let prices: any;

    const DELTA_MAX = 250; // 2.5%
    const DELTA_MAX_FLOAT = 0.2;

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

    it("Success Verifiying the price of the STG token", async () => {
        await cvgOracle.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_STG, CURVE_NORMAL);
        await cvgOracle.connect(treasuryDao).setCurveDuoParams(TOKEN_ADDR_STG, {
            poolAddress: LP_CRV_DUO_STG_USDC,
            isReversed: true,
            isEthPriceRelated: false,
            deltaLimitOracle: DELTA_MAX,
            maxLastUpdate: 864000000,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDC],
        });

        const stgPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_STG)));
        const expectedPrice = prices[TOKEN_ADDR_STG].price;

        expect(stgPrice).to.be.approximately(expectedPrice, expectedPrice * DELTA_MAX_FLOAT);
        const poolAddress = await cvgOracle.getPoolAddressByToken(TOKEN_ADDR_STG);
        expect(poolAddress).to.be.equal(LP_CRV_DUO_STG_USDC);
    });

    it("Success : Get price of the RSR token", async () => {
        await cvgOracle.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_RSR, CURVE_NORMAL);
        await cvgOracle.connect(treasuryDao).setCurveDuoParams(TOKEN_ADDR_RSR, {
            poolAddress: CRV_DUO_RSR_FRAX_BP,
            isReversed: true,
            isEthPriceRelated: false,
            deltaLimitOracle: DELTA_MAX,
            maxLastUpdate: 864000000,
            minPrice: "1",
            maxPrice: ethers.parseEther("10000000000"),
            stablesToCheck: [TOKEN_ADDR_USDC, TOKEN_ADDR_FRAX],
        });

        const rsrPrice = Number(ethers.formatEther(await cvgOracle.getPriceVerified(TOKEN_ADDR_RSR)));
        const expectedPrice = prices[TOKEN_ADDR_RSR].price;

        expect(rsrPrice).to.be.approximately(expectedPrice, expectedPrice * DELTA_MAX_FLOAT);
    });

    it("Success : Dump the price of RSR", async () => {
        const actions = [{type: "swap", direction: [1, 0], amountIn: 200_000}];
        await manipulateCurveDuoLp(CRV_DUO_RSR_FRAX_BP, actions, owner);
    });

    it("Fails : Delta triggered on RSR", async () => {
        await expect(cvgOracle.getPriceVerified(TOKEN_ADDR_RSR)).to.be.revertedWith("EXECUTION_LIMIT_DEPEG");
    });

    it("Success : Reequilibration of price_oracle", async () => {
        await time.increase(864000000);
    });

    it("Fail : Price is now stale after going forward in time", async () => {
        await expect(cvgOracle.getPriceVerified(TOKEN_ADDR_RSR)).to.be.revertedWith("STALE_PRICE");
    });

    it("Success : Verify the price of RSR after reequilibration", async () => {
        const actions = [{type: "swap", direction: [1, 0], amountIn: 1}];
        await manipulateCurveDuoLp(CRV_DUO_RSR_FRAX_BP, actions, owner);
        await time.increase(86400);
    });
    it.skip("Success : Reequilibration of price_oracle", async () => {
        await cvgOracle.getPriceVerified(TOKEN_ADDR_RSR);
    });

    // it("Fail : Reequilibration of price_oracle", async () => {
    //     await time.increase(100000000);
    //     await expect(cvgOracle.getPriceVerified(TOKEN_ADDR_RSR)).to.be.revertedWith("STABLES_NOT_VERIFIED");
    // });
});
