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

describe("BondDepository - Bond & Redeem", () => {
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
    it("Success : Should create bond Stable", async () => {
        await bondDepository.connect(treasuryDao).createBond([
            {
                bondDuration: 86400 * 70,
                cvgToSell: ethers.parseEther("1000000"),
                minRoi: 5_000,
                maxRoi: 65_000,
                composedFunction: 0,
                vestingTerm: 432_000,
                token: dai,
                percentageOneTx: 800,
                gamma: 250_000,
                scale: 5_000,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                isPaused: false,
            },
        ]);

        await time.increase(10);
    });

    let totalToken1: bigint;
    it("Success :  Deposit in bond DAI token 1", async () => {
        const daiDeposited = ethers.parseEther("100000"); // Deposit 100k$

        await (await dai.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();

        const depositTx = bondDepository.connect(user1).deposit(BOND_DAI, MINT, daiDeposited, 1, user1);
        await expect(depositTx).to.changeTokenBalance(dai, user1, -daiDeposited);

        const events = await bondDepository.queryFilter(filterBondDeposit, -1, "latest");
        const depositEvent = events[0].args;

        expect(depositEvent.amountDeposited).to.be.equal(daiDeposited);
        expect(depositEvent.amountDepositedUsd).to.be.equal(daiDeposited);

        const bondPendingToken1Dai = await bondDepository.positionInfos(TOKEN_1);
        totalToken1 = bondPendingToken1Dai.leftClaimable;
    });

    let totalToken2: bigint;

    it("Success :  Deposit in bond DAI token 2", async () => {
        const daiAmount = ethers.parseEther("40000"); // Deposit 40k$

        await (await dai.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();

        const depositTx = await bondDepository.connect(user1).deposit(BOND_DAI, MINT, daiAmount, 1, user1);
        await expect(depositTx).to.changeTokenBalance(dai, user1, -daiAmount);

        const events = await bondDepository.queryFilter(filterBondDeposit, -1, "latest");
        const depositEvent = events[0].args;

        expect(depositEvent.amountDeposited).to.be.equal(daiAmount);
        expect(depositEvent.amountDepositedUsd).to.be.equal(daiAmount);

        const bondPendingToken2 = await bondDepository.positionInfos(TOKEN_2);
        totalToken2 = bondPendingToken2.leftClaimable;
    });

    it("Success : Go 10% of vesting in the future ", async () => {
        await time.increase(43_200);
    });
    let claimToken1Total = 0n;
    let leftClaimable2 = 0n;

    it("Success : Redeem 10% of the vesting on user position & a token position", async () => {
        const vestingRatio = await getVestingRatio(bondDepository, TOKEN_1);

        const txRedeemMultiple = bondDepository.connect(user1).redeem([TOKEN_1, TOKEN_2], user1);
        const claim1 = (totalToken1 * vestingRatio) / 10_000n;
        const claim2 = (totalToken2 * vestingRatio) / 10_000n;

        claimToken1Total += claim1;
        leftClaimable2 = totalToken2 - claim2;
        await expect(txRedeemMultiple).to.changeTokenBalance(cvg, user1, claim1 + claim2);
    });

    it("Success : Go 40% of vesting in the future ", async () => {
        await time.increase(43_200 * 3);
    });

    it("Success : Redeem 30% of the vesting", async () => {
        const token1Position = await bondDepository.positionInfos(TOKEN_1);

        const vestingRatio = await getVestingRatio(bondDepository, TOKEN_1);

        const txRedeemToken1 = bondDepository.connect(user1).redeem([TOKEN_1], user1);
        const claim1 = (token1Position.leftClaimable * vestingRatio) / 10_000n;
        claimToken1Total += claim1;

        await expect(txRedeemToken1).to.changeTokenBalance(cvg, user1, (token1Position.leftClaimable * vestingRatio) / 10_000n);
    });

    let BOND_ETH = 2;
    it("Success : Should create bond WETH", async () => {
        await bondDepository.connect(treasuryDao).createBond([
            {
                bondDuration: 86400 * 70,
                cvgToSell: ethers.parseEther("1000000"),
                minRoi: 5_000,
                maxRoi: 65_000,
                composedFunction: 3,
                vestingTerm: 432_000,
                token: wETH,
                percentageOneTx: 800,
                gamma: 250_000,
                scale: 5_000,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                isPaused: false,
            },
        ]);

        await time.increase(10);

        const bondView = await bondDepository.getBondViews(1, 2);
        expect(bondView.length).to.be.eq(2);
    });
    let totalToken3 = 0n;
    it("Success : Mint a position in BOND ETH", async () => {
        const ethToPay = 5;
        const ethPrice = prices[TOKEN_ADDR_WETH].price;
        // ROI = ROI MAX
        const cvgPriceExpected = 0.33 - 0.33 * 0.065;
        const dollarValueDeposited = ethPrice * ethToPay;
        const cvgMintedExpected = dollarValueDeposited / cvgPriceExpected;

        await (await bondDepository.deposit(BOND_ETH, 0, ethers.parseEther(ethToPay.toString()), 1, user1)).wait();
        const bondPending = await bondDepository.positionInfos(TOKEN_3);
        totalToken3 += bondPending.leftClaimable;
        expect(Number(ethers.formatEther(bondPending.leftClaimable))).to.be.within(cvgMintedExpected * 0.95, cvgMintedExpected * 1.05);

        expect(await wETH.balanceOf(treasuryPod)).to.be.eq(ethers.parseEther(ethToPay.toString()));
    });

    it("Success : Add some ETH in the position", async () => {
        const ethToPay = 5;
        const ethPrice = prices[TOKEN_ADDR_WETH].price;
        const actualRoi = Number((await bondDepository.getBondViews(2, 2))[0].actualRoi) / 1_000_000;
        let bondPending = await bondDepository.positionInfos(TOKEN_3);
        const leftClaimableBeforeDeposit = Number(ethers.formatEther(bondPending.leftClaimable));
        // ROI = ROI MAX
        const cvgPriceExpected = 0.33 - 0.33 * actualRoi;

        const dollarValueDeposited = ethPrice * ethToPay;
        const cvgMintedExpected = dollarValueDeposited / cvgPriceExpected;
        await (await wETH.approve(bondDepository, MAX_INTEGER)).wait();

        await (await bondDepository.connect(user1).deposit(BOND_ETH, TOKEN_3, ethers.parseEther(ethToPay.toString()), 1, owner)).wait();
        bondPending = await bondDepository.positionInfos(TOKEN_3);
        totalToken3 = bondPending.leftClaimable;
        expect(Number(ethers.formatEther(totalToken3))).to.be.within(
            leftClaimableBeforeDeposit + cvgMintedExpected * 0.95,
            leftClaimableBeforeDeposit + cvgMintedExpected * 1.05
        );

        expect(await wETH.balanceOf(treasuryPod)).to.be.eq(ethers.parseEther("10"));
    });

    let BOND_SDT = 3;
    it("Success : Should create a bond not stable with a price below 1$", async () => {
        const tx = await bondDepository.connect(treasuryDao).createBond([
            {
                cvgToSell: ethers.parseEther("1000000"),
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
        await time.increase(10);

        const bondView = await bondDepository.getBondViews(1, 3);
        expect(bondView.length).to.be.eq(3);
    });

    let totalToken4 = 0n;
    it("Success : Mint a position in BOND SDT", async () => {
        const sdtDeposited = 100;
        const sdtPrice = prices[TOKEN_ADDR_SDT].price;
        // ROI = ROI MAX
        const cvgPriceExpected = 0.33 - 0.33 * 0.065;
        const dollarValueDeposited = sdtPrice * sdtDeposited;
        const cvgMintedExpected = dollarValueDeposited / cvgPriceExpected;
        await (await sdt.approve(bondDepository, MAX_INTEGER)).wait();

        await (await bondDepository.deposit(BOND_SDT, MINT, ethers.parseEther(sdtDeposited.toString()), 1, user1)).wait();

        const bondPending = await bondDepository.positionInfos(TOKEN_4);
        totalToken4 = bondPending.leftClaimable;
        expect(await bondPositionManager.ownerOf(TOKEN_4)).to.be.eq(await user1.getAddress());
        expect(Number(ethers.formatEther(bondPending.leftClaimable))).to.be.within(cvgMintedExpected * 0.95, cvgMintedExpected * 1.05);
        expect(await sdt.balanceOf(treasuryPod)).to.be.eq(ethers.parseEther(sdtDeposited.toString()));
    });

    it("Success : Should redeem the CVG minted that left on Token 1", async () => {
        let position1 = await bondDepository.positionInfos(TOKEN_1);
        await time.increase(0.5 * 86400);
        let percentVested = await bondDepository.percentVestedFor(TOKEN_1);
        expect(percentVested).to.be.within(1666n, 1667n); // 16.67 %
        let pendingPayout = await bondDepository.pendingPayoutFor(TOKEN_1);
        expect(pendingPayout).to.be.eq((position1.leftClaimable * percentVested) / 10_000n);

        const balanceBefore = await cvg.balanceOf(user1);

        await bondDepository.connect(user1).redeem([TOKEN_1], user1);
        const delta = (await cvg.balanceOf(user1)) - balanceBefore;
        claimToken1Total += delta;

        expect(delta).to.be.within((pendingPayout * 99n) / 100n, (pendingPayout * 101n) / 100n);

        await time.increase(5 * 86400);
        position1 = await bondDepository.positionInfos(TOKEN_1);

        percentVested = await bondDepository.percentVestedFor(1);
        expect(percentVested).to.be.eq("10000"); // 100 %

        pendingPayout = await bondDepository.pendingPayoutFor(1);
        expect(pendingPayout).to.be.eq(position1.leftClaimable);

        claimToken1Total += pendingPayout;

        await expect(bondDepository.connect(user1).redeem([TOKEN_1], user1)).to.changeTokenBalance(cvg, user1, pendingPayout);
        // Important, checks that after all claims ALL CVG has been distributed.
        expect(claimToken1Total).to.be.eq(totalToken1);
    });

    it("Success : Should redeem the CVG on token 2, 3 & 4", async () => {
        await expect(bondDepository.connect(user1).redeem([TOKEN_2, TOKEN_3, TOKEN_4], owner)).to.changeTokenBalance(
            cvg,
            owner,
            leftClaimable2 + totalToken3 + totalToken4
        );
    });

    it("Test view function", async () => {
        const bonds = await bondDepository.getBondViews(1, 1);
        const bondDai = bonds[0];
        expect(bondDai.token.token).to.be.eq("DAI");
        expect(bondDai.token.decimals).to.be.eq("18");
        expect(bondDai.cvgAlreadySold).to.be.eq(totalToken1 + totalToken2);
        expect(bondDai.bondParameters.cvgToSell).to.be.eq("1000000000000000000000000");
        expect(bondDai.bondParameters.vestingTerm).to.be.eq(432000);
    });

    it("Set composed function to logarithm (1) on DAI bond", async () => {
        await bondDepository
            .connect(treasuryDao)
            .updateBondParams([{bondId: BOND_DAI, composedFunction: 1, minRoi: 5_000, maxRoi: 65_000, percentageOneTx: 200}]);

        const bondParams = await bondDepository.bondParams(BOND_DAI);
        expect(bondParams.composedFunction).to.be.equal(1);
    });
});
