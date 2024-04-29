import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployBondFixture} from "../../fixtures/stake-dao";
import {Signer} from "ethers";
import {ERC20} from "../../../typechain-types/@openzeppelin/contracts/token/ERC20";
import {BondDepository} from "../../../typechain-types/contracts/Bond";
import {CvgOracle} from "../../../typechain-types";
import * as bondParams from "../../../resources/bond_config";
import {ethers} from "hardhat";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {IBondStruct} from "../../../typechain-types/contracts/Bond/BondDepository";

describe("BondDepository - Bond all test", () => {
    let treasuryDao: Signer;
    let dai: ERC20, crv: ERC20, wETH: ERC20, fxs: ERC20, frax: ERC20, cvx: ERC20, sdt: ERC20, cnc: ERC20;
    let bondDepository: BondDepository;
    let cvgOracle: CvgOracle;

    before(async () => {
        const {contracts, users} = await loadFixture(deployBondFixture);

        const tokens = contracts.tokens;

        treasuryDao = users.treasuryDao;
        cvgOracle = contracts.bonds.cvgOracle;

        dai = tokens.dai;
        frax = tokens.frax;
        crv = tokens.crv;
        cvx = tokens.cvx;
        sdt = tokens.sdt;
        wETH = tokens.weth;
        cnc = tokens.cnc;
        fxs = tokens.fxs;

        bondDepository = contracts.bonds.bondDepository;
    });
    it("Success : Should create bonds", async () => {
        let bondContracts: {[key: string]: string} = {};
        const bondTokens = ["DAI", "FRAX", "CRV", "CVX", "SDT", "WETH", "CNC", "FXS"];
        const txParams: IBondStruct.BondParamsStruct[] = [];
        for (const tokenName of bondTokens) {
            type TokensTickerBond = keyof typeof bondParams;
            const tokenBondParams = bondParams[tokenName as TokensTickerBond];
            txParams.push({...tokenBondParams, startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10});
        }
        await bondDepository.connect(treasuryDao).createBond(txParams);
        await time.increase(10);
    });

    it("get unverified prices", async () => {
        const daiPrice = await cvgOracle.getPriceUnverified(dai);
        const fraxPrice = await cvgOracle.getPriceUnverified(frax);
        const crvPrice = await cvgOracle.getPriceUnverified(crv);
        const cvxPrice = await cvgOracle.getPriceUnverified(cvx);
        const sdtPrice = await cvgOracle.getPriceUnverified(sdt);
        const wethPrice = await cvgOracle.getPriceUnverified(wETH);
        const cncPrice = await cvgOracle.getPriceUnverified(cnc);
        const fxsPrice = await cvgOracle.getPriceUnverified(fxs);
    });
    it("get verified prices", async () => {
        const daiPrice = await cvgOracle.getPriceVerified(dai);
        const fraxPrice = await cvgOracle.getPriceVerified(frax);
        const crvPrice = await cvgOracle.getPriceVerified(crv);
        const cvxPrice = await cvgOracle.getPriceVerified(cvx);
        const sdtPrice = await cvgOracle.getPriceVerified(sdt);
        const wethPrice = await cvgOracle.getPriceVerified(wETH);
        const cncPrice = await cvgOracle.getPriceVerified(cnc);
        const fxsPrice = await cvgOracle.getPriceVerified(fxs);
    });
    it("Test view function", async () => {
        const bonds = await bondDepository.getBondViews(1, 8);
    });
});
