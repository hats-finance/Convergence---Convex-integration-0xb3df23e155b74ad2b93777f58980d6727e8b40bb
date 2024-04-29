import {expect} from "chai";
import {ApiHelper} from "../../../utils/ApiHelper";
import {MAX_INTEGER} from "@nomicfoundation/ethereumjs-util";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployBondFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {manipulateCurveDuoLp} from "../../../utils/swapper/curve-duo-manipulator";
import {Signer} from "ethers";
import {ERC20} from "../../../typechain-types/@openzeppelin/contracts/token/ERC20";
import {Cvg} from "../../../typechain-types/contracts/Token";
import {BondDepository} from "../../../typechain-types/contracts/Bond";
import {ICrvPool} from "../../../typechain-types/contracts/interfaces/ICrvPool.sol";
import {ethers} from "hardhat";
import {TOKEN_ADDR_CRV, TOKEN_ADDR_SDT, TOKEN_ADDR_WETH} from "../../../resources/tokens/common";
import {TypedContractEvent, TypedDeferredTopicFilter} from "../../../typechain-types/common";
import {BondCreatedEvent, BondDepositEvent} from "../../../typechain-types/contracts/Bond/BondDepository";
import {MINT, TOKEN_1} from "../../../resources/constant";
import {CvgControlTower, CvgOracle, LockingPositionManager, LockingPositionService} from "../../../typechain-types";
import {IContractsUser} from "../../../utils/contractInterface";

