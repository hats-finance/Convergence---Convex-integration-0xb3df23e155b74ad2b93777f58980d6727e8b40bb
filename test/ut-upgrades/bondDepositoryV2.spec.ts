import {IUsers} from "../../utils/contractInterface";
import {Signer, MaxUint256} from "ethers";
import {
    BondCalculator,
    BondDepositoryV2,
    BondPositionManager,
    CvgOracle,
    CvgOracleUpgradeable,
    IERC20,
    LockingPositionManager,
    LockingPositionService,
} from "../../typechain-types";
import {loadFixture, time} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";
import {TREASURY_DAO, TREASURY_POD} from "../../resources/treasury";
import {TOKEN_ADDR_CVG, TOKEN_ADDR_USDC, TOKEN_ADDR_WETH} from "../../resources/tokens/common";
import {deployBondDepositoryV2} from "../fixtures/bondDepositoryV2";
import {ONE_WEEK} from "../../resources/constant";
import {bond} from "../../typechain-types/contracts";
import {expect} from "chai";

describe("BondDepositoryV2 - Test", () => {
    let users: IUsers, treasuryDao: Signer;
    let cvg: IERC20, weth: IERC20, usdc: IERC20;
    let _bondDepositoryV2: BondDepositoryV2,
        lockingPositionManager: LockingPositionManager,
        cvgOracle: CvgOracleUpgradeable,
        bondCalculator: BondCalculator,
        lockingPositionService: LockingPositionService,
        bondPositionManager: BondPositionManager;

    before(async () => {
        let {mainnetContracts, bondDepositoryV2} = await loadFixture(deployBondDepositoryV2);
        lockingPositionManager = mainnetContracts.locking.lockingPositionManager;
        bondPositionManager = mainnetContracts.bondPositionManager;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);
        users = mainnetContracts.users;

        cvg = mainnetContracts.cvg;
        weth = mainnetContracts.globalAssets["weth"];
        usdc = mainnetContracts.globalAssets["usdc"];
        _bondDepositoryV2 = bondDepositoryV2;
        cvgOracle = mainnetContracts.cvgOracle;
        bondCalculator = mainnetContracts.bondCalculator;
        lockingPositionService = mainnetContracts.locking.lockingPositionService;

        // approvals
        await weth.connect(users.user1).approve(_bondDepositoryV2, MaxUint256);
        await weth.connect(users.user2).approve(_bondDepositoryV2, MaxUint256);
        await weth.connect(users.user3).approve(_bondDepositoryV2, MaxUint256);

        await usdc.connect(users.user1).approve(_bondDepositoryV2, MaxUint256);
        await usdc.connect(users.user2).approve(_bondDepositoryV2, MaxUint256);
        await usdc.connect(users.user3).approve(_bondDepositoryV2, MaxUint256);
    });

    it("Fails: Withdraw tokens as not the owner", async () => {
        await _bondDepositoryV2.withdrawTokens([TOKEN_ADDR_WETH]).should.be.revertedWith("Ownable: caller is not the owner");
    });

    let bondIdEthLocked = 0n;
    let bondIdEthNotLocked = 0n;
    let bondIdUsdcLocked = 0n;
    let bondIdUsdcNotLocked = 0n;
    it("Success: Creates a bond lock only", async () => {
        const now = (await ethers.provider.getBlock("latest"))!.timestamp;
        bondIdEthLocked = await _bondDepositoryV2.nextBondId();
        bondIdEthNotLocked = bondIdEthLocked + 1n;
        bondIdUsdcLocked += bondIdEthLocked + 2n;
        bondIdUsdcNotLocked += bondIdEthLocked + 3n;
        await _bondDepositoryV2.connect(treasuryDao).createBond([
            {
                bondParams: {
                    composedFunction: 0,
                    token: TOKEN_ADDR_WETH,
                    gamma: 250000n,
                    bondDuration: ONE_WEEK,
                    isPaused: false,
                    scale: 500,
                    minRoi: 100_000,
                    maxRoi: 150_000,
                    percentageOneTx: 200,
                    vestingTerm: 0,
                    cvgToSell: ethers.parseEther("100000"),
                    startBondTimestamp: now + 100,
                },
                isLockMandatory: true,
            },

            {
                bondParams: {
                    composedFunction: 0,
                    token: TOKEN_ADDR_WETH,
                    gamma: 250000n,
                    bondDuration: ONE_WEEK,
                    isPaused: false,
                    scale: 500,
                    minRoi: 100_000,
                    maxRoi: 150_000,
                    percentageOneTx: 200,
                    vestingTerm: 0,
                    cvgToSell: ethers.parseEther("100000"),
                    startBondTimestamp: now + 100,
                },
                isLockMandatory: false,
            },

            {
                bondParams: {
                    composedFunction: 0,
                    token: TOKEN_ADDR_USDC,
                    gamma: 250000n,
                    bondDuration: ONE_WEEK,
                    isPaused: false,
                    scale: 500,
                    minRoi: 100_000,
                    maxRoi: 150_000,
                    percentageOneTx: 200,
                    vestingTerm: 0,
                    cvgToSell: ethers.parseEther("100000"),
                    startBondTimestamp: now + 100,
                },
                isLockMandatory: true,
            },

            {
                bondParams: {
                    composedFunction: 0,
                    token: TOKEN_ADDR_USDC,
                    gamma: 250000n,
                    bondDuration: ONE_WEEK,
                    isPaused: false,
                    scale: 500,
                    minRoi: 100_000,
                    maxRoi: 150_000,
                    percentageOneTx: 200,
                    vestingTerm: 0,
                    cvgToSell: ethers.parseEther("100000"),
                    startBondTimestamp: now + 100,
                },
                isLockMandatory: false,
            },
        ]);
        await time.increase(100);
    });

    it("Fails : Deposit simple without locking", async () => {
        await _bondDepositoryV2.connect(users.user2).deposit(bondIdEthLocked, 0, 0, 0, users.user2).should.be.revertedWith("BOND_WITH_MANDATORY_LOCK");
    });

    it("Fails : Deposit ETH on USDC bond not working", async () => {
        await _bondDepositoryV2
            .connect(users.user2)
            .deposit(bondIdUsdcLocked, 0, 0, 0, users.user2, {value: ethers.parseEther("1")})
            .should.be.revertedWith("BOND_WITH_MANDATORY_LOCK");
    });

    it("Fails : Deposit ETH on USDC bond", async () => {
        await _bondDepositoryV2
            .connect(users.user2)
            .deposit(bondIdUsdcNotLocked, 0, 0, 0, users.user2, {value: ethers.parseEther("1")})
            .should.be.revertedWith("NOT_ETH_BOND");
    });

    let lockId = 0n;
    let cvgOutFirstBond = 0n;
    it("Success : Deposit and lock with WETH", async () => {
        const amountEthIn = ethers.parseEther("1");
        lockId = await lockingPositionManager.nextId();

        const tx = _bondDepositoryV2.connect(users.user2).depositAndLock(bondIdEthLocked, amountEthIn, 0, 0, 61, 100);
        await tx;
        const [cvgPrice, ethPrice] = await cvgOracle.getAndVerifyTwoPrices(TOKEN_ADDR_CVG, TOKEN_ADDR_WETH);
        const roi = 150_000n;
        cvgOutFirstBond = (((ethPrice * amountEthIn) / 10n ** 18n) * 10n ** 18n) / ((cvgPrice * (1_000_000n - roi)) / 1_000_000n);

        await expect(tx).to.changeTokenBalances(cvg, [lockingPositionService], [cvgOutFirstBond]);
        await expect(tx).to.changeTokenBalances(weth, [users.user2, TREASURY_POD], [-amountEthIn, amountEthIn]);
    });

    it("Success : Deposit simple with WETH on a bond allowing locking", async () => {
        const amountWEthIn = ethers.parseEther("1");

        const tx = _bondDepositoryV2.connect(users.user2).deposit(bondIdEthNotLocked, 0, amountWEthIn, 0, users.user2);
        await tx;
        const [cvgPrice, ethPrice] = await cvgOracle.getAndVerifyTwoPrices(TOKEN_ADDR_CVG, TOKEN_ADDR_WETH);
        const roi = 150_000n;
        cvgOutFirstBond = (((ethPrice * amountWEthIn) / 10n ** 18n) * 10n ** 18n) / ((cvgPrice * (1_000_000n - roi)) / 1_000_000n);

        await expect(tx).to.changeTokenBalances(weth, [users.user2, TREASURY_POD], [-amountWEthIn, amountWEthIn]);
    });

    it("Success : Deposit and lock with ETH", async () => {
        const now = (await ethers.provider.getBlock("latest"))!.timestamp;

        const amountEthIn = ethers.parseEther("1");
        const bondIdInfos = await _bondDepositoryV2.bondParams(bondIdEthLocked);
        const roi = await bondCalculator.computeRoi(
            BigInt(now) - bondIdInfos.startBondTimestamp,
            bondIdInfos.bondDuration,
            0,
            ethers.parseEther("100000"),
            cvgOutFirstBond,
            bondIdInfos.gamma,
            bondIdInfos.scale,
            bondIdInfos.minRoi,
            bondIdInfos.maxRoi
        );
        const tx = _bondDepositoryV2.connect(users.user2).depositAndLock(bondIdEthLocked, 0, 0, lockId, 12, 100, {value: amountEthIn});
        await tx;
        const [cvgPrice, ethPrice] = await cvgOracle.getAndVerifyTwoPrices(TOKEN_ADDR_CVG, TOKEN_ADDR_WETH);

        const cvgOutExpected = (((ethPrice * amountEthIn) / 10n ** 18n) * 10n ** 18n) / ((cvgPrice * (1_000_000n - roi)) / 1_000_000n);

        await expect(tx).to.changeEtherBalances([users.user2], [-amountEthIn]);
        await expect(tx).to.changeTokenBalances(weth, [_bondDepositoryV2], [amountEthIn]);

        await expect(tx).to.changeTokenBalances(cvg, [lockingPositionService], [cvgOutExpected]);
    });

    it("Success : Deposit and lock with ETH and WETH", async () => {
        const now = (await ethers.provider.getBlock("latest"))!.timestamp;

        const amountWEthIn = ethers.parseEther("0.8");
        const amountEthIn = ethers.parseEther("0.2");

        const bondIdInfos = await _bondDepositoryV2.bondParams(bondIdEthLocked);
        const roi = await bondCalculator.computeRoi(
            BigInt(now) - bondIdInfos.startBondTimestamp,
            bondIdInfos.bondDuration,
            0,
            ethers.parseEther("100000"),
            cvgOutFirstBond,
            bondIdInfos.gamma,
            bondIdInfos.scale,
            bondIdInfos.minRoi,
            bondIdInfos.maxRoi
        );
        const tx = _bondDepositoryV2.connect(users.user2).depositAndLock(bondIdEthLocked, amountWEthIn, 0, lockId, 12, 100, {value: amountEthIn});
        await tx;
        const [cvgPrice, ethPrice] = await cvgOracle.getAndVerifyTwoPrices(TOKEN_ADDR_CVG, TOKEN_ADDR_WETH);

        const cvgOutExpected = (((ethPrice * (amountEthIn + amountWEthIn)) / 10n ** 18n) * 10n ** 18n) / ((cvgPrice * (1_000_000n - roi)) / 1_000_000n);

        await expect(tx).to.changeEtherBalances([users.user2, weth], [-amountEthIn, amountEthIn]);
        await expect(tx).to.changeTokenBalances(weth, [users.user2, _bondDepositoryV2, TREASURY_POD], [-amountWEthIn, amountEthIn, amountWEthIn]);

        await expect(tx).to.changeTokenBalances(cvg, [lockingPositionService], [cvgOutExpected]);
    });

    it("Success : Deposit simple with ETH and WETH", async () => {
        const amountWEthIn = ethers.parseEther("0.8");
        const amountEthIn = ethers.parseEther("0.2");

        const tx = _bondDepositoryV2.connect(users.user2).deposit(bondIdEthNotLocked, 0, amountWEthIn, 0, users.user2, {value: amountEthIn});
        await tx;

        await expect(tx).to.changeEtherBalances([users.user2, weth], [-amountEthIn, amountEthIn]);
        await expect(tx).to.changeTokenBalances(weth, [users.user2, _bondDepositoryV2, TREASURY_POD], [-amountWEthIn, amountEthIn, amountWEthIn]);
    });

    it("Success : Deposit simple with ETH only", async () => {
        const amountEthIn = ethers.parseEther("0.2");

        const tx = _bondDepositoryV2.connect(users.user2).deposit(bondIdEthNotLocked, 0, 0, 0, users.user2, {value: amountEthIn});
        await tx;

        await expect(tx).to.changeEtherBalances([users.user2, weth], [-amountEthIn, amountEthIn]);
        await expect(tx).to.changeTokenBalances(weth, [_bondDepositoryV2], [amountEthIn]);
    });

    it("Fails : Deposit simple with some ETH on a USDC bond", async () => {
        const amountEthIn = ethers.parseEther("0.2");
        const amountUSDCIn = ethers.parseEther("1500");

        await _bondDepositoryV2
            .connect(users.user2)
            .deposit(bondIdUsdcNotLocked, 0, amountUSDCIn, 0, users.user2, {value: amountEthIn})
            .should.be.revertedWith("NOT_ETH_BOND");
    });

    it("Fails : Deposit simple with some USDC on a bond not that is locked mandatory", async () => {
        const amountUSDCIn = ethers.parseUnits("1500", 6);

        await _bondDepositoryV2
            .connect(users.user2)
            .deposit(bondIdUsdcLocked, 0, amountUSDCIn, 0, users.user2)
            .should.be.revertedWith("BOND_WITH_MANDATORY_LOCK");
    });

    it("Fails : Deposit & Lock with some ETH on a USDC bond", async () => {
        const amountEthIn = ethers.parseEther("0.2");
        const amountUSDCIn = ethers.parseUnits("1500", 6);
        await _bondDepositoryV2
            .connect(users.user2)
            .depositAndLock(bondIdUsdcLocked, amountUSDCIn, lockId, 0, 0, 100, {value: amountEthIn})
            .should.be.revertedWith("NOT_ETH_BOND");
    });

    it("Fails : Deposit simple on WETH without ETH and WETH", async () => {
        await _bondDepositoryV2.connect(users.user2).deposit(bondIdEthNotLocked, 0, 0, 0, users.user2).should.be.revertedWith("LTE");
    });

    it("Fails : Deposit and lock on WETH without ETH and WETH", async () => {
        await _bondDepositoryV2.connect(users.user2).depositAndLock(bondIdEthNotLocked, 0, lockId, 0, 0, 100).should.be.revertedWith("LTE");
    });

    it("Success : Deposit simple with some USDC on a bond not locked", async () => {
        const amountUSDCIn = ethers.parseUnits("1500", 6);

        const now = (await ethers.provider.getBlock("latest"))!.timestamp;

        const bondIdInfos = await _bondDepositoryV2.bondParams(bondIdUsdcNotLocked);
        const roi = await bondCalculator.computeRoi(
            BigInt(now) - bondIdInfos.startBondTimestamp,
            bondIdInfos.bondDuration,
            0,
            ethers.parseEther("100000"),
            0,
            bondIdInfos.gamma,
            bondIdInfos.scale,
            bondIdInfos.minRoi,
            bondIdInfos.maxRoi
        );

        const tx = _bondDepositoryV2.connect(users.user2).deposit(bondIdUsdcNotLocked, 0, amountUSDCIn, 0, users.user2);
        await tx;
        const [cvgPrice, ethPrice] = await cvgOracle.getAndVerifyTwoPrices(TOKEN_ADDR_CVG, TOKEN_ADDR_WETH);

        const cvgOutExpected = (((amountUSDCIn * 10n ** 18n) / 10n ** 6n) * 10n ** 18n) / ((cvgPrice * (1_000_000n - roi)) / 1_000_000n);

        await expect(tx).to.changeTokenBalances(usdc, [users.user2, TREASURY_POD], [-amountUSDCIn, amountUSDCIn]);
        expect((await _bondDepositoryV2.positionInfos((await bondPositionManager.nextId()) - 1n)).leftClaimable).to.be.eq(cvgOutExpected);
    });
});
