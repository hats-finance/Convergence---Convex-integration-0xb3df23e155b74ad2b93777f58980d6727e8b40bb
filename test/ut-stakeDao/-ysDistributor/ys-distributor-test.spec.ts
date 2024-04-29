import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised).should();
const expect = chai.expect;

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {Cvg} from "../../../typechain-types/contracts/Token";
import {Signer, EventLog, MaxUint256, ZeroAddress} from "ethers";
import {ERC20} from "../../../typechain-types/@openzeppelin/contracts/token/ERC20";
import {LockingPositionService} from "../../../typechain-types/contracts/Locking";
import {IContracts, IContractsUser, IUsers} from "../../../utils/contractInterface";
import {ethers} from "hardhat";
import {CYCLE_1, CYCLE_12, CYCLE_13, CYCLE_24, TDE_1, TDE_2, TDE_3, TDE_4, TOKEN_1, TOKEN_2, TOKEN_3} from "../../../resources/constant";
import {IYsDistributor, YsDistributor} from "../../../typechain-types";

describe("YsDistributor Deposit/Claim Multiple Tokens Tests", () => {
    let ysdistributor: YsDistributor, treasuryPdd: Signer, treasuryDao: Signer;
    let dai: ERC20, weth: ERC20, crv: ERC20, usdc: ERC20, sdt: ERC20;
    let owner: Signer, user1: Signer, user2: Signer;
    let lockingPositionServiceContract: LockingPositionService, cvgContract: Cvg;
    let contractsUsers: IContractsUser, contracts: IContracts, users: IUsers;

    before(async () => {
        contractsUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractsUsers.contracts;
        users = contractsUsers.users;
        lockingPositionServiceContract = contracts.locking.lockingPositionService;

        const tokens = contracts.tokens;
        cvgContract = tokens.cvg;
        dai = tokens.dai;
        weth = tokens.weth;
        crv = tokens.crv;
        usdc = tokens.usdc;
        sdt = tokens.sdt;

        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        treasuryPdd = users.treasuryPdd;
        treasuryDao = users.treasuryDao;
        ysdistributor = contracts.rewards.ysDistributor;

        // approve treasuryPdd tokens spending
        await crv.connect(treasuryPdd).approve(ysdistributor, MaxUint256);
        await weth.connect(treasuryPdd).approve(ysdistributor, MaxUint256);
        await usdc.connect(treasuryPdd).approve(ysdistributor, MaxUint256);
        await sdt.connect(treasuryPdd).approve(ysdistributor, MaxUint256);

        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();
    });
    it("Success : initialize ysDistributor should revert", async () => {
        await ysdistributor.initialize(user1).should.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Success : Mint position user1 at cycle 1", async () => {
        const amountCvgUser1 = ethers.parseEther("75");
        await (await cvgContract.connect(user1).approve(lockingPositionServiceContract, amountCvgUser1)).wait();
        await (await lockingPositionServiceContract.connect(user1).mintPosition(23, amountCvgUser1, 100, user1, true)).wait(); // Lock 75 CVG for 43 cycles

        const totalSupplyYsCvg = await lockingPositionServiceContract.totalSupplyOfYsCvgAt(CYCLE_1);
        expect(totalSupplyYsCvg).to.be.eq(0);

        const token1Position = await lockingPositionServiceContract.lockingPositions(1);
        expect(token1Position.startCycle).to.be.eq(1);
        expect(token1Position.lastEndCycle).to.be.eq(24);
        expect(token1Position.totalCvgLocked).to.be.eq(amountCvgUser1);
        expect(await ysdistributor.getPositionRewardsForTdes([TDE_1], CYCLE_1, TOKEN_1)).to.be.deep.eq([]);
        expect(await ysdistributor.getPositionRewardsForTdes([TDE_2], CYCLE_1, TOKEN_1)).to.be.deep.eq([]);
        expect(await ysdistributor.getPositionRewardsForTdes([TDE_3], CYCLE_1, TOKEN_1)).to.be.deep.eq([]);
        expect(await ysdistributor.getPositionRewardsForTdes([TDE_4], CYCLE_1, TOKEN_1)).to.be.deep.eq([]);
    });

    it("Success : Mint position user2 at cycle 1", async () => {
        const amountCvgUser2 = ethers.parseEther("25");
        await (await cvgContract.connect(user2).approve(lockingPositionServiceContract, amountCvgUser2)).wait();
        await (await lockingPositionServiceContract.connect(user2).mintPosition(23, amountCvgUser2, 100, user2, true)).wait(); // Lock 25 CVG for 43 cycles
        const token2Position = await lockingPositionServiceContract.lockingPositions(2);

        expect(token2Position.startCycle).to.be.eq(1);
        expect(token2Position.lastEndCycle).to.be.eq(24);
        expect(token2Position.totalCvgLocked).to.be.eq(amountCvgUser2);
    });

    it("Success : Mint position user2 at cycle 1", async () => {
        const amountCvgUser2 = ethers.parseEther("25");
        await (await cvgContract.connect(user2).approve(lockingPositionServiceContract, amountCvgUser2)).wait();
        await (await lockingPositionServiceContract.connect(user2).mintPosition(23, amountCvgUser2, 0, user2, true)).wait(); // Lock 25 CVG for 43 cycles
        const token2Position = await lockingPositionServiceContract.lockingPositions(3);

        expect(token2Position.startCycle).to.be.eq(1);
        expect(token2Position.lastEndCycle).to.be.eq(24);
        expect(token2Position.totalCvgLocked).to.be.eq(amountCvgUser2);
        expect(await ysdistributor.getPositionRewardsForTdes([TDE_1], CYCLE_1, TOKEN_3)).to.be.empty;
        expect(await ysdistributor.getPositionRewardsForTdes([TDE_2], CYCLE_1, TOKEN_3)).to.be.empty;
        expect(await ysdistributor.getPositionRewardsForTdes([TDE_3], CYCLE_1, TOKEN_3)).to.be.empty;
        expect(await ysdistributor.getPositionRewardsForTdes([TDE_4], CYCLE_1, TOKEN_3)).to.be.empty;
    });
    const sdtAmountTDE1 = ethers.parseEther("5");
    const crvAmountTDE1 = ethers.parseEther("10");
    const wethAmountTDE1 = ethers.parseEther("15");
    const usdcAmountTDE1 = ethers.parseUnits("5000", 6);

    it("Success : Deposit multiple tokens for TDE1 at cycle1 should compute right infos", async () => {
        await sdt.connect(users.user7).transfer(treasuryPdd, ethers.parseUnits("10000", 18));
        await crv.connect(users.user7).transfer(treasuryPdd, ethers.parseUnits("10000", 18));
        await weth.connect(users.user7).transfer(treasuryPdd, ethers.parseUnits("10000", 18));
        await usdc.connect(users.user7).transfer(treasuryPdd, ethers.parseUnits("10000", 6));

        const depositStruct: IYsDistributor.TokenAmountStruct[] = [
            {token: sdt, amount: sdtAmountTDE1},
            {token: crv, amount: crvAmountTDE1},
            {token: weth, amount: wethAmountTDE1},
            {token: usdc, amount: usdcAmountTDE1},
        ];
        await ysdistributor.connect(treasuryPdd).depositMultipleToken(depositStruct);

        expect(await ysdistributor.getAllRewardsForTde(TDE_1)).to.be.deep.eq([
            [await sdt.getAddress(), sdtAmountTDE1],
            [await crv.getAddress(), crvAmountTDE1],
            [await weth.getAddress(), wethAmountTDE1],
            [await usdc.getAddress(), usdcAmountTDE1],
        ]);

        expect(await sdt.balanceOf(ysdistributor)).to.be.equal(sdtAmountTDE1);
        expect(await crv.balanceOf(ysdistributor)).to.be.equal(crvAmountTDE1);
        expect(await weth.balanceOf(ysdistributor)).to.be.equal(wethAmountTDE1);
        expect(await usdc.balanceOf(ysdistributor)).to.be.equal(usdcAmountTDE1);
    });

    it("Success : Get rewards on a token before cycle TDE cycle", async () => {
        const balancesTotalSupply = await lockingPositionServiceContract.getTotalSupplyAtAndBalanceOfYs(TOKEN_1, CYCLE_12);
        const totalSupply = balancesTotalSupply[0];
        const balance = balancesTotalSupply[1];
        const allRewards = await ysdistributor.getPositionRewardsForTdes([TDE_1], CYCLE_13, TOKEN_1);
        expect(allRewards).to.be.deep.eq([
            [
                TDE_1,
                false,
                [
                    [await sdt.getAddress(), (balance * sdtAmountTDE1) / totalSupply],
                    [await crv.getAddress(), (balance * crvAmountTDE1) / totalSupply],
                    [await weth.getAddress(), (balance * wethAmountTDE1) / totalSupply],
                    [await usdc.getAddress(), (balance * usdcAmountTDE1) / totalSupply],
                ],
            ],
        ]);
    });

    it("Success : Increase to cycle 12 (TDE 0)", async () => {
        await increaseCvgCycle(contractsUsers, 11);
    });

    it("Success : Get rewards on the TDE cycle returns still nothing", async () => {
        const allRewards = await ysdistributor.getPositionRewardsForTdes([TDE_1, TDE_2], CYCLE_13, TOKEN_1);
        const balanceToken1 = await lockingPositionServiceContract.balanceOfYsCvgAt(TOKEN_1, CYCLE_12);
        const totalSupplyToken1 = await lockingPositionServiceContract.totalSupplyOfYsCvgAt(CYCLE_12);

        expect(allRewards).to.be.deep.eq([
            [
                "1",
                false,
                [
                    [await sdt.getAddress(), (sdtAmountTDE1 * balanceToken1) / totalSupplyToken1],
                    [await crv.getAddress(), (crvAmountTDE1 * balanceToken1) / totalSupplyToken1],
                    [await weth.getAddress(), (wethAmountTDE1 * balanceToken1) / totalSupplyToken1],
                    [await usdc.getAddress(), (usdcAmountTDE1 * balanceToken1) / totalSupplyToken1],
                ],
            ],
        ]);
    });

    //81655
    it("Success : Deposit multiple tokens for TDE1 at cycle12 should compute right infos", async () => {
        const sdtAmount = ethers.parseEther("10");
        const crvAmount = ethers.parseEther("5");
        const wethAmount = ethers.parseEther("15");
        const usdcAmount = ethers.parseUnits("5000", 6);

        const sdtCrvTotalAmount = ethers.parseEther("15");
        const wethTotalAmount = ethers.parseEther("30");
        const usdcTotalAmount = ethers.parseUnits("10000", 6);

        const depositStruct: IYsDistributor.TokenAmountStruct[] = [
            {token: sdt, amount: sdtAmount},
            {token: crv, amount: crvAmount},
            {token: weth, amount: wethAmount},
            {token: usdc, amount: usdcAmount},
        ];
        await ysdistributor.connect(treasuryPdd).depositMultipleToken(depositStruct);

        expect(await ysdistributor.getAllRewardsForTde(TDE_1)).to.be.deep.eq([
            [await sdt.getAddress(), sdtAmount + sdtAmountTDE1],
            [await crv.getAddress(), crvAmount + crvAmountTDE1],
            [await weth.getAddress(), wethAmount + wethAmountTDE1],
            [await usdc.getAddress(), usdcAmount + usdcAmountTDE1],
        ]);

        expect(await sdt.balanceOf(ysdistributor)).to.be.equal(sdtCrvTotalAmount);
        expect(await crv.balanceOf(ysdistributor)).to.be.equal(sdtCrvTotalAmount);
        expect(await weth.balanceOf(ysdistributor)).to.be.equal(wethTotalAmount);
        expect(await usdc.balanceOf(ysdistributor)).to.be.equal(usdcTotalAmount);
    });

    it("Success : Increase to cycle 13 (TDE 1)", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });

    it("Success : Success : Get rewards with batched view function", async () => {
        const allRewards = await ysdistributor.getPositionRewardsForTdes([TDE_1, TDE_2], CYCLE_13, TOKEN_1);
        expect(allRewards.length).to.be.eq(1);
        expect(allRewards[0].tdeCycle).to.be.eq(1);

        expect(ethers.getAddress(allRewards[0].tokenAmounts[0].token)).to.be.eq(await sdt.getAddress());
        expect(allRewards[0].tokenAmounts[0].amount).to.be.eq("11250000000000000000");

        expect(ethers.getAddress(allRewards[0].tokenAmounts[1].token)).to.be.eq(await crv.getAddress());
        expect(allRewards[0].tokenAmounts[1].amount).to.be.eq("11250000000000000000");

        expect(ethers.getAddress(allRewards[0].tokenAmounts[2].token)).to.be.eq(await weth.getAddress());
        expect(allRewards[0].tokenAmounts[2].amount).to.be.eq("22500000000000000000");

        expect(ethers.getAddress(allRewards[0].tokenAmounts[3].token)).to.be.eq(await usdc.getAddress());
        expect(allRewards[0].tokenAmounts[3].amount).to.be.eq("7500000000");
    });

    //81655
    const sdtAmountTDE2 = ethers.parseEther("5");
    const crvAmountTDE2 = ethers.parseEther("10");
    it("Success : Deposit multiple tokens for TDE2 at cycle13 should compute right infos", async () => {
        const sdtTotalAmount = ethers.parseEther("20");
        const crvTotalAmount = ethers.parseEther("25");

        const depositStruct: IYsDistributor.TokenAmountStruct[] = [
            {token: sdt, amount: sdtAmountTDE2},
            {token: crv, amount: crvAmountTDE2},
        ];
        await ysdistributor.connect(treasuryPdd).depositMultipleToken(depositStruct);

        expect(await ysdistributor.getAllRewardsForTde(TDE_2)).to.be.deep.eq([
            [await sdt.getAddress(), sdtAmountTDE2],
            [await crv.getAddress(), crvAmountTDE2],
        ]);

        expect(await sdt.balanceOf(ysdistributor)).to.be.equal(sdtTotalAmount);
        expect(await crv.balanceOf(ysdistributor)).to.be.equal(crvTotalAmount);
    });

    it("User1 Claim tokens at TDE1", async () => {
        const allRewards = await ysdistributor.getPositionRewardsForTdes([1], CYCLE_13, TOKEN_1);
        const amountSdt = allRewards[0].tokenAmounts[0].amount;
        const amountCrv = allRewards[0].tokenAmounts[1].amount;
        const amountWeth = allRewards[0].tokenAmounts[2].amount;
        const amountUsdc = allRewards[0].tokenAmounts[3].amount;
        const sdtBalance = await sdt.balanceOf(user1);
        const crvBalance = await crv.balanceOf(user1);
        const wethBalance = await weth.balanceOf(user1);
        const usdcBalance = await usdc.balanceOf(user1);

        await ysdistributor.connect(user1).claimRewards(TOKEN_1, 1, user1);

        const totalSupply = await lockingPositionServiceContract.totalSupplyYsCvgHistories(CYCLE_12);
        const balanceYs = await lockingPositionServiceContract.balanceOfYsCvgAt(TOKEN_1, CYCLE_12);

        const usdcAmount = ethers.parseUnits("10000", 6);
        const totalAmount = ethers.parseEther("15");
        const wethAmount = ethers.parseEther("30");

        let calc = (totalAmount * balanceYs) / totalSupply;
        let calc_weth = (wethAmount * balanceYs) / totalSupply;
        let calc_usdc = (usdcAmount * balanceYs) / totalSupply;

        expect(await sdt.balanceOf(user1)).to.be.equal(calc + sdtBalance);
        expect(await crv.balanceOf(user1)).to.be.equal(calc + crvBalance);
        expect(await weth.balanceOf(user1)).to.be.equal(calc_weth + wethBalance);
        expect(await usdc.balanceOf(user1)).to.be.equal(calc_usdc + usdcBalance);
        expect(amountSdt).to.be.equal(calc);
        expect(amountCrv).to.be.equal(calc);
        expect(amountWeth).to.be.equal(calc_weth);
        expect(amountUsdc).to.be.equal(calc_usdc);
    });

    it("Success : Get all token rewards should remove already claimed cycle", async () => {
        const allRewards = await ysdistributor.getPositionRewardsForTdes([TDE_1, TDE_2], 25, TOKEN_1);
        expect(allRewards.length).to.be.eq(2);
    });

    it("Success : User2 Claim tokens at TDE1", async () => {
        const allRewards = await ysdistributor.getPositionRewardsForTdes([TDE_1], 13, TOKEN_2);
        const amountSdt = allRewards[0].tokenAmounts[0].amount;
        const amountCrv = allRewards[0].tokenAmounts[1].amount;
        const amountWeth = allRewards[0].tokenAmounts[2].amount;

        const sdtBalance = await sdt.balanceOf(user2);
        const crvBalance = await crv.balanceOf(user2);
        const wethBalance = await weth.balanceOf(user2);
        await ysdistributor.connect(user2).claimRewards(TOKEN_2, 1, user2);

        const totalAmount = ethers.parseEther("15");
        const wethAmount = ethers.parseEther("30");

        const totalSupply = await lockingPositionServiceContract.totalSupplyYsCvgHistories(CYCLE_12);
        const balanceYs = await lockingPositionServiceContract.balanceOfYsCvgAt(TOKEN_2, CYCLE_12);

        let calc = (totalAmount * balanceYs) / totalSupply;
        let calc_weth = (wethAmount * balanceYs) / totalSupply;

        expect(await sdt.balanceOf(user2)).to.be.equal(calc + sdtBalance);
        expect(await crv.balanceOf(user2)).to.be.equal(calc + crvBalance);
        expect(await weth.balanceOf(user2)).to.be.equal(calc_weth + wethBalance);
        expect(amountSdt).to.be.equal(calc);
        expect(amountCrv).to.be.equal(calc);
        expect(amountWeth).to.be.equal(calc_weth);
    });

    it("Success : Increase to cycle 24 (TDE 1)", async () => {
        await increaseCvgCycle(contractsUsers, 11);
    });

    it("Success : Deposit multiple tokens for TDE2 at cycle24 should compute right infos", async () => {
        const sdtAmount = ethers.parseEther("10");
        const crvAmount = ethers.parseEther("5");
        const totalAmount = ethers.parseEther("15");

        const depositStruct: IYsDistributor.TokenAmountStruct[] = [
            {token: sdt, amount: sdtAmount},
            {token: crv, amount: crvAmount},
        ];
        await ysdistributor.connect(treasuryPdd).depositMultipleToken(depositStruct);

        expect(await ysdistributor.getAllRewardsForTde(TDE_2)).to.be.deep.eq([
            [await sdt.getAddress(), sdtAmount + sdtAmountTDE2],
            [await crv.getAddress(), crvAmount + crvAmountTDE2],
        ]);
    });

    it("Success : Get all token rewards should remove already claimed cycle", async () => {
        const allRewards1 = await ysdistributor.getPositionRewardsForTdes([TDE_1, TDE_2], 24, TOKEN_1);
        expect(allRewards1.length).to.be.eq(1);

        const allRewards2 = await ysdistributor.getPositionRewardsForTdes([TDE_1, TDE_2], 24, TOKEN_2);
        expect(allRewards2.length).to.be.eq(1);
    });

    it("Increase to cycle 25 (TDE 2)", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });

    it("Success : Get all token rewards should display only the cycle available to claim and not empty", async () => {
        const allRewards1 = await ysdistributor.getPositionRewardsForTdes([TDE_1, TDE_2], 25, TOKEN_1);
        expect(allRewards1.length).to.be.eq(2);
        expect(allRewards1[0].tdeCycle).to.be.eq(1);
        const allRewards2 = await ysdistributor.getPositionRewardsForTdes([TDE_1, TDE_2], 25, TOKEN_2);
        expect(allRewards2[0].tdeCycle).to.be.eq(1);
    });

    it("User1 Claim tokens at TDE2", async () => {
        const allRewards = await ysdistributor.getPositionRewardsForTdes([2], 25, TOKEN_1);
        const amountSdt = allRewards[0].tokenAmounts[0].amount;
        const amountCrv = allRewards[0].tokenAmounts[1].amount;
        const sdtBalance = await sdt.balanceOf(user1);
        const crvBalance = await crv.balanceOf(user1);

        await ysdistributor.connect(user1).claimRewards(TOKEN_1, 2, user1);

        const totalSupply = await lockingPositionServiceContract.totalSupplyYsCvgHistories(CYCLE_24);
        const balanceYs = await lockingPositionServiceContract.balanceOfYsCvgAt(TOKEN_1, CYCLE_24);

        const totalAmount = ethers.parseEther("15");
        let calc = (totalAmount * balanceYs) / totalSupply;

        expect(await sdt.balanceOf(user1)).to.be.equal(sdtBalance + calc);
        expect(await crv.balanceOf(user1)).to.be.equal(crvBalance + calc);
        expect(amountSdt).to.be.equal(calc);
        expect(amountCrv).to.be.equal(calc);
    });

    it("Success : Get all token rewards ", async () => {
        const allRewards1 = await ysdistributor.getPositionRewardsForTdes([TDE_1, TDE_2], 25, TOKEN_1);
        expect(allRewards1.length).to.be.eq(2);
        const allRewards2 = await ysdistributor.getPositionRewardsForTdes([TDE_1, TDE_2], 25, TOKEN_2);
        expect(allRewards2[0].tdeCycle).to.be.eq(1);
    });

    it("User2 Claim tokens at TDE2", async () => {
        const allRewards = await ysdistributor.getPositionRewardsForTdes([TDE_2], 25, TOKEN_2);
        const amountSdt = allRewards[0].tokenAmounts[0].amount;
        const amountCrv = allRewards[0].tokenAmounts[1].amount;

        const sdtBalance = await sdt.balanceOf(user2);
        const crvBalance = await crv.balanceOf(user2);

        await ysdistributor.connect(user2).claimRewards(TOKEN_2, 2, user2);

        const totalSupply = await lockingPositionServiceContract.totalSupplyYsCvgHistories(CYCLE_24);
        const balanceYs = await lockingPositionServiceContract.balanceOfYsCvgAt(TOKEN_2, CYCLE_24);
        const totalAmount = ethers.parseEther("15");
        const calc = (totalAmount * balanceYs) / totalSupply;

        expect(await sdt.balanceOf(user2)).to.be.equal(sdtBalance + calc);
        expect(await crv.balanceOf(user2)).to.be.equal(crvBalance + calc);
        expect(amountSdt).to.be.equal(calc);
        expect(amountCrv).to.be.equal(calc);
    });

    // //////////////////////////REVERTED//////////////////////////<<
    it("Fails : if one deposit transfer failed, all tx is reverted", async () => {
        const crvAmount = ethers.parseEther("200000");
        const totalAmount = ethers.parseEther("15");

        const depositStruct: IYsDistributor.TokenAmountStruct[] = [
            {token: usdc, amount: crvAmount},
            {token: weth, amount: crvAmount},
        ];
        await ysdistributor.connect(treasuryPdd).depositMultipleToken(depositStruct).should.be.revertedWith("ERC20: transfer amount exceeds balance");

        expect(await ysdistributor.getAllRewardsForTde(TDE_2)).to.be.deep.eq([
            [await sdt.getAddress(), totalAmount],
            [await crv.getAddress(), totalAmount],
        ]);
    });

    it("Deposit is called by another wallet should be reverted", async () => {
        const sdtAmount = ethers.parseEther("10");
        const crvAmount = ethers.parseEther("100");

        const depositStruct: IYsDistributor.TokenAmountStruct[] = [
            {token: sdt, amount: sdtAmount},
            {token: crv, amount: crvAmount},
        ];
        await ysdistributor.connect(owner).depositMultipleToken(depositStruct).should.be.revertedWith("NOT_TREASURY_PDD");
    });
});