describe("BondDepository - Bond & Lock", () => {
    let owner: Signer, treasuryPod: Signer, treasuryDao: Signer, user1: Signer;
    let dai: ERC20, wETH: ERC20, sdt: ERC20, cvg: Cvg, crv: ERC20;
    let cvgPool: ICrvPool;
    let bondDepository: BondDepository, cvgOracle: CvgOracle, cvgControlTower: CvgControlTower;
    let lockingPositionService: LockingPositionService, lockingPositionManager: LockingPositionManager;
    let prices: any;
    let contractsUsers: IContractsUser;

    let filterBondCreated: TypedDeferredTopicFilter<
        TypedContractEvent<BondCreatedEvent.InputTuple, BondCreatedEvent.OutputTuple, BondCreatedEvent.OutputObject>
    >;

    let filterBondDeposit: TypedDeferredTopicFilter<
        TypedContractEvent<BondDepositEvent.InputTuple, BondDepositEvent.OutputTuple, BondDepositEvent.OutputObject>
    >;

    before(async () => {
        contractsUsers = await loadFixture(deployBondFixture);
        const contracts = contractsUsers.contracts;
        const users = contractsUsers.users;
        prices = await ApiHelper.getDefiLlamaTokenPrices([TOKEN_ADDR_CRV]);
        const tokens = contracts.tokens;
        owner = users.owner;
        user1 = users.user1;
        treasuryPod = users.treasuryPod;
        treasuryDao = users.treasuryDao;

        dai = tokens.dai;
        wETH = tokens.weth;

        cvg = tokens.cvg;
        sdt = tokens.sdt;
        crv = tokens.crv;
        bondDepository = contracts.bonds.bondDepository;
        lockingPositionService = contracts.locking.lockingPositionService;
        lockingPositionManager = contracts.locking.lockingPositionManager;
        cvgOracle = contracts.bonds.cvgOracle;
        cvgControlTower = contracts.base.cvgControlTower;

        cvgPool = contracts.lp.poolCvgFraxBp;

        filterBondCreated = bondDepository.filters.BondCreated(undefined);
        filterBondDeposit = bondDepository.filters.BondDeposit(undefined, undefined);

        await (await dai.approve(bondDepository, MAX_INTEGER)).wait();
        await (await dai.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();
        await (await wETH.approve(bondDepository, MAX_INTEGER)).wait();
        await (await wETH.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();
        await (await sdt.approve(bondDepository, MAX_INTEGER)).wait();
        await (await sdt.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();

        await (await crv.approve(bondDepository, MAX_INTEGER)).wait();
        await (await crv.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();
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

    let totalLocked1: bigint;
    it("Success :  Deposit & Lock in bond MINT DAI token 1 lock", async () => {
        const daiDeposited = ethers.parseEther("100000"); // Deposit 100k$

        await (await dai.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();

        const depositTx = bondDepository.connect(user1).depositAndLock(BOND_DAI, daiDeposited, 1, MINT, 47, 50);
        await depositTx;
        const cvgLocked = (daiDeposited * 10n ** 18n) / ((ethers.parseEther("0.33") * 935_000n) / 1_000_000n);
        totalLocked1 = cvgLocked;
        const lockingPosition = await lockingPositionService.lockingPositions(TOKEN_1);

        expect(lockingPosition.totalCvgLocked).to.be.eq(cvgLocked);
        expect(lockingPosition.ysPercentage).to.be.eq(50);
        expect(lockingPosition.startCycle).to.be.eq(1);
        expect(lockingPosition.lastEndCycle).to.be.eq(48);
        expect(await lockingPositionManager.ownerOf(TOKEN_1)).to.be.eq(await user1.getAddress());
        await expect(depositTx).to.changeTokenBalances(dai, [user1, treasuryPod], [-daiDeposited, daiDeposited]);
        await expect(depositTx).to.changeTokenBalance(cvg, lockingPositionService, lockingPosition.totalCvgLocked);
    });

    it("Success :  Deposit & Lock in bond DAI token 1 increase Amount only", async () => {
        const daiDeposited = ethers.parseEther("100000"); // Deposit 100k$

        const daiBondParams = (await bondDepository.getBondViews(1, 1))[0];

        const depositTx = bondDepository.connect(user1).depositAndLock(BOND_DAI, daiDeposited, 1, TOKEN_1, 0, 50);
        await depositTx;
        const cvgLocked = (daiDeposited * 10n ** 18n) / ((ethers.parseEther("0.33") * (1_000_000n - daiBondParams.actualRoi)) / 1_000_000n);

        const lockingPosition = await lockingPositionService.lockingPositions(TOKEN_1);

        expect(lockingPosition.totalCvgLocked).to.be.eq(cvgLocked + totalLocked1);
        expect(lockingPosition.startCycle).to.be.eq(1);
        expect(lockingPosition.lastEndCycle).to.be.eq(48);

        expect(await lockingPositionManager.ownerOf(TOKEN_1)).to.be.eq(await user1.getAddress());
        await expect(depositTx).to.changeTokenBalances(dai, [user1, treasuryPod], [-daiDeposited, daiDeposited]);
        await expect(depositTx).to.changeTokenBalance(cvg, lockingPositionService, cvgLocked);

        totalLocked1 += cvgLocked;
    });
    it("Success: Go to cycle 25 !", async () => {
        await increaseCvgCycle(contractsUsers, 24);
    });
    const BOND_CRV = 2;
    it("Success : Should create a new bond with", async () => {
        await bondDepository.connect(treasuryDao).createBond([
            {
                bondDuration: 86400 * 70,
                cvgToSell: ethers.parseEther("1000000"),
                minRoi: 5_000,
                maxRoi: 65_000,
                composedFunction: 0,
                vestingTerm: 432_000,
                token: crv,
                percentageOneTx: 900,
                gamma: 250_000,
                scale: 5_000,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                isPaused: false,
            },
        ]);

        await time.increase(10);
    });

    it("Success :  Deposit & Lock increase time & Amount", async () => {
        const crvDeposited = ethers.parseEther("40000");
        const crvPrice = await cvgOracle.getPriceVerified(TOKEN_ADDR_CRV);
        const usdDeposited = crvDeposited * crvPrice;
        const crvBondInfos = (await bondDepository.getBondViews(2, 2))[0];

        const depositTx = bondDepository.connect(user1).depositAndLock(BOND_CRV, crvDeposited, 1, TOKEN_1, 24, 50);
        await depositTx;
        const cvgLocked = usdDeposited / ((ethers.parseEther("0.33") * (1_000_000n - crvBondInfos.actualRoi)) / 1_000_000n);
        const lockingPosition = await lockingPositionService.lockingPositions(TOKEN_1);

        expect(lockingPosition.totalCvgLocked).to.be.eq(cvgLocked + totalLocked1);
        expect(lockingPosition.startCycle).to.be.eq(1);
        expect(lockingPosition.lastEndCycle).to.be.eq(72);

        expect(await lockingPositionManager.ownerOf(TOKEN_1)).to.be.eq(await user1.getAddress());
        await expect(depositTx).to.changeTokenBalances(crv, [user1, treasuryPod], [-crvDeposited, crvDeposited]);
        await expect(depositTx).to.changeTokenBalance(cvg, lockingPositionService, cvgLocked);

        totalLocked1 += cvgLocked;
    });

    it("Success: Go to cycle 73 !", async () => {
        await increaseCvgCycle(contractsUsers, 48);
        expect(await cvgControlTower.cvgCycle()).to.be.eq(73);
    });

    it("Success: Burn the locking position after the end of the lock", async () => {
        const burnTx = lockingPositionService.connect(user1).burnPosition(TOKEN_1);
        await burnTx;

        await expect(burnTx).to.changeTokenBalances(cvg, [lockingPositionService, user1], [-totalLocked1, totalLocked1]);
        expect(await lockingPositionManager.balanceOf(user1)).to.be.eq(0);
    });
});
