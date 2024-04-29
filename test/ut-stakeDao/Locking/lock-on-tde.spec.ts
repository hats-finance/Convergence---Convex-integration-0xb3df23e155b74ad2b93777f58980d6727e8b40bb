import {expect} from "chai";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {ethers} from "hardhat";
import {IContracts, IContractsUser, IUsers} from "../../../utils/contractInterface";
import {PositionLocker} from "../../../typechain-types/contracts/mocks";
import {LockingPositionDelegate, LockingPositionService} from "../../../typechain-types/contracts/Locking";
import {Signer, ZeroAddress} from "ethers";
import {Cvg} from "../../../typechain-types/contracts/Token";
import {CvgControlTower} from "../../../typechain-types/contracts";
import {YsDistributor} from "../../../typechain-types/contracts/Rewards";
import {
    CYCLE_108,
    CYCLE_12,
    CYCLE_120,
    CYCLE_132,
    CYCLE_144,
    CYCLE_156,
    CYCLE_24,
    CYCLE_36,
    CYCLE_48,
    CYCLE_60,
    CYCLE_72,
    CYCLE_84,
    CYCLE_96,
    TDE_1,
    TDE_2,
    TOKEN_1,
    TOKEN_2,
    TOKEN_3,
    TOKEN_4,
} from "../../../resources/constant";
import {ERC20, ISdAsset} from "../../../typechain-types";

