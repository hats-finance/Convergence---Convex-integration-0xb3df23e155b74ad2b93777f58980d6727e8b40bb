import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";
import {Signer} from "ethers";

import {CvgControlTower, CvgRewards, CvgRewardsV2, ProxyAdmin} from "../../../typechain-types";
import {IUsers, IContractsUserMainnet} from "../../../utils/contractInterface";
import {fetchMainnetContracts} from "../../fixtures/stake-dao";

import {GaugeController} from "../../../typechain-types-vyper";
import {CvgOracle as CvgOracleUpgradeable} from "../../../typechain-types/contracts/Bond/CvgOracleUpgradeable.sol/CvgOracle";
import {deployProxy} from "../../../utils/global/deployProxy";
import {oracleCurveDuoParamsV2, oracleCurveTriParams, oracleStableParams, oracleUniV2Params} from "../../../resources/oracle-config-prod";
import {Cvg} from "../../../typechain-types";
import {CvgOracle} from "../../../typechain-types";
import {
    TOKEN_ADDR_ANGLE,
    TOKEN_ADDR_BAL,
    TOKEN_ADDR_CNC,
    TOKEN_ADDR_CRV,
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
    TOKEN_ADDR_crvUSD,
    TOKEN_ADDR_wstETH,
} from "../../../resources/tokens/common";
import {TOKEN_ADDR_3CRV} from "../../../resources/lp";

chai.use(chaiAsPromised).should();
const expect = chai.expect;

