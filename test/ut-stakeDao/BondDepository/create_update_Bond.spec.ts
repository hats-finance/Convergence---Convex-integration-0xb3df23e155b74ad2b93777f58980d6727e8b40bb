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
import {MINT, ONE_WEEK, TOKEN_1} from "../../../resources/constant";
import {manipulateCurveDuoLp} from "../../../utils/swapper/curve-duo-manipulator";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {bond} from "../../../typechain-types/contracts";

describe("BondDepository - Create a bond ", () => {
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

    it("Fails : Create a bond with a composed function that doesn't exist", async () => {
        await bondDepository.connect(treasuryDao).createBond([
            {
                cvgToSell: MAX_CVG_TO_SELL,
                bondDuration: 86400 * 70,
                minRoi: 5_000,
                maxRoi: 65_000,
                composedFunction: 5,
                vestingTerm: 7_600,
                token: sdt,
                percentageOneTx: 200,
                gamma: 250_000,
                scale: 5_000,
                isPaused: false,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
            },
        ]).should.be.reverted;
    });

    it("Fails : Create a bond with a composed function that doesn't exist", async () => {
        await bondDepository
            .connect(treasuryDao)
            .createBond([
                {
                    cvgToSell: MAX_CVG_TO_SELL,
                    bondDuration: 86400 * 70,
                    minRoi: 5_000,
                    maxRoi: 65_000,
                    composedFunction: 1,
                    vestingTerm: 7_600,
                    token: sdt,
                    percentageOneTx: 1_001,
                    gamma: 250_000,
                    scale: 5_000,
                    isPaused: false,
                    startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                },
            ])
            .should.be.revertedWith("INVALID_MAX_PERCENTAGE");
    });

    it("Fails : Create a bond with a composed function that doesn't exist", async () => {
        await bondDepository
            .connect(treasuryDao)
            .createBond([
                {
                    cvgToSell: MAX_CVG_TO_SELL,
                    bondDuration: 86400 * 70,
                    minRoi: 5_000,
                    maxRoi: 65_000,
                    composedFunction: 1,
                    vestingTerm: 7_600,
                    token: sdt,
                    percentageOneTx: 200,
                    gamma: 250_000,
                    scale: 5_000,
                    isPaused: false,
                    startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp - 20,
                },
            ])
            .should.be.revertedWith("START_IN_PAST");
    });

    it("Fails : Max ROI more or equal than 100%", async () => {
        await bondDepository
            .connect(treasuryDao)
            .createBond([
                {
                    cvgToSell: MAX_CVG_TO_SELL,
                    bondDuration: 86400 * 70,
                    minRoi: 5_000,
                    maxRoi: 1_000_000,
                    composedFunction: 1,
                    vestingTerm: 7_600,
                    token: sdt,
                    percentageOneTx: 200,
                    gamma: 250_000,
                    scale: 5_000,
                    isPaused: false,
                    startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                },
            ])
            .should.be.revertedWith("INVALID_MAX_ROI");
    });

    it("Fails : Max ROI less than Min ROI", async () => {
        await bondDepository
            .connect(treasuryDao)
            .createBond([
                {
                    cvgToSell: MAX_CVG_TO_SELL,
                    bondDuration: 86400 * 70,
                    minRoi: 10_000,
                    maxRoi: 5_000,
                    composedFunction: 1,
                    vestingTerm: 7_600,
                    token: sdt,
                    percentageOneTx: 200,
                    gamma: 250_000,
                    scale: 5_000,
                    isPaused: false,
                    startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                },
            ])
            .should.be.revertedWith("MIN_ROI_TOO_HIGH");
    });

    it("Fails : Tries to create bonds as not the owner", async () => {
        await bondDepository
            .createBond([
                {
                    cvgToSell: MAX_CVG_TO_SELL,
                    bondDuration: 86400 * 70,
                    minRoi: 10_000,
                    maxRoi: 10_000,
                    composedFunction: "0",
                    vestingTerm: 7_600,
                    token: sdt,
                    percentageOneTx: 200,
                    gamma: 250_000,
                    scale: 5_000,
                    isPaused: false,
                    startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                },
            ])
            .should.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Fails : Tries to update a bond param", async () => {
        await bondDepository
            .connect(treasuryDao)
            .updateBondParams([
                {
                    bondId: 1,
                    composedFunction: 0,
                    minRoi: 10_000,
                    maxRoi: 10_000,
                    percentageOneTx: 200,
                },
            ])
            .should.be.revertedWith("BOND_NOT_EXISTING");
    });

    it("Success : Should 3 bonds", async () => {
        const tx = await bondDepository.connect(treasuryDao).createBond([
            {
                cvgToSell: MAX_CVG_TO_SELL,
                bondDuration: 86400 * 70,
                minRoi: 10_000,
                maxRoi: 15_000,
                composedFunction: "0",
                vestingTerm: ONE_WEEK,
                token: sdt,
                percentageOneTx: 200,
                gamma: 250_000,
                scale: 5_000,
                isPaused: false,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
            },
            {
                cvgToSell: MAX_CVG_TO_SELL,
                bondDuration: 86400 * 70,
                minRoi: 5_000,
                maxRoi: 6_000,
                composedFunction: "0",
                vestingTerm: ONE_WEEK,
                token: sdt,
                percentageOneTx: 500,
                gamma: 250_000,
                scale: 5_000,
                isPaused: false,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
            },
            {
                cvgToSell: MAX_CVG_TO_SELL,
                bondDuration: 86400 * 70,
                minRoi: 2_000,
                maxRoi: 8_000,
                composedFunction: "0",
                vestingTerm: ONE_WEEK,
                token: sdt,
                percentageOneTx: 200,
                gamma: 250_000,
                scale: 5_000,
                isPaused: false,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
            },
        ]);
    });

    it("Fails : Tries to update a bond param with a MIN_ROI > MAX_ROI", async () => {
        await bondDepository
            .connect(treasuryDao)
            .updateBondParams([
                {
                    bondId: 1,
                    composedFunction: 0,
                    minRoi: 16_000,
                    maxRoi: 15_000,
                    percentageOneTx: 200,
                },
            ])
            .should.be.revertedWith("MIN_ROI_TOO_HIGH");
    });

    it("Fails : Tries to update a bond param with a MAX_ROI > 100%", async () => {
        await bondDepository
            .connect(treasuryDao)
            .updateBondParams([
                {
                    bondId: 1,
                    composedFunction: 0,
                    minRoi: 16_000,
                    maxRoi: 1_000_000,
                    percentageOneTx: 200,
                },
            ])
            .should.be.revertedWith("INVALID_MAX_ROI");
    });

    it("Fails : Tries to update a bond param with a MIN_ROI decreasing compare to before", async () => {
        await bondDepository
            .connect(treasuryDao)
            .updateBondParams([
                {
                    bondId: 1,
                    composedFunction: 0,
                    minRoi: 9_000,
                    maxRoi: 15_000,
                    percentageOneTx: 200,
                },
            ])
            .should.be.revertedWith("MIN_ROI_DECREASED");
    });

    it("Fails : Tries to update a bond param with a MAX_ROI decreasing compare to before", async () => {
        await bondDepository
            .connect(treasuryDao)
            .updateBondParams([
                {
                    bondId: 1,
                    composedFunction: 0,
                    minRoi: 10_000,
                    maxRoi: 14_000,
                    percentageOneTx: 200,
                },
            ])
            .should.be.revertedWith("MAX_ROI_DECREASED");
    });

    it("Success : Updates MAX", async () => {
        await bondDepository.connect(treasuryDao).updateBondParams([
            {
                bondId: 1,
                composedFunction: 1,
                minRoi: 12_000,
                maxRoi: 16_000,
                percentageOneTx: 200,
            },

            {
                bondId: 3,
                composedFunction: 2,
                minRoi: 13_000,
                maxRoi: 17_000,
                percentageOneTx: 500,
            },
            {
                bondId: 2,
                composedFunction: 3,
                minRoi: 14_000,
                maxRoi: 18_000,
                percentageOneTx: 600,
            },
        ]);
        const [bond1, bond2, bond3] = await Promise.all([
            await bondDepository.bondParams(1),
            await bondDepository.bondParams(2),
            await bondDepository.bondParams(3),
        ]);

        expect(bond1.composedFunction).to.be.eq(1);
        expect(bond1.minRoi).to.be.eq(12_000);
        expect(bond1.maxRoi).to.be.eq(16_000);
        expect(bond1.percentageOneTx).to.be.eq(200);

        expect(bond2.composedFunction).to.be.eq(3);
        expect(bond2.minRoi).to.be.eq(14_000);
        expect(bond2.maxRoi).to.be.eq(18_000);
        expect(bond2.percentageOneTx).to.be.eq(600);

        expect(bond3.composedFunction).to.be.eq(2);
        expect(bond3.minRoi).to.be.eq(13_000);
        expect(bond3.maxRoi).to.be.eq(17_000);
        expect(bond3.percentageOneTx).to.be.eq(500);
    });
});
