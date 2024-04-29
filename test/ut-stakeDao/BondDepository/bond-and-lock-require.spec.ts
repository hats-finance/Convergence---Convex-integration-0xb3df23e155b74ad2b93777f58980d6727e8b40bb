import {expect} from "chai";
import {ApiHelper} from "../../../utils/ApiHelper";
import {MAX_INTEGER} from "@nomicfoundation/ethereumjs-util";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployBondFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {Signer} from "ethers";
import {ERC20} from "../../../typechain-types/@openzeppelin/contracts/token/ERC20";
import {BondDepository} from "../../../typechain-types/contracts/Bond";
import {ICrvPool} from "../../../typechain-types/contracts/interfaces/ICrvPool.sol";
import {ethers} from "hardhat";
import {TOKEN_ADDR_SDT, TOKEN_ADDR_WETH} from "../../../resources/tokens/common";
import {MINT, TOKEN_1} from "../../../resources/constant";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {LockingPositionService, contracts} from "../../../typechain-types";
import {bond} from "../../../typechain-types/contracts";
import {IContractsUser} from "../../../utils/contractInterface";

describe("BondDepository - Bond & Lock Requires", () => {
    let owner: Signer, treasuryPod: Signer, treasuryDao: Signer, user1: Signer;
    let dai: ERC20, sdt: ERC20, cvg: ERC20;
    let bondDepository: BondDepository, lockingPositionService: LockingPositionService;
    let cvgPoolContract: ICrvPool;
    let prices: any;
    let contractsUser: IContractsUser;

    before(async () => {
        contractsUser = await loadFixture(deployBondFixture);
        const contracts = contractsUser.contracts;
        const users = contractsUser.users;
        prices = await ApiHelper.getDefiLlamaTokenPrices([TOKEN_ADDR_WETH, TOKEN_ADDR_SDT]);
        const tokens = contracts.tokens;
        owner = users.owner;
        user1 = users.user1;
        treasuryPod = users.treasuryPod;
        treasuryDao = users.treasuryDao;
        lockingPositionService = contracts.locking.lockingPositionService;

        dai = tokens.dai;
        cvg = tokens.cvg;

        sdt = tokens.sdt;
        bondDepository = contracts.bonds.bondDepository;

        cvgPoolContract = contracts.lp.poolCvgFraxBp;

        await (await sdt.connect(user1).approve(bondDepository, MAX_INTEGER)).wait();
        await (await sdt.approve(bondDepository, MAX_INTEGER)).wait();

        await cvg.approve(lockingPositionService, ethers.MaxUint256);
        // await lockingPositionService.mintPosition(11, ethers.parseEther("100"), 50, owner, true);
    });
    let BOND_SDT = 1;
    it("Success : Should create bond Stable", async () => {
        await bondDepository.connect(treasuryDao).createBond([
            {
                bondDuration: 86_400 * 7 * 30,
                cvgToSell: ethers.parseEther("1000000"),
                minRoi: 5_000,
                maxRoi: 65_000,
                composedFunction: 0,
                vestingTerm: 432_000,
                token: sdt,
                percentageOneTx: 800,
                gamma: 250_000,
                scale: 5_000,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                isPaused: false,
            },
        ]);
        await time.increase(10);
    });

    it("Fail: Bond & Lock with too small lock duration", async () => {
        await expect(bondDepository.connect(user1).depositAndLock(BOND_SDT, 100, 1, MINT, 11, 50)).to.be.revertedWith("LOCK_DURATION_NOT_LONG_ENOUGH");
    });

    let totalToken1: bigint;
    it("Success :  Deposit & lock on bond SDT", async () => {
        const sdtDeposited = "100000";
        const sdtPrice = prices[TOKEN_ADDR_SDT].price;
        // ROI = ROI MAX
        const cvgPriceExpected = 0.33 - 0.33 * 0.065;
        const dollarValueDeposited = sdtPrice * Number(sdtDeposited);
        const cvgMintedExpected = dollarValueDeposited / cvgPriceExpected;

        const depositAndLockTx = bondDepository.connect(user1).depositAndLock(BOND_SDT, ethers.parseEther(sdtDeposited), 1, MINT, 47, 50);
        await depositAndLockTx;
        const lockingPosition = await lockingPositionService.lockingPositions(TOKEN_1);
        const cvgLocked = lockingPosition.totalCvgLocked;

        expect(Number(ethers.formatEther(cvgLocked))).to.be.within(cvgMintedExpected * 0.95, cvgMintedExpected * 1.05);
        await expect(depositAndLockTx).to.changeTokenBalances(sdt, [user1, treasuryPod], [-ethers.parseEther(sdtDeposited), ethers.parseEther(sdtDeposited)]);
        await expect(depositAndLockTx).to.changeTokenBalance(cvg, lockingPositionService, cvgLocked);
    });

    it("Fail: Bond & Lock with too small lock duration", async () => {
        await expect(bondDepository.connect(user1).depositAndLock(BOND_SDT, 100, 1, MINT, 11, 50)).to.be.revertedWith("LOCK_DURATION_NOT_LONG_ENOUGH");
    });

    it("Fail: Bond & Lock too much per function call", async () => {
        await expect(bondDepository.connect(user1).depositAndLock(BOND_SDT, ethers.parseEther("10000000"), 1, MINT, 48, 50)).to.be.revertedWith(
            "MAX_CVG_PER_BOND"
        );
    });

    it("Fail: Bond & Lock with 0 amount", async () => {
        await expect(bondDepository.connect(user1).depositAndLock(BOND_SDT, 0, 1, MINT, 48, 50)).to.be.revertedWith("LTE");
    });
    it("Fail: Bond & Lock with with very small amount => 0 CVG minted", async () => {
        await expect(bondDepository.connect(user1).depositAndLock(BOND_SDT, 1, 1, MINT, 48, 50)).to.be.revertedWith("ZERO_BUY");
    });

    it("Success : Go to cycle 25", async () => {
        await increaseCvgCycle(contractsUser, 24);
    });

    it("Fail: Bond & Lock increaseAmount without time too small", async () => {
        await expect(bondDepository.connect(user1).depositAndLock(BOND_SDT, 100, 1, TOKEN_1, 12, 50)).to.be.revertedWith("ADDED_LOCK_DURATION_NOT_ENOUGH");
    });

    it("Fail: Bond & Lock increaseAmount & Time without time left too small", async () => {
        await expect(bondDepository.connect(user1).depositAndLock(BOND_SDT, 100, 1, TOKEN_1, 0, 50)).to.be.revertedWith("REMAINING_LOCK_DURATION_TOO_LOW");
    });

    it("Success : Go to cycle 30", async () => {
        await increaseCvgCycle(contractsUser, 30);
    });

    it("Fail: Bond & Lock on an inactive bond", async () => {
        await expect(bondDepository.connect(user1).depositAndLock(BOND_SDT, ethers.parseEther("100"), 1, MINT, 47, 50)).to.be.revertedWith("BOND_INACTIVE");
    });
});