describe("CvgOracleUpgradeable - Test migration", () => {
    let treasuryDao: Signer;
    let controlTowerContract: CvgControlTower;

    let proxyAdmin: ProxyAdmin;
    let cvgRewards: CvgRewards;
    let gaugeController: GaugeController;

    let cvgRewardsV2: CvgRewardsV2;
    let baseTestContract: any;
    let contractsUsers: IContractsUserMainnet, users: IUsers;
    let cvgOracleUpgradeable: CvgOracleUpgradeable;
    let cvgOracle: CvgOracle;
    let cvgContract: Cvg;

    before(async () => {
        contractsUsers = await loadFixture(fetchMainnetContracts);
        users = contractsUsers.users;

        baseTestContract = await ethers.deployContract("BaseTest", []);
        await baseTestContract.waitForDeployment();

        treasuryDao = users.treasuryDao;
        proxyAdmin = contractsUsers.base.proxyAdmin;
        controlTowerContract = contractsUsers.base.cvgControlTower;
        cvgContract = contractsUsers.cvg;
        cvgRewards = contractsUsers.rewards.cvgRewards;
        gaugeController = contractsUsers.locking.gaugeController;
        cvgOracle = contractsUsers.cvgOracle;
        cvgOracleUpgradeable = await deployProxy<CvgOracleUpgradeable>("", [], "CvgOracleUpgradeable", proxyAdmin);

        for (const param of oracleStableParams) {
            await cvgOracleUpgradeable.setPoolTypeForToken(param.token, 1);
            await cvgOracleUpgradeable.setStableParams(param.token, param.oracleParams);
        }

        for (const param of oracleCurveTriParams) {
            await cvgOracleUpgradeable.setPoolTypeForToken(param.token, 3);
            await cvgOracleUpgradeable.setCurveTriParams(param.token, param.oracleParams);
        }

        for (const param of oracleUniV2Params) {
            await cvgOracleUpgradeable.setPoolTypeForToken(param.token, 5);
            await cvgOracleUpgradeable.setUniV2Params(param.token, param.oracleParams);
        }
        //
        for (const param of oracleCurveDuoParamsV2) {
            await cvgOracleUpgradeable.setPoolTypeForToken(param.token, 2);
            await cvgOracleUpgradeable.setCurveDuoParams(param.token, param.oracleParams);
        }
    });
    // it("Success :  compare stable prices with old CvgOracle", async () => {
    //     console.log(await cvgOracleUpgradeable.getPriceVerified(TOKEN_ADDR_WETH));
    //     console.log(await cvgOracleUpgradeable.getPriceVerified(cvgContract));
    // });

    it("Success :  compare stable prices with old CvgOracle", async () => {
        const daiPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_DAI);
        const daiPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_DAI);
        const fraxPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_FRAX);
        const fraxPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_FRAX);
        const usdcPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_USDC);
        const usdcPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_USDC);
        const crvUSDPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_crvUSD);
        const crvUSDPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_crvUSD);
        const usdtPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_USDT);
        const usdtPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_USDT);
        const _3crvPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_3CRV);
        const _3crvPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_3CRV);
        expect(daiPriceOld).to.be.equal(daiPriceNew);
        expect(fraxPriceNew).to.be.equal(fraxPriceOld);
        expect(usdcPriceOld).to.be.equal(usdcPriceNew);
        expect(crvUSDPriceOld).to.be.equal(crvUSDPriceNew);
        expect(usdtPriceOld).to.be.equal(usdtPriceNew);
        expect(_3crvPriceOld).to.be.equal(_3crvPriceNew);
    });
    it("Success :  compare curveTri prices with old CvgOracle", async () => {
        const crvPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_CRV);
        const crvPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_CRV);
        const wethPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_WETH);
        const wethPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_WETH);
        const sdtPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_SDT);
        const sdtPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_SDT);
        const wstETHPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_wstETH);
        const wstETHPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_wstETH);
        expect(crvPriceOld).to.be.equal(crvPriceNew);
        expect(wethPriceNew).to.be.equal(wethPriceOld);
        expect(sdtPriceOld).to.be.equal(sdtPriceNew);
        expect(wstETHPriceOld).to.be.equal(wstETHPriceNew);
    });

    it("Success :  compare curveDuo prices with old CvgOracle", async () => {
        const cvxPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_CVX);
        const cvxPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_CVX);
        const fxnPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_FXN);
        const fxnPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_FXN);
        const cncPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_CNC);
        const cncPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_CNC);
        expect(cvxPriceOld).to.be.equal(cvxPriceNew);
        expect(fxnPriceOld).to.be.equal(fxnPriceNew);
        expect(cncPriceOld).to.be.equal(cncPriceNew);
    });

    it("Success :  compare univ2 prices with old CvgOracle", async () => {
        const fxsPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_FXS);
        const fxsPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_FXS);
        const balPriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_BAL);
        const balPriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_BAL);
        const anglePriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_ANGLE);
        const anglePriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_ANGLE);
        const pendlePriceOld = await cvgOracle.getPriceUnverified(TOKEN_ADDR_PENDLE);
        const pendlePriceNew = await cvgOracleUpgradeable.getPriceUnverified(TOKEN_ADDR_PENDLE);
        expect(fxsPriceOld).to.be.equal(fxsPriceNew);
        expect(balPriceNew).to.be.equal(balPriceOld);
        expect(anglePriceOld).to.be.equal(anglePriceNew);
        expect(pendlePriceOld).to.be.equal(pendlePriceNew);
    });
    it("Success : Set curve duo params for CVG (ng pool) & log prices", async () => {
        const cvgCurveDuoParamsV2 = {
            isReversed: false,
            isEthPriceRelated: true,
            isNg: true,
            poolAddress: "0x004c167d27ada24305b76d80762997fa6eb8d9b2",
            deltaLimitOracle: 1000n,
            maxLastUpdate: 86_400_000_000,
            minPrice: 200000000000000000n,
            maxPrice: 10000000000000000000n,
            stablesToCheck: [],
        };
        await cvgOracleUpgradeable.setPoolTypeForToken(cvgContract, 2);
        await (await cvgOracleUpgradeable.setCurveDuoParams(cvgContract, cvgCurveDuoParamsV2)).wait();
        console.log(await cvgOracleUpgradeable.getPriceUnverified(cvgContract));
    });
});