describe("LockingPositionManager : Lock on TDE", () => {
    let lockingPositionService: LockingPositionService,
        cvgContract: Cvg,
        controlTowerContract: CvgControlTower,
        positionLocker: PositionLocker,
        ysdistributor: YsDistributor;

    let crv: ERC20, cvx: ERC20, usdc: ERC20, sdt: ERC20, sdCrv: ISdAsset;
    let contractUsers: IContractsUser, contracts: IContracts, users: IUsers;
    let user1: Signer, user2: Signer, treasuryPdd: Signer, treasuryDao: Signer;

    let totalSupply12 = 0n,
        totalSupply24: bigint,
        totalSupply36: bigint,
        totalSupply48: bigint,
        totalSupply60: bigint,
        totalSupply72: bigint,
        totalSupply84: bigint,
        totalSupply96: bigint,
        totalSupply108: bigint,
        totalSupply120: bigint,
        totalSupply132: bigint,
        totalSupply144: bigint,
        totalSupply156: bigint;
    before(async () => {
        contractUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractUsers.contracts;
        users = contractUsers.users;

        lockingPositionService = contracts.locking.lockingPositionService;
        cvgContract = contracts.tokens.cvg;
        controlTowerContract = contracts.base.cvgControlTower;
        positionLocker = contracts.tests.positionLocker;
        ysdistributor = contracts.rewards.ysDistributor;

        user1 = users.user1;
        user2 = users.user2;
        treasuryDao = users.treasuryDao;
        treasuryPdd = users.treasuryPdd;

        const tokens = contracts.tokens;

        sdCrv = contracts.tokensStakeDao.sdCrv;
        crv = tokens.crv;
        cvx = tokens.cvx;
        sdt = tokens.sdt;
        usdc = tokens.usdc;
        sdt = tokens.sdt;

        await sdCrv.transfer(treasuryPdd, ethers.parseEther("10000000"));
        await crv.transfer(treasuryPdd, ethers.parseEther("10000000"));
        await cvx.transfer(treasuryPdd, ethers.parseEther("10000000"));
        await sdt.transfer(treasuryPdd, ethers.parseEther("10000000"));
        await usdc.transfer(treasuryPdd, ethers.parseUnits("10000000", 6));
        await sdt.transfer(treasuryPdd, ethers.parseEther("10000000"));

        await sdCrv.connect(treasuryPdd).approve(ysdistributor, ethers.parseEther("10000000"));
        await crv.connect(treasuryPdd).approve(ysdistributor, ethers.parseEther("10000000"));
        await cvx.connect(treasuryPdd).approve(ysdistributor, ethers.parseEther("10000000"));
        await sdt.connect(treasuryPdd).approve(ysdistributor, ethers.parseEther("10000000"));
        await usdc.connect(treasuryPdd).approve(ysdistributor, ethers.parseUnits("10000000", 6));
        await sdt.connect(treasuryPdd).approve(ysdistributor, ethers.parseEther("10000000"));

        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(positionLocker, ethers.parseEther("100000"))).wait();

        await (await cvgContract.connect(user2).approve(lockingPositionService, ethers.MaxUint256)).wait();
        await (await cvgContract.connect(user1).approve(lockingPositionService, ethers.MaxUint256)).wait();
    });

    it("Success: Increase cycle to 12", async () => {
        await increaseCvgCycle(contractUsers, 11);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(12);
    });

    const amount166 = ethers.parseEther("166");
    const amount1243 = ethers.parseEther("1243");
    const amount333 = ethers.parseEther("333");

    let ysTotalAmountMintToken1 = (amount166 * 12n * 50n) / (96n * 100n);
    let ysTotalAmountMintToken2 = (amount1243 * 96n * 10n) / (96n * 100n);
    let ysTotalAmountMintToken3 = (amount333 * 48n * 100n) / (96n * 100n);

    it("Success: Lock several tokens on a TDE", async () => {
        await (await lockingPositionService.connect(user1).mintPosition(12, amount166, 50, user1, true)).wait();
        await (await lockingPositionService.connect(user1).mintPosition(96, amount1243, 10, user1, true)).wait();
        await (await lockingPositionService.connect(user1).mintPosition(48, amount333, 100, user1, true)).wait();
        totalSupply24 = ysTotalAmountMintToken1 + ysTotalAmountMintToken2 + ysTotalAmountMintToken3;
        totalSupply36 = ysTotalAmountMintToken2 + ysTotalAmountMintToken3;
        totalSupply48 = ysTotalAmountMintToken2 + ysTotalAmountMintToken3;
        totalSupply60 = ysTotalAmountMintToken2 + ysTotalAmountMintToken3;
        totalSupply72 = ysTotalAmountMintToken2;
        totalSupply84 = ysTotalAmountMintToken2;
        totalSupply96 = ysTotalAmountMintToken2;
        totalSupply108 = ysTotalAmountMintToken2;

        // Total Supply Ys

        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24)).to.be.eq(totalSupply24);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36)).to.be.eq(totalSupply36);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48)).to.be.eq(totalSupply48);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(0);

        // Balance Ys

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_12)).to.be.eq(0);

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_24)).to.be.eq(ysTotalAmountMintToken1);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_24)).to.be.eq(ysTotalAmountMintToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_24)).to.be.eq(ysTotalAmountMintToken3);

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_36)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_36)).to.be.eq(ysTotalAmountMintToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_36)).to.be.eq(ysTotalAmountMintToken3);

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_48)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_48)).to.be.eq(ysTotalAmountMintToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_48)).to.be.eq(ysTotalAmountMintToken3);

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_60)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_60)).to.be.eq(ysTotalAmountMintToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_60)).to.be.eq(ysTotalAmountMintToken3);

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_72)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_72)).to.be.eq(ysTotalAmountMintToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_72)).to.be.eq(0);

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_84)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_84)).to.be.eq(ysTotalAmountMintToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_84)).to.be.eq(0);

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_96)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_96)).to.be.eq(ysTotalAmountMintToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_96)).to.be.eq(0);

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_108)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_108)).to.be.eq(ysTotalAmountMintToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_108)).to.be.eq(0);

        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_120)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_120)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_120)).to.be.eq(0);
    });

    const amountFirstIncreaseCvgToken1 = ethers.parseEther("7883.333333333");
    const ysAmountFirstIncreaseToken1 = (amountFirstIncreaseCvgToken1 * 12n * 50n) / (96n * 100n);
    it("Success: Increase amount of token 1 at cycle 12, total lock is still < TDE", async () => {
        await (await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_1, amountFirstIncreaseCvgToken1, ZeroAddress)).wait();

        totalSupply24 += ysAmountFirstIncreaseToken1;

        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24)).to.be.eq(totalSupply24);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36)).to.be.eq(totalSupply36);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48)).to.be.eq(totalSupply48);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(0);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_24)).to.be.eq(ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_36)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_48)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_60)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_72)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_84)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_96)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_108)).to.be.eq(0);
    });

    const amountSecondIncreaseCvgToken1 = ethers.parseEther("50");
    const ysAmountSecondIncreaseToken1 = (amountSecondIncreaseCvgToken1 * 96n * 50n) / (96n * 100n);
    it("Success: Increase Time & amount of token 1 at cycle 12 to maxTime", async () => {
        await (await lockingPositionService.connect(user1).increaseLockTimeAndAmount(TOKEN_1, 84, amountSecondIncreaseCvgToken1, ZeroAddress)).wait();

        totalSupply24 += ysAmountSecondIncreaseToken1;
        totalSupply36 += ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1;
        totalSupply48 += ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1;
        totalSupply60 += ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1;
        totalSupply72 += ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1;
        totalSupply84 += ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1;
        totalSupply96 += ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1;
        totalSupply108 += ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1;

        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24)).to.be.eq(totalSupply24);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36)).to.be.eq(totalSupply36);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48)).to.be.eq(totalSupply48);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(0);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_24)).to.be.eq(
            ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_36)).to.be.eq(
            ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_48)).to.be.eq(
            ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_60)).to.be.eq(
            ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_72)).to.be.eq(
            ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_84)).to.be.eq(
            ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_96)).to.be.eq(
            ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_1, CYCLE_108)).to.be.eq(
            ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1
        );
    });

    it("Success: Increase cycle to 24", async () => {
        await increaseCvgCycle(contractUsers, 12);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(24);
    });
    const amountSdCrvDistributedTde1 = ethers.parseEther("1000");
    const amountCrvDistributedTde1 = ethers.parseEther("1000");
    const amountCvxDistributedTde1 = ethers.parseEther("1000");

    it("Success: Distribute PDD rewards to YsDistributor", async () => {
        await ysdistributor.connect(treasuryPdd).depositMultipleToken([
            {token: sdCrv, amount: amountSdCrvDistributedTde1},
            {token: crv, amount: amountCrvDistributedTde1},
            {token: cvx, amount: amountCvxDistributedTde1},
        ]);
    });

    const amountFirstIncreaseCvgToken2 = ethers.parseEther("200");
    const ysAmountFirstIncreaseToken2 = (amountFirstIncreaseCvgToken2 * 84n * 10n) / (96n * 100n);
    it("Success: Increase amount of token 2 at cycle 24", async () => {
        await (await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_2, amountFirstIncreaseCvgToken2, ZeroAddress)).wait();

        totalSupply36 += ysAmountFirstIncreaseToken2;
        totalSupply48 += ysAmountFirstIncreaseToken2;
        totalSupply60 += ysAmountFirstIncreaseToken2;
        totalSupply72 += ysAmountFirstIncreaseToken2;
        totalSupply84 += ysAmountFirstIncreaseToken2;
        totalSupply96 += ysAmountFirstIncreaseToken2;
        totalSupply108 += ysAmountFirstIncreaseToken2;

        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24)).to.be.eq(totalSupply24);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36)).to.be.eq(totalSupply36);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48)).to.be.eq(totalSupply48);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(0);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_24)).to.be.eq(ysTotalAmountMintToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_36)).to.be.eq(ysTotalAmountMintToken2 + ysAmountFirstIncreaseToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_48)).to.be.eq(ysTotalAmountMintToken2 + ysAmountFirstIncreaseToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_60)).to.be.eq(ysTotalAmountMintToken2 + ysAmountFirstIncreaseToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_72)).to.be.eq(ysTotalAmountMintToken2 + ysAmountFirstIncreaseToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_84)).to.be.eq(ysTotalAmountMintToken2 + ysAmountFirstIncreaseToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_96)).to.be.eq(ysTotalAmountMintToken2 + ysAmountFirstIncreaseToken2);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_2, CYCLE_108)).to.be.eq(ysTotalAmountMintToken2 + ysAmountFirstIncreaseToken2);
    });

    it("Success: Increase cycle to 25", async () => {
        await increaseCvgCycle(contractUsers, 1);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(25);
    });

    it("Success: Claim Ys rewards on Token 1", async () => {
        const token1YsBalance = ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1;

        const sdCrvAmount = (amountSdCrvDistributedTde1 * token1YsBalance) / totalSupply24;
        const crvAmount = (amountCrvDistributedTde1 * token1YsBalance) / totalSupply24;
        const cvxAmount = (amountSdCrvDistributedTde1 * token1YsBalance) / totalSupply24;

        const claim = ysdistributor.connect(user1).claimRewards(TOKEN_1, TDE_2, user1);
        await claim;
        await expect(claim).to.changeTokenBalances(sdCrv, [ysdistributor, user1], [-sdCrvAmount, sdCrvAmount]);
        await expect(claim).to.changeTokenBalances(crv, [ysdistributor, user1], [-crvAmount, crvAmount]);
        await expect(claim).to.changeTokenBalances(cvx, [ysdistributor, user1], [-cvxAmount, cvxAmount]);
    });

    it("Success: Claim Ys rewards on Token 2", async () => {
        const token2YsBalance = ysTotalAmountMintToken2;

        const sdCrvAmount = (amountSdCrvDistributedTde1 * token2YsBalance) / totalSupply24;
        const crvAmount = (amountCrvDistributedTde1 * token2YsBalance) / totalSupply24;
        const cvxAmount = (amountSdCrvDistributedTde1 * token2YsBalance) / totalSupply24;

        const claim = ysdistributor.connect(user1).claimRewards(TOKEN_2, TDE_2, user2);
        await claim;

        await expect(claim).to.changeTokenBalances(sdCrv, [ysdistributor, user2], [-sdCrvAmount, sdCrvAmount]);
        await expect(claim).to.changeTokenBalances(crv, [ysdistributor, user2], [-crvAmount, crvAmount]);
        await expect(claim).to.changeTokenBalances(cvx, [ysdistributor, user2], [-cvxAmount, cvxAmount]);
    });

    it("Success: Claim Ys rewards on Token 3", async () => {
        const token3YsBalance = ysTotalAmountMintToken3;

        const sdCrvAmount = (amountSdCrvDistributedTde1 * token3YsBalance) / totalSupply24;
        const crvAmount = (amountCrvDistributedTde1 * token3YsBalance) / totalSupply24;
        const cvxAmount = (amountSdCrvDistributedTde1 * token3YsBalance) / totalSupply24;

        const claim = ysdistributor.connect(user1).claimRewards(TOKEN_3, TDE_2, user1);
        await claim;

        await expect(claim).to.changeTokenBalances(sdCrv, [ysdistributor, user1], [-sdCrvAmount, sdCrvAmount]);
        await expect(claim).to.changeTokenBalances(crv, [ysdistributor, user1], [-crvAmount, crvAmount]);
        await expect(claim).to.changeTokenBalances(cvx, [ysdistributor, user1], [-cvxAmount, cvxAmount]);
    });

    it("Success: Increase cycle to 35", async () => {
        await increaseCvgCycle(contractUsers, 10);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(35);
    });

    const amountFirstIncreaseCvgToken3 = ethers.parseEther("111.111");
    const partialYsAmountFirstIncreaseToken3 = (amountFirstIncreaseCvgToken3 * 1n * 25n * 100n) / (12n * 96n * 100n);
    const totalYsAmountFirstIncreaseToken3 = (amountFirstIncreaseCvgToken3 * 25n * 100n) / (96n * 100n);
    it("Success: Increase amount of token 3 at cycle 35", async () => {
        await (await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_3, amountFirstIncreaseCvgToken3, ZeroAddress)).wait();

        totalSupply36 += partialYsAmountFirstIncreaseToken3;
        totalSupply48 += totalYsAmountFirstIncreaseToken3;
        totalSupply60 += totalYsAmountFirstIncreaseToken3;

        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24)).to.be.eq(totalSupply24);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36)).to.be.eq(totalSupply36);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48)).to.be.eq(totalSupply48);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(0);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_24)).to.be.eq(ysTotalAmountMintToken3);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_36)).to.be.eq(ysTotalAmountMintToken3 + partialYsAmountFirstIncreaseToken3);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_48)).to.be.eq(ysTotalAmountMintToken3 + totalYsAmountFirstIncreaseToken3);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_60)).to.be.eq(ysTotalAmountMintToken3 + totalYsAmountFirstIncreaseToken3);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_72)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_84)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_96)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_108)).to.be.eq(0);
    });

    const amountSecondIncreaseCvgToken3 = ethers.parseEther("10000");
    const partialYsAmountSecondIncreaseToken3 = (amountSecondIncreaseCvgToken3 * 1n * 37n * 100n) / (12n * 96n * 100n);
    const totalYsAmountSecondIncreaseToken3 = (amountSecondIncreaseCvgToken3 * 37n * 100n) / (96n * 100n);
    it("Success: Increase amount of token 3 at cycle 35 and extends the Ys", async () => {
        await (await lockingPositionService.connect(user1).increaseLockTimeAndAmount(TOKEN_3, 12, amountSecondIncreaseCvgToken3, ZeroAddress)).wait();

        totalSupply36 += partialYsAmountSecondIncreaseToken3;
        totalSupply48 += totalYsAmountSecondIncreaseToken3;
        totalSupply60 += totalYsAmountSecondIncreaseToken3;
        totalSupply72 += ysTotalAmountMintToken3 + totalYsAmountFirstIncreaseToken3 + totalYsAmountSecondIncreaseToken3;

        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_24)).to.be.eq(totalSupply24);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_36)).to.be.eq(totalSupply36);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_48)).to.be.eq(totalSupply48);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(0);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_12)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_24)).to.be.eq(ysTotalAmountMintToken3);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_36)).to.be.eq(
            ysTotalAmountMintToken3 + partialYsAmountFirstIncreaseToken3 + partialYsAmountSecondIncreaseToken3
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_48)).to.be.eq(
            ysTotalAmountMintToken3 + totalYsAmountFirstIncreaseToken3 + totalYsAmountSecondIncreaseToken3
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_60)).to.be.eq(
            ysTotalAmountMintToken3 + totalYsAmountFirstIncreaseToken3 + totalYsAmountSecondIncreaseToken3
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_72)).to.be.eq(
            ysTotalAmountMintToken3 + totalYsAmountFirstIncreaseToken3 + totalYsAmountSecondIncreaseToken3
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_84)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_96)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_3, CYCLE_108)).to.be.eq(0);
    });

    it("Success: Increase cycle to 60", async () => {
        await increaseCvgCycle(contractUsers, 25);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(60);
    });

    const amountCvgMintToken4 = ethers.parseEther("0.005");
    const ysTotalAmountMintToken4 = (amountCvgMintToken4 * 48n * 70n) / (96n * 100n);
    it("Success: Mint token 4 at cycle 60 for 48 cycles", async () => {
        await (await lockingPositionService.connect(user1).mintPosition(48, amountCvgMintToken4, 70n, user1, true)).wait();

        totalSupply72 += ysTotalAmountMintToken4;
        totalSupply84 += ysTotalAmountMintToken4;
        totalSupply96 += ysTotalAmountMintToken4;
        totalSupply108 += ysTotalAmountMintToken4;

        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(0);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_60)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_72)).to.be.eq(ysTotalAmountMintToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_84)).to.be.eq(ysTotalAmountMintToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_96)).to.be.eq(ysTotalAmountMintToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_108)).to.be.eq(ysTotalAmountMintToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_120)).to.be.eq(0);
    });

    it("Success: Increase cycle to 63", async () => {
        await increaseCvgCycle(contractUsers, 3);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(63);
    });

    const amountFirstIncreaseCvgToken4 = ethers.parseEther("125");
    const ysTotalAmountFirstIncreaseToken4 = (amountFirstIncreaseCvgToken4 * 57n * 70n) / (96n * 100n);
    const ysPartialFirstIncreaseToken4 = (amountFirstIncreaseCvgToken4 * 57n * 70n * 9n) / (96n * 12n * 100n);
    it("Success: Increase TOKEN 4 for 12 cycle and of 12 CVG locked at cycle 63", async () => {
        await (await lockingPositionService.connect(user1).increaseLockTimeAndAmount(TOKEN_4, 12, amountFirstIncreaseCvgToken4, ZeroAddress)).wait();

        totalSupply72 += ysPartialFirstIncreaseToken4;
        totalSupply84 += ysTotalAmountFirstIncreaseToken4;
        totalSupply96 += ysTotalAmountFirstIncreaseToken4;
        totalSupply108 += ysTotalAmountFirstIncreaseToken4;
        // Token 1 & Token 2 are expired in cycle 120
        totalSupply120 =
            totalSupply108 -
            (ysTotalAmountMintToken1 + ysAmountFirstIncreaseToken1 + ysAmountSecondIncreaseToken1 + ysTotalAmountMintToken2 + ysAmountFirstIncreaseToken2);
        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(totalSupply120);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_132)).to.be.eq(0);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_60)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_72)).to.be.eq(ysTotalAmountMintToken4 + ysPartialFirstIncreaseToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_84)).to.be.eq(ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_96)).to.be.eq(ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_108)).to.be.eq(ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_120)).to.be.eq(ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_132)).to.be.eq(0);
    });

    it("Success: Increase cycle to 73", async () => {
        await increaseCvgCycle(contractUsers, 10);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(73);
    });

    const amountSecondIncreaseCvgToken4 = ethers.parseEther("200");
    const ysTotalAmountSecondIncreaseToken4 = (amountSecondIncreaseCvgToken4 * 59n * 70n) / (96n * 100n);
    const ysPartialSecondIncreaseToken4 = (amountSecondIncreaseCvgToken4 * 59n * 70n * 11n) / (96n * 12n * 100n);
    it("Success: Increase TOKEN 4 for 12 cycle at cycle 73, test the branch with 1 cycle in commong and more than 1 checkpoint", async () => {
        await (await lockingPositionService.connect(user1).increaseLockTimeAndAmount(TOKEN_4, 12, amountSecondIncreaseCvgToken4, ZeroAddress)).wait();

        totalSupply84 += ysPartialSecondIncreaseToken4;
        totalSupply96 += ysTotalAmountSecondIncreaseToken4;
        totalSupply108 += ysTotalAmountSecondIncreaseToken4;
        totalSupply120 += ysTotalAmountSecondIncreaseToken4;
        totalSupply132 = totalSupply120;

        // Token 1 & Token 2 are expired in cycle 120
        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(totalSupply120);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_132)).to.be.eq(totalSupply132);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_144)).to.be.eq(0);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_60)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_72)).to.be.eq(ysTotalAmountMintToken4 + ysPartialFirstIncreaseToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_84)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysPartialSecondIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_96)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_108)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_120)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_132)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_144)).to.be.eq(0);
    });

    it("Success: Increase cycle to 97", async () => {
        await increaseCvgCycle(contractUsers, 24);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(97);
    });

    const amountThirdIncreaseCvgToken4 = 200n;
    const ysPartialThirdIncreaseToken4 = (amountThirdIncreaseCvgToken4 * 59n * 70n * 11n) / (96n * 12n * 100n);
    const ysTotalAmountThirdIncreaseToken4 = (amountThirdIncreaseCvgToken4 * 59n * 70n) / (96n * 100n);
    it("Success: Increase TOKEN 4 for 12 cycle at cycle 97, test the branch with 1 cycle in commong and more than 1 checkpoint", async () => {
        await (await lockingPositionService.connect(user1).increaseLockTimeAndAmount(TOKEN_4, 24, amountThirdIncreaseCvgToken4, ZeroAddress)).wait();

        totalSupply108 += ysPartialThirdIncreaseToken4;
        totalSupply120 += ysTotalAmountThirdIncreaseToken4;
        totalSupply132 += ysTotalAmountThirdIncreaseToken4;
        totalSupply144 = totalSupply132;
        totalSupply156 = totalSupply144;

        // Token 1 & Token 2 are expired in cycle 120
        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(totalSupply120);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_132)).to.be.eq(totalSupply132);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_144)).to.be.eq(totalSupply144);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_156)).to.be.eq(totalSupply156);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_60)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_72)).to.be.eq(ysTotalAmountMintToken4 + ysPartialFirstIncreaseToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_84)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysPartialSecondIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_96)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_108)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4 + ysPartialThirdIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_120)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4 + ysTotalAmountThirdIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_132)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4 + ysTotalAmountThirdIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_144)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4 + ysTotalAmountThirdIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_156)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4 + ysTotalAmountThirdIncreaseToken4
        );
    });

    it("Success: Increase cycle to 150", async () => {
        await increaseCvgCycle(contractUsers, 53);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(150);
    });

    const amountFourthIncreaseCvgToken4 = ethers.parseEther("10000");
    const partialYsAmountFourthIncreaseToken4 = (amountFourthIncreaseCvgToken4 * 6n * 70n * 6n) / (12n * 96n * 100n);
    it("Success: Increase amount of token 4 at cycle 97 and extends the Ys", async () => {
        await (await lockingPositionService.connect(user1).increaseLockAmount(TOKEN_4, amountFourthIncreaseCvgToken4, ZeroAddress)).wait();

        totalSupply156 += partialYsAmountFourthIncreaseToken4;

        // Total Supply Ys
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_60)).to.be.eq(totalSupply60);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_72)).to.be.eq(totalSupply72);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_84)).to.be.eq(totalSupply84);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_96)).to.be.eq(totalSupply96);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_108)).to.be.eq(totalSupply108);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_120)).to.be.eq(totalSupply120);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_132)).to.be.eq(totalSupply132);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_144)).to.be.eq(totalSupply144);
        expect(await lockingPositionService.totalSupplyOfYsCvgAt(CYCLE_156)).to.be.eq(totalSupply156);

        // Balance Ys
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_60)).to.be.eq(0);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_72)).to.be.eq(ysTotalAmountMintToken4 + ysPartialFirstIncreaseToken4);
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_84)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysPartialSecondIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_96)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_108)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4 + ysPartialThirdIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_120)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4 + ysTotalAmountThirdIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_132)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4 + ysTotalAmountThirdIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_144)).to.be.eq(
            ysTotalAmountMintToken4 + ysTotalAmountFirstIncreaseToken4 + ysTotalAmountSecondIncreaseToken4 + ysTotalAmountThirdIncreaseToken4
        );
        expect(await lockingPositionService.balanceOfYsCvgAt(TOKEN_4, CYCLE_156)).to.be.eq(
            ysTotalAmountMintToken4 +
                ysTotalAmountFirstIncreaseToken4 +
                ysTotalAmountSecondIncreaseToken4 +
                ysTotalAmountThirdIncreaseToken4 +
                partialYsAmountFourthIncreaseToken4
        );
    });
});
