import {expect} from "chai";
import {ApiHelper} from "../../../utils/ApiHelper";
import {MAX_INTEGER} from "@nomicfoundation/ethereumjs-util";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployBondFixture} from "../../fixtures/stake-dao";
import {Signer} from "ethers";
import {ERC20} from "../../../typechain-types/@openzeppelin/contracts/token/ERC20";
import {BondDepository} from "../../../typechain-types/contracts/Bond";
import {ICrvPool} from "../../../typechain-types/contracts/interfaces/ICrvPool.sol";
import {ethers} from "hardhat";
import {TOKEN_ADDR_SDT, TOKEN_ADDR_WETH} from "../../../resources/tokens/common";
import {MINT, TOKEN_1} from "../../../resources/constant";
import {manipulateCurveDuoLp} from "../../../utils/swapper/curve-duo-manipulator";
import {time} from "@nomicfoundation/hardhat-network-helpers";

describe("BondDepository - Deposit Requires", () => {
    let owner: Signer, treasuryPod: Signer, treasuryDao: Signer, user1: Signer;
    let dai: ERC20, sdt: ERC20;
    let bondDepository: BondDepository;
    let cvgPoolContract: ICrvPool;
    let prices: any;

    before(async () => {
        const {contracts, users} = await loadFixture(deployBondFixture);

        prices = await ApiHelper.getDefiLlamaTokenPrices([TOKEN_ADDR_WETH, TOKEN_ADDR_SDT]);
        const tokens = contracts.tokens;
        owner = users.owner;
        user1 = users.user1;
        treasuryPod = users.treasuryPod;
        treasuryDao = users.treasuryDao;

        dai = tokens.dai;

        sdt = tokens.sdt;
        bondDepository = contracts.bonds.bondDepository;

        cvgPoolContract = contracts.lp.poolCvgFraxBp;

        await (await sdt.connect(owner).approve(bondDepository, MAX_INTEGER)).wait();
    });
    const BOND_SDT = 1;
    const MAX_CVG_TO_SELL = ethers.parseEther("1000000");

    it("Success : Should create a bond not stable with a price below 1$", async () => {
        const tx = await bondDepository.connect(treasuryDao).createBond([
            {
                cvgToSell: MAX_CVG_TO_SELL,
                bondDuration: 86400 * 70,
                minRoi: 5_000,
                maxRoi: 65_000,
                composedFunction: "0",
                vestingTerm: 7_600,
                token: sdt,
                percentageOneTx: 200,
                gamma: 250_000,
                scale: 5_000,
                isPaused: false,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
            },
        ]);
    });

    it("Fails : Deposit in bond with amount in 0 should revert", async () => {
        await bondDepository.connect(user1).deposit(BOND_SDT, MINT, 0, 1, owner).should.be.revertedWith("LTE");
    });

    it("Fails : Deposit in a bond not yet started", async () => {
        await bondDepository.connect(user1).deposit(BOND_SDT, MINT, 1000, 1, owner).should.be.revertedWith("BOND_NOT_STARTED");
        await time.increase(10);
    });

    it("Fails : Deposit in bond and cvg bought is equal to 0", async () => {
        await bondDepository.connect(user1).deposit(BOND_SDT, MINT, 1, 1, owner).should.be.revertedWith("ZERO_BUY");
    });

    it("Fails : Deposit in bond with an amount bigger than the total authorized per tx", async () => {
        await bondDepository.connect(user1).deposit(BOND_SDT, MINT, ethers.parseEther("10000000"), 1, owner).should.be.revertedWith("MAX_CVG_PER_BOND");
    });

    it("Fails : Deposit in bond with an amount bigger than the total authorized per tx", async () => {
        await bondDepository.connect(user1).deposit(1, MINT, ethers.parseEther("10000000"), 1, owner).should.be.revertedWith("MAX_CVG_PER_BOND");
    });

    it("Fails : Pause a bond as not the DAO", async () => {
        await bondDepository.connect(user1).togglePause([1]).should.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Success : Pause a bond", async () => {
        await bondDepository.connect(treasuryDao).togglePause([1]);
        const bondParams = await bondDepository.bondParams(1);
        expect(bondParams.isPaused).to.be.true;
    });

    it("Fails : Deposit in a paused bond", async () => {
        await bondDepository.connect(user1).deposit(BOND_SDT, MINT, ethers.parseEther("1"), 1, owner).should.be.revertedWith("BOND_PAUSED");
    });

    it("Success : UnPause a bond", async () => {
        await bondDepository.connect(treasuryDao).togglePause([1]);
        const bondParams = await bondDepository.bondParams(1);
        expect(bondParams.isPaused).to.be.false;
    });

    it("Fails : Tries to set new composed function on DAI bond with invalid value", async () => {
        await expect(
            bondDepository.connect(treasuryDao).updateBondParams([{bondId: BOND_SDT, composedFunction: 4, minRoi: 5_000, maxRoi: 65_000, percentageOneTx: 200}])
        ).to.be.reverted;
    });

    it("Fails : Set composed function as not the owner", async () => {
        await expect(
            bondDepository.connect(user1).updateBondParams([{bondId: BOND_SDT, composedFunction: 1, minRoi: 5_000, maxRoi: 65_000, percentageOneTx: 200}])
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Fails : Set composed function as not the owner", async () => {
        await expect(bondDepository.connect(user1).deposit(BOND_SDT, MINT, ethers.parseEther("500"), ethers.parseEther("500000"), user1)).to.be.revertedWith(
            "SLIPPAGE_ERROR"
        );
    });

    it("Success : Fills the bond near to it's full capacity", async () => {
        await bondDepository.deposit(BOND_SDT, MINT, ethers.parseEther("50000"), 1, owner);
        let alreadySold = await bondDepository.cvgSold(BOND_SDT);
        while (1) {
            alreadySold = await bondDepository.cvgSold(BOND_SDT);
            if (alreadySold > MAX_CVG_TO_SELL - ethers.parseEther("40000")) {
                break;
            }
            await bondDepository.deposit(BOND_SDT, TOKEN_1, ethers.parseEther("40000"), 1, owner);
        }
    });

    it("Fail: Deposit more than the total cvg to sell", async () => {
        await expect(bondDepository.deposit(BOND_SDT, MINT, ethers.parseEther("100000"), 1, owner)).to.be.revertedWith("MAX_CVG_ALREADY_MINTED");
    });

    it("Fails : Tries to deposit with invalid CVG price", async () => {
        // manipulate Liquidity
        await manipulateCurveDuoLp(await cvgPoolContract.getAddress(), [{type: "swap", direction: [1, 0], amountIn: 50_000}], owner);

        await expect(bondDepository.deposit(BOND_SDT, TOKEN_1, ethers.parseEther("1000"), 1, owner)).to.be.revertedWith("EXECUTION_LIMIT_DEPEG");

        // reset to initial value
        await manipulateCurveDuoLp(
            await cvgPoolContract.getAddress(),
            [
                {type: "swap", direction: [0, 1], amountIn: 25_000},
                {type: "swap", direction: [0, 1], amountIn: 1},
            ],
            owner
        );

        await expect(bondDepository.deposit(BOND_SDT, TOKEN_1, ethers.parseEther("1000"), 1, owner)).to.be.revertedWith("EXECUTION_LIMIT_DEPEG");
    });

    it("Success : Time travels and tries to deposit after bond ended", async () => {
        await time.increase(70 * 86400);

        await expect(bondDepository.deposit(BOND_SDT, TOKEN_1, ethers.parseEther("1000"), 1, owner)).to.be.revertedWith("BOND_INACTIVE");
    });

    it("set composed function on SDT bond ", async () => {
        await bondDepository
            .connect(treasuryDao)
            .updateBondParams([{bondId: BOND_SDT, composedFunction: 2, minRoi: 5_000, maxRoi: 65_000, percentageOneTx: 200}]);
    });

    it("Success: set setPercentageMaxCvgToMint in base contract ", async () => {
        await bondDepository
            .connect(treasuryDao)
            .updateBondParams([{bondId: BOND_SDT, composedFunction: 2, minRoi: 5_000, maxRoi: 65_000, percentageOneTx: 2}]);
    });

    it("Fail: set setPercentageMaxCvgToMint in base contract with invalid percentage", async () => {
        await expect(
            bondDepository
                .connect(treasuryDao)
                .updateBondParams([{bondId: BOND_SDT, composedFunction: 2, minRoi: 5_000, maxRoi: 65_000, percentageOneTx: 1000}])
        ).to.be.revertedWith("INVALID_PERCENTAGE_MAX");
    });
});
