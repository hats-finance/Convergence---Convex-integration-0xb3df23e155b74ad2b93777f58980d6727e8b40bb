import {expect} from "chai";
import {ApiHelper} from "../../../utils/ApiHelper";
import {MAX_INTEGER} from "@nomicfoundation/ethereumjs-util";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployBondFixture} from "../../fixtures/stake-dao";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {Signer} from "ethers";
import {ERC20} from "../../../typechain-types/@openzeppelin/contracts/token/ERC20";
import {Cvg} from "../../../typechain-types/contracts/Token";
import {BondDepository, BondPositionManager} from "../../../typechain-types/contracts/Bond";
import {ethers} from "hardhat";
import {TOKEN_ADDR_SDT, TOKEN_ADDR_WETH} from "../../../resources/tokens/common";
import {TypedContractEvent, TypedDeferredTopicFilter} from "../../../typechain-types/common";
import {BondCreatedEvent, BondDepositEvent} from "../../../typechain-types/contracts/Bond/BondDepository";
import {MINT, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_4} from "../../../resources/constant";
import {getVestingRatio} from "../../../utils/bonds/getVestingRatio";

describe("BondDepository - Big amounts", () => {
    let owner: Signer, treasuryPod: Signer, treasuryDao: Signer, user1: Signer;
    let dai: ERC20, wETH: ERC20, sdt: ERC20, cvg: Cvg;
    let bondDepository: BondDepository, bondPositionManager: BondPositionManager;
    let prices: any;

    let filterBondCreated: TypedDeferredTopicFilter<
        TypedContractEvent<BondCreatedEvent.InputTuple, BondCreatedEvent.OutputTuple, BondCreatedEvent.OutputObject>
    >;

    let filterBondDeposit: TypedDeferredTopicFilter<
        TypedContractEvent<BondDepositEvent.InputTuple, BondDepositEvent.OutputTuple, BondDepositEvent.OutputObject>
    >;

    before(async () => {
        const {contracts, users} = await loadFixture(deployBondFixture);

        prices = await ApiHelper.getDefiLlamaTokenPrices([TOKEN_ADDR_WETH, TOKEN_ADDR_SDT]);
        const tokens = contracts.tokens;
        owner = users.owner;
        user1 = users.user1;
        treasuryPod = users.treasuryPod;
        treasuryDao = users.treasuryDao;

        dai = tokens.dai;
        wETH = tokens.weth;

        cvg = tokens.cvg;
        sdt = tokens.sdt;
        bondDepository = contracts.bonds.bondDepository;
        bondPositionManager = contracts.bonds.bondPositionManager;

        filterBondCreated = bondDepository.filters.BondCreated(undefined);
        filterBondDeposit = bondDepository.filters.BondDeposit(undefined, undefined);

        await (await wETH.approve(bondDepository, MAX_INTEGER)).wait();
        await (await wETH.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();
        await (await sdt.approve(bondDepository, MAX_INTEGER)).wait();
        await (await sdt.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();
    });
    let BOND_DAI = 1;

    const MAX_CVG_AMOUNT_FOR_A_BOND = ethers.parseEther("1200000");
    it("Success : Create a bond with no limit on the percentage max per tx and the max amount", async () => {
        await bondDepository.connect(treasuryDao).createBond([
            {
                bondDuration: 86400 * 70,
                cvgToSell: MAX_CVG_AMOUNT_FOR_A_BOND,
                minRoi: 5_000,
                maxRoi: 65_000,
                composedFunction: 0,
                vestingTerm: 1200,
                token: dai,
                percentageOneTx: 1_000,
                gamma: 250_000,
                scale: 5_000,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                isPaused: false,
            },
        ]);

        await time.increase(10);
    });

    let totalToken1: bigint;
    it("Success :  Deposit in the bond with the maximum amount possible", async () => {
        const daiDeposited = ethers.parseEther("370260");

        await (await dai.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();

        const depositTx = bondDepository.connect(user1).deposit(BOND_DAI, MINT, daiDeposited, 0, user1);
        await expect(depositTx).to.changeTokenBalance(dai, user1, -daiDeposited);

        const events = await bondDepository.queryFilter(filterBondDeposit, -1, "latest");
        const depositEvent = events[0].args;

        expect(depositEvent.amountDeposited).to.be.equal(daiDeposited);
        expect(depositEvent.amountDepositedUsd).to.be.equal(daiDeposited);

        const bondPendingToken1Dai = await bondDepository.positionInfos(TOKEN_1);
        totalToken1 = bondPendingToken1Dai.leftClaimable;
    });

    it("Success : Redeem the maximum amount redeemable by a bond", async () => {
        await time.increase(1200);

        const redeemTx = bondDepository.connect(user1).redeem([TOKEN_1], user1);
        await expect(redeemTx).to.changeTokenBalance(cvg, user1, MAX_CVG_AMOUNT_FOR_A_BOND);
    });
});
