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
import {CYCLE_1, CYCLE_12, CYCLE_24, TDE_1, TDE_2, TDE_3, TDE_4, TOKEN_1, TOKEN_2, TOKEN_3} from "../../../resources/constant";
import {IYsDistributor, YsDistributor} from "../../../typechain-types";

describe("YsDistributor : Claim after a lock expired", () => {
    let ysdistributor: YsDistributor, treasuryPdd: Signer, treasuryDao: Signer;
    let dai: ERC20, weth: ERC20, crv: ERC20, usdc: ERC20, sdt: ERC20, usdt: ERC20;
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
        usdt = tokens.usdt;

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
        await usdt.connect(treasuryPdd).approve(ysdistributor, MaxUint256);

        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();

        await sdt.connect(users.user7).transfer(treasuryPdd, ethers.parseUnits("10000000", 18));
        await crv.connect(users.user7).transfer(treasuryPdd, ethers.parseUnits("10000000", 18));
        await weth.connect(users.user7).transfer(treasuryPdd, ethers.parseUnits("10000000", 18));
        await usdc.connect(users.user7).transfer(treasuryPdd, ethers.parseUnits("10000000", 6));
        await usdt.connect(users.user7).transfer(treasuryPdd, ethers.parseUnits("10000000", 6));
    });
    const sdtAmountTDE1 = ethers.parseEther("5");
    const crvAmountTDE1 = ethers.parseEther("10");
    const wethAmountTDE1 = ethers.parseEther("15");
    const usdcAmountTDE1 = ethers.parseUnits("5000", 6);

    it("Success : Deposit multiple tokens for TDE1 at cycle1 ", async () => {
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

    it("Success : Mint position user1 at cycle 1", async () => {
        const amountCvgUser1 = ethers.parseEther("75");
        await (await cvgContract.connect(user1).approve(lockingPositionServiceContract, amountCvgUser1)).wait();
        await (await lockingPositionServiceContract.connect(user1).mintPosition(23, amountCvgUser1, 100, user1, true)).wait(); // Lock 75 CVG for 43 cycles
    });

    it("Success : Go on cycle 24", async () => {
        await increaseCvgCycle(contractsUsers, 23);
    });
    const sdtAmountTDE2 = 1n;
    const crvAmountTDE2 = ethers.parseEther("10");
    const wethAmountTDE2 = ethers.parseEther("6000");
    const usdcAmountTDE2 = ethers.parseUnits("5000", 6);
    const usdtAmountTDE2 = ethers.parseUnits("158000", 6);
    it("Success : Deposit multiple tokens for TDE2 at CYCLE_24 ", async () => {
        const depositStruct: IYsDistributor.TokenAmountStruct[] = [
            {token: sdt, amount: sdtAmountTDE2},
            {token: crv, amount: crvAmountTDE2},
            {token: weth, amount: wethAmountTDE2},
            {token: usdc, amount: usdcAmountTDE2},
            {token: usdt, amount: usdtAmountTDE2},
        ];
        await ysdistributor.connect(treasuryPdd).depositMultipleToken(depositStruct);

        expect(await ysdistributor.getAllRewardsForTde(TDE_2)).to.be.deep.eq([
            [await sdt.getAddress(), sdtAmountTDE2],
            [await crv.getAddress(), crvAmountTDE2],
            [await weth.getAddress(), wethAmountTDE2],
            [await usdc.getAddress(), usdcAmountTDE2],
            [await usdt.getAddress(), usdtAmountTDE2],
        ]);
        await ysdistributor.connect(treasuryPdd).depositMultipleToken([{token: sdt, amount: sdtAmountTDE2}]);
        await ysdistributor.connect(treasuryPdd).depositMultipleToken([
            {token: weth, amount: wethAmountTDE2},
            {token: usdc, amount: usdcAmountTDE2},
        ]);

        expect(await sdt.balanceOf(ysdistributor)).to.be.equal(sdtAmountTDE1 + 2n * sdtAmountTDE2);
        expect(await crv.balanceOf(ysdistributor)).to.be.equal(crvAmountTDE1 + crvAmountTDE2);
        expect(await weth.balanceOf(ysdistributor)).to.be.equal(wethAmountTDE1 + 2n * wethAmountTDE2);
        expect(await usdc.balanceOf(ysdistributor)).to.be.equal(usdcAmountTDE1 + 2n * usdcAmountTDE2);
        expect(await usdt.balanceOf(ysdistributor)).to.be.equal(usdtAmountTDE2);
    });

    it("Success : Go on cycle 36 after lock expired", async () => {
        await increaseCvgCycle(contractsUsers, 12);
    });

    it("Success : Claim on a position not locked anymore and claim", async () => {
        const allRewards = await ysdistributor.getPositionRewardsForTdes([TDE_2], 36, TOKEN_1);
        const claimTde2 = ysdistributor.connect(user1).claimRewards(TOKEN_1, TDE_2, user2);
        await expect(claimTde2).to.changeTokenBalances(sdt, [ysdistributor, user2], [-2n * sdtAmountTDE2, 2n * sdtAmountTDE2]);
        await expect(claimTde2).to.changeTokenBalances(crv, [ysdistributor, user2], [-crvAmountTDE2, crvAmountTDE2]);
        await expect(claimTde2).to.changeTokenBalances(weth, [ysdistributor, user2], [-2n * wethAmountTDE2, 2n * wethAmountTDE2]);
        await expect(claimTde2).to.changeTokenBalances(usdc, [ysdistributor, user2], [-2n * usdcAmountTDE2, 2n * usdcAmountTDE2]);
        await expect(claimTde2).to.changeTokenBalances(usdt, [ysdistributor, user2], [-usdtAmountTDE2, usdtAmountTDE2]);

        expect(allRewards).to.be.deep.eq([
            [
                TDE_2,
                false,
                [
                    [await sdt.getAddress(), 2n * sdtAmountTDE2],
                    [await crv.getAddress(), crvAmountTDE2],
                    [await weth.getAddress(), 2n * wethAmountTDE2],
                    [await usdc.getAddress(), 2n * usdcAmountTDE2],
                    [await usdt.getAddress(), usdtAmountTDE2],
                ],
            ],
        ]);

        const claimTde1 = ysdistributor.connect(user1).claimRewards(TOKEN_1, TDE_1, user2);
        await expect(claimTde1).to.changeTokenBalances(sdt, [ysdistributor, user2], [-sdtAmountTDE1, sdtAmountTDE1]);
        await expect(claimTde1).to.changeTokenBalances(crv, [ysdistributor, user2], [-crvAmountTDE1, crvAmountTDE1]);
        await expect(claimTde1).to.changeTokenBalances(weth, [ysdistributor, user2], [-wethAmountTDE1, wethAmountTDE1]);
        await expect(claimTde1).to.changeTokenBalances(usdc, [ysdistributor, user2], [-usdcAmountTDE1, usdcAmountTDE1]);
        await expect(claimTde1).to.changeTokenBalances(usdt, [ysdistributor, user2], [0, 0]);
    });
});
