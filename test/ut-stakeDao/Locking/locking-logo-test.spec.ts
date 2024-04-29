import chai from "chai";
import {MAX_INTEGER, zeroAddress} from "@nomicfoundation/ethereumjs-util";

import chaiAsPromised from "chai-as-promised";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture, increaseCvgCycle} from "../../fixtures/stake-dao";
import {ethers} from "hardhat";
import {Signer} from "ethers";
import {CvgControlTower} from "../../../typechain-types/contracts";
import {LockingPositionManager, LockingPositionService, LockingPositionDelegate, LockingLogo} from "../../../typechain-types/contracts/Locking";
import {YsDistributor} from "../../../typechain-types/contracts/Rewards";
import {Cvg} from "../../../typechain-types/contracts/Token";
import {PositionLocker} from "../../../typechain-types/contracts/mocks";
import {IContractsUser, IContracts, IUsers} from "../../../utils/contractInterface";
import {LOCKING_POSITIONS} from "./config/lockingTestConfig";
import {ERC20} from "../../../typechain-types/@openzeppelin/contracts/token/ERC20";
import {render_svg} from "../../../utils/svg/render_svg";
import {CYCLE_13, TDE_1, TDE_2, TOKEN_1, TOKEN_2, TOKEN_3} from "../../../resources/constant";
import {CvgOracle, IYsDistributor} from "../../../typechain-types";
import {withinPercentage} from "../../../utils/testUtils/testUtils";

chai.use(chaiAsPromised).should();
const expect = chai.expect;

const PATH = "./test/ut/Locking/logo/";

describe("LockingPositionManager Locking Logo test", () => {
    let lockingPositionManagerContract: LockingPositionManager,
        lockingPositionServiceContract: LockingPositionService,
        lockingPositionDelegate: LockingPositionDelegate,
        cvgContract: Cvg,
        controlTowerContract: CvgControlTower,
        cvgOracle: CvgOracle,
        positionLocker: PositionLocker,
        lockingLogo: LockingLogo,
        ysdistributor: YsDistributor;
    let contractUsers: IContractsUser, contracts: IContracts, users: IUsers;
    let owner: Signer, user1: Signer, user2: Signer, user10: Signer, treasuryDao: Signer;
    let tokens;
    let crv: ERC20, weth: ERC20, cvx: ERC20, usdc: ERC20, usdt: ERC20, dai: ERC20;

    let depositStructTDE1: IYsDistributor.TokenAmountStruct[];
    let depositStructTDE2: IYsDistributor.TokenAmountStruct[];
    before(async () => {
        contractUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractUsers.contracts;
        users = contractUsers.users;

        lockingPositionServiceContract = contracts.locking.lockingPositionService;
        lockingPositionManagerContract = contracts.locking.lockingPositionManager;
        lockingPositionDelegate = contracts.locking.lockingPositionDelegate;
        ysdistributor = contracts.rewards.ysDistributor;
        cvgContract = contracts.tokens.cvg;
        cvgOracle = contracts.bonds.cvgOracle;
        controlTowerContract = contracts.base.cvgControlTower;
        lockingLogo = contracts.locking.lockingLogo;
        treasuryDao = users.treasuryDao;
        user1 = users.user1;
        user2 = users.user2;
        user10 = users.user10;
        tokens = contracts.tokens;
        weth = tokens.weth;
        crv = tokens.crv;
        cvx = tokens.cvx;

        usdt = tokens.usdt;
        usdc = tokens.usdc;
        dai = tokens.dai;

        await (await weth.transfer(users.treasuryPdd, ethers.parseEther("100000"))).wait();
        await (await crv.transfer(users.treasuryPdd, ethers.parseEther("100000"))).wait();
        await (await cvx.transfer(users.treasuryPdd, ethers.parseEther("100000"))).wait();

        await (await usdc.transfer(users.treasuryPdd, ethers.parseUnits("100000", 6))).wait();
        await (await usdt.transfer(users.treasuryPdd, ethers.parseUnits("100000", 6))).wait();
        await (await dai.transfer(users.treasuryPdd, ethers.parseEther("100000"))).wait();

        await (await cvgContract.transfer(user1, ethers.parseEther("100000"))).wait();
        await (await cvgContract.transfer(user2, ethers.parseEther("100000"))).wait();

        // approve treasuryPdd tokens spending
        await cvx.connect(users.treasuryPdd).approve(ysdistributor, MAX_INTEGER);
        await crv.connect(users.treasuryPdd).approve(ysdistributor, MAX_INTEGER);
        await weth.connect(users.treasuryPdd).approve(ysdistributor, MAX_INTEGER);

        await usdc.connect(users.treasuryPdd).approve(ysdistributor, MAX_INTEGER);
        await usdt.connect(users.treasuryPdd).approve(ysdistributor, MAX_INTEGER);
        await dai.connect(users.treasuryPdd).approve(ysdistributor, MAX_INTEGER);

        await (await cvgContract.connect(user1).approve(lockingPositionServiceContract, ethers.MaxUint256)).wait();

        const cvxAmount = ethers.parseEther("5");
        const crvAmount = ethers.parseEther("10");
        const wethAmount = ethers.parseEther("15");

        depositStructTDE1 = [
            {token: cvx, amount: cvxAmount},
            {token: crv, amount: crvAmount},
            {token: weth, amount: wethAmount},
        ];

        depositStructTDE2 = [
            {
                token: crv,
                amount: ethers.parseEther("10000"),
            },
            {
                token: usdc,
                amount: ethers.parseUnits("10000", 6),
            },

            {
                token: usdt,
                amount: ethers.parseUnits("10000", 6),
            },
            {
                token: weth,
                amount: ethers.parseEther("20"),
            },
            {
                token: dai,
                amount: ethers.parseEther("10000"),
            },
        ];

        await ysdistributor.connect(users.treasuryPdd).depositMultipleToken(depositStructTDE1);
    });

    it("Fails : Set the starting TDE for the usd price claimable on locking logo as not the owner", async () => {
        await lockingLogo.setStartTdePriceFetching(1).should.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Fails : Set the starting TDE for the usd price claimable on locking logo as not the owner", async () => {
        await lockingLogo.connect(contractUsers.users.treasuryDao).setStartTdePriceFetching(1);
    });

    it("Fail addTokenAtMint", async () => {
        await lockingPositionDelegate.addTokenAtMint(1, user1).should.be.revertedWith("NOT_LOCKING_SERVICE");
    });
    it("Fail mint", async () => {
        await lockingPositionManagerContract.mint(user1).should.be.revertedWith("NOT_LOCKING_SERVICE");
    });
    it("Fail burn", async () => {
        await lockingPositionManagerContract.burn(TOKEN_1, user1).should.be.revertedWith("NOT_LOCKING_SERVICE");
    });

    it("Success : increase staking cycle to 5", async () => {
        await increaseCvgCycle(contractUsers, 4);

        const actualCycle = await controlTowerContract.cvgCycle();
        expect(actualCycle).to.be.eq(5);
    });

    it("Success : MINT TOKEN_1 at CYCLE_5, 0% Ys", async () => {
        await (await lockingPositionServiceContract.connect(user1).mintPosition(43, ethers.parseEther("100"), 0, user1, true)).wait();
    });
    it("Success : Go to Cycle 9 & MINT TOKEN_2 at CYCLE_9", async () => {
        await increaseCvgCycle(contractUsers, 4);

        await (await lockingPositionServiceContract.connect(user1).mintPosition(39, ethers.parseEther("100"), 30, user1, true)).wait();
    });
    it("Success : MINT TOKEN_3 at CYCLE_12", async () => {
        await increaseCvgCycle(contractUsers, 3);

        await (await lockingPositionServiceContract.connect(user1).mintPosition(36, ethers.parseEther("50"), 30, user1, true)).wait();
    });
    it("remove locking logo to controlTower", async () => {
        await lockingPositionManagerContract.connect(treasuryDao).setLogo(zeroAddress());
    });
    it("tokenURI for tokenId 1 should compute empty string if no baseURI/Logo is set", async () => {
        const tokenURI = await lockingPositionManagerContract.tokenURI(1);
        expect(tokenURI).to.be.equal("");
    });
    it("set base URI with random user should revert", async () => {
        await lockingPositionManagerContract.setBaseURI("ipfs://test/").should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("set base URI should compute offchain tokenURI for tokenId 1", async () => {
        await lockingPositionManagerContract.connect(treasuryDao).setBaseURI("ipfs://test/");
        const tokenURI = await lockingPositionManagerContract.tokenURI(1);
        expect(tokenURI).to.be.equal("ipfs://test/1");
    });
    it("add locking logo to controlTower", async () => {
        await lockingPositionManagerContract.connect(treasuryDao).setLogo(lockingLogo);
    });

    it("Success : Get amounts of YsCvg claimable for TOKEN_1 should return 0 because 0% ys", async () => {
        const ysErc20Claimable = await ysdistributor.getPositionRewardsForTdes([TDE_1], CYCLE_13, TOKEN_1);
        expect(ysErc20Claimable.length).to.be.eq(0);
    });

    it("Success : Check getLogoInfos of TOKEN_1", async () => {
        const logoInfos1 = await lockingLogo.getLogoInfo(TOKEN_1);
        expect(logoInfos1.tokenId).to.be.eq(TOKEN_1);
        expect(logoInfos1.cvgLocked).to.be.eq(ethers.parseEther("100"));
        expect(logoInfos1.lockEnd).to.be.eq(48n);
        expect(logoInfos1.ysPercentage).to.be.eq(0n);
        expect(logoInfos1.mgCvg).to.be.eq(44791666666666666666n);
        expect(logoInfos1.unlockingTimestamp).to.be.eq(0n);
        expect(logoInfos1.cvgLockedInUsd).to.be.eq(33000000000000000000n);
        expect(logoInfos1.claimableInUsd).to.be.eq(0);
        expect(logoInfos1.ysCvgActual).to.be.eq(0n);
        expect(logoInfos1.ysCvgNext).to.be.eq(0n);
        withinPercentage(38144312851131825960n, logoInfos1.veCvg, 0.1);
        expect(logoInfos1.gaugePosition).to.be.deep.eq([0n, 0n]);
        expect(logoInfos1.isLocked).to.be.eq(false);
        expect(logoInfos1.hoursLock).to.be.eq(0n);
    });

    it("Success : Check getLogoInfos of TOKEN_2", async () => {
        const logoInfos2 = await lockingLogo.getLogoInfo(TOKEN_2);
        expect(logoInfos2.tokenId).to.be.eq(TOKEN_2);
        expect(logoInfos2.cvgLocked).to.be.eq(ethers.parseEther("100"));
        expect(logoInfos2.lockEnd).to.be.eq(48n);
        expect(logoInfos2.ysPercentage).to.be.eq(30n);
        expect(logoInfos2.mgCvg).to.be.eq(28437500000000000000n);
        expect(logoInfos2.unlockingTimestamp).to.be.eq(0n);
        expect(logoInfos2.cvgLockedInUsd).to.be.eq(33000000000000000000n);
        expect(logoInfos2.claimableInUsd).to.be.eq(0n);
        expect(logoInfos2.ysCvgActual).to.be.eq(3046875000000000000n);
        expect(logoInfos2.ysCvgNext).to.be.eq(12187500000000000000n);
        withinPercentage(26727700000000000000n, logoInfos2.veCvg, 0.1);
        expect(logoInfos2.gaugePosition).to.be.deep.eq([135n, 314n]);
        expect(logoInfos2.isLocked).to.be.eq(false);
        expect(logoInfos2.hoursLock).to.be.eq(0n);
    });
    let unlockTimestamp1: number;
    let unlockTimestamp2: number;

    it("Success : Rendering SVG image of TOKEN_1, TOKEN_2 & TOKEN_3 before TDE_1, no claimable USD yet ", async () => {
        const blockBefore = await ethers.provider.getBlock("latest");
        const timestampBefore = blockBefore!.timestamp;
        const oneDayTimestamp = 86400;
        const oneHourTimestamp = 3600;
        unlockTimestamp1 = timestampBefore + oneDayTimestamp;
        unlockTimestamp2 = timestampBefore + oneHourTimestamp;
        await lockingPositionManagerContract.connect(user1).setLock(TOKEN_1, timestampBefore + oneDayTimestamp);
        await lockingPositionManagerContract.connect(user1).setLock(TOKEN_2, timestampBefore + oneHourTimestamp);
        render_svg(await lockingPositionManagerContract.tokenURI(TOKEN_1), "TOKEN_1_BEFORE_TDE1", PATH);
        render_svg(await lockingPositionManagerContract.tokenURI(TOKEN_2), "TOKEN_2_BEFORE_TDE1", PATH);
        render_svg(await lockingPositionManagerContract.tokenURI(TOKEN_3), "TOKEN_3_BEFORE_TDE1", PATH);
    });

    it("Success : Rendering SVG image of TOKEN_1, TOKEN_2 & TOKEN_3 after TDE_1 distribution", async () => {
        await increaseCvgCycle(contractUsers, 1);
        render_svg(await lockingPositionManagerContract.tokenURI(TOKEN_1), "TOKEN_1_TDE1", PATH);
        render_svg(await lockingPositionManagerContract.tokenURI(TOKEN_2), "TOKEN_2_TDE1", PATH);
        render_svg(await lockingPositionManagerContract.tokenURI(TOKEN_3), "TOKEN_3_TDE1", PATH);
    });
    let totalValueClaimableUsdToken2Tde1: bigint;
    it("Success : Check getLogoInfos of TOKEN_2 with claimable amounts", async () => {
        const logoInfos2 = await lockingLogo.getLogoInfo(TOKEN_2);
        expect(logoInfos2.tokenId).to.be.eq(TOKEN_2);
        expect(logoInfos2.cvgLocked).to.be.eq(ethers.parseEther("100"));
        expect(logoInfos2.lockEnd).to.be.eq(48n);
        expect(logoInfos2.ysPercentage).to.be.eq(30n);
        expect(logoInfos2.mgCvg).to.be.eq(28437500000000000000n);
        expect(logoInfos2.unlockingTimestamp).to.be.eq(unlockTimestamp2);
        expect(logoInfos2.cvgLockedInUsd).to.be.eq(33000000000000000000n);
        const [cvxPrice, crvPrice, wethPrice] = await Promise.all([
            await cvgOracle.getPriceUnverified(cvx),
            await cvgOracle.getPriceUnverified(crv),
            await cvgOracle.getPriceUnverified(weth),
        ]);
        totalValueClaimableUsdToken2Tde1 =
            (cvxPrice * BigInt(depositStructTDE1[0].amount) +
                crvPrice * BigInt(depositStructTDE1[1].amount) +
                wethPrice * BigInt(depositStructTDE1[2].amount)) /
            10n ** 18n;
        expect(logoInfos2.claimableInUsd).to.be.eq(totalValueClaimableUsdToken2Tde1);
        expect(logoInfos2.ysCvgActual).to.be.eq(12187500000000000000n);
        expect(logoInfos2.ysCvgNext).to.be.eq(12187500000000000000n);
        withinPercentage(25979374284074808054n, logoInfos2.veCvg, 0.2);
        expect(logoInfos2.gaugePosition).to.be.deep.eq([135n, 314n]);
        expect(logoInfos2.isLocked).to.be.eq(false);
        expect(logoInfos2.hoursLock).to.be.eq(0n);
    });

    it("Success : Check getLogoInfos of TOKEN_3", async () => {
        const logoInfos2 = await lockingLogo.getLogoInfo(TOKEN_3);
        expect(logoInfos2.tokenId).to.be.eq(TOKEN_3);
        expect(logoInfos2.cvgLocked).to.be.eq(ethers.parseEther("50"));
        expect(logoInfos2.lockEnd).to.be.eq(48n);
        expect(logoInfos2.ysPercentage).to.be.eq(30n);
        expect(logoInfos2.mgCvg).to.be.eq(13125000000000000000n);
        expect(logoInfos2.unlockingTimestamp).to.be.eq(0n);
        expect(logoInfos2.cvgLockedInUsd).to.be.eq(16500000000000000000n);
        expect(logoInfos2.claimableInUsd).to.be.eq(0n);
        expect(logoInfos2.ysCvgActual).to.be.eq(5625000000000000000n);
        expect(logoInfos2.ysCvgNext).to.be.eq(5625000000000000000n);
        withinPercentage(12989687142026517630n, logoInfos2.veCvg, 0.1);
        expect(logoInfos2.gaugePosition).to.be.deep.eq([135n, 314n]);
        expect(logoInfos2.isLocked).to.be.eq(false);
        expect(logoInfos2.hoursLock).to.be.eq(0n);
    });

    it("Success : Deposit for TDE_2 stables having decimals != 18", async () => {
        await ysdistributor.connect(users.treasuryPdd).depositMultipleToken(depositStructTDE2);
    });

    it("Success : Go in cycle 25", async () => {
        await increaseCvgCycle(contractUsers, 12);
    });
    let totalTde2Token2: bigint;

    it("Success : Check getLogoInfos of TOKEN_2 with claimable amounts", async () => {
        const logoInfos2 = await lockingLogo.getLogoInfo(TOKEN_2);
        expect(logoInfos2.tokenId).to.be.eq(TOKEN_2);
        expect(logoInfos2.cvgLocked).to.be.eq(ethers.parseEther("100"));
        expect(logoInfos2.lockEnd).to.be.eq(48n);
        expect(logoInfos2.ysPercentage).to.be.eq(30n);
        expect(logoInfos2.mgCvg).to.be.eq(28437500000000000000n);
        expect(logoInfos2.unlockingTimestamp).to.be.eq(unlockTimestamp2);
        expect(logoInfos2.cvgLockedInUsd).to.be.eq(33000000000000000000n);
        const [crvPrice, wethPrice] = await Promise.all([await cvgOracle.getPriceUnverified(crv), await cvgOracle.getPriceUnverified(weth)]);
        const balanceYs = await lockingPositionServiceContract.balanceOfYsCvgAt(TOKEN_2, 24);
        const totalYs = await lockingPositionServiceContract.totalSupplyYsCvgHistories(24);

        const crvUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[0].amount)) / totalYs) * crvPrice) / 10n ** 18n;
        const usdcUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[1].amount)) / totalYs) * 10n ** 18n) / 10n ** 6n;
        const usdtUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[2].amount)) / totalYs) * 10n ** 18n) / 10n ** 6n;
        const wethUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[3].amount)) / totalYs) * wethPrice) / 10n ** 18n;
        const daiUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[4].amount)) / totalYs) * 10n ** 18n) / 10n ** 18n;

        totalTde2Token2 = crvUsdAmountTde2 + usdcUsdAmountTde2 + usdtUsdAmountTde2 + wethUsdAmountTde2 + daiUsdAmountTde2;
        expect(logoInfos2.claimableInUsd).to.be.eq(totalTde2Token2 + totalValueClaimableUsdToken2Tde1);
        expect(logoInfos2.ysCvgActual).to.be.eq(12187500000000000000n);
        expect(logoInfos2.ysCvgNext).to.be.eq(12187500000000000000n);
        withinPercentage(17319582856049872036n, logoInfos2.veCvg, 0.01);
        expect(logoInfos2.gaugePosition).to.be.deep.eq([135n, 314n]);
        expect(logoInfos2.isLocked).to.be.eq(false);
        expect(logoInfos2.hoursLock).to.be.eq(0n);
    });

    let totalTde2Token3: bigint;
    it("Success : Check getLogoInfos of TOKEN_3", async () => {
        const logoInfos3 = await lockingLogo.getLogoInfo(TOKEN_3);
        expect(logoInfos3.tokenId).to.be.eq(TOKEN_3);
        expect(logoInfos3.cvgLocked).to.be.eq(ethers.parseEther("50"));
        expect(logoInfos3.lockEnd).to.be.eq(48n);
        expect(logoInfos3.ysPercentage).to.be.eq(30n);
        expect(logoInfos3.mgCvg).to.be.eq(13125000000000000000n);
        expect(logoInfos3.unlockingTimestamp).to.be.eq(0n);
        expect(logoInfos3.cvgLockedInUsd).to.be.eq(16500000000000000000n);
        const [crvPrice, wethPrice] = await Promise.all([await cvgOracle.getPriceUnverified(crv), await cvgOracle.getPriceUnverified(weth)]);
        const balanceYs = await lockingPositionServiceContract.balanceOfYsCvgAt(TOKEN_3, 24);
        const totalYs = await lockingPositionServiceContract.totalSupplyYsCvgHistories(24);

        const crvUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[0].amount)) / totalYs) * crvPrice) / 10n ** 18n;
        const usdcUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[1].amount)) / totalYs) * 10n ** 18n) / 10n ** 6n;
        const usdtUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[2].amount)) / totalYs) * 10n ** 18n) / 10n ** 6n;
        const wethUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[3].amount)) / totalYs) * wethPrice) / 10n ** 18n;
        const daiUsdAmountTde2 = (((balanceYs * BigInt(depositStructTDE2[4].amount)) / totalYs) * 10n ** 18n) / 10n ** 18n;
        totalTde2Token3 = crvUsdAmountTde2 + usdcUsdAmountTde2 + usdtUsdAmountTde2 + wethUsdAmountTde2 + daiUsdAmountTde2;
        expect(logoInfos3.claimableInUsd).to.be.eq(totalTde2Token3);
        expect(logoInfos3.ysCvgActual).to.be.eq(5625000000000000000n);
        expect(logoInfos3.ysCvgNext).to.be.eq(5625000000000000000n);
        withinPercentage(8659791428017678420n, logoInfos3.veCvg, 0.1);
        expect(logoInfos3.gaugePosition).to.be.deep.eq([135n, 314n]);
        expect(logoInfos3.isLocked).to.be.eq(false);
        expect(logoInfos3.hoursLock).to.be.eq(0n);
    });

    it("Success : Rendering SVG image of TOKEN_1, TOKEN_2 & TOKEN_3 at TDE_2", async () => {
        render_svg(await lockingPositionManagerContract.tokenURI(TOKEN_1), "TOKEN_1_TDE2", PATH);
        render_svg(await lockingPositionManagerContract.tokenURI(TOKEN_2), "TOKEN_2_TDE2", PATH);
        render_svg(await lockingPositionManagerContract.tokenURI(TOKEN_3), "TOKEN_3_TDE2", PATH);
    });

    it("Success : Claim on TOKEN_2 only TDE2", async () => {
        await ysdistributor.connect(user1).claimRewards(TOKEN_2, TDE_2, user1);
    });

    it("Success : Verify that it left only the amount from TDE2", async () => {
        const logoInfos2 = await lockingLogo.getLogoInfo(TOKEN_2);
        expect(logoInfos2.claimableInUsd).to.be.eq(totalValueClaimableUsdToken2Tde1);
    });

    it("Success : Claim TDE that left on TOKEN_2 & TOKEN_3", async () => {
        await ysdistributor.connect(user1).claimRewards(TOKEN_2, TDE_1, user1);
        await ysdistributor.connect(user1).claimRewards(TOKEN_3, TDE_2, user1);

        const logoInfos2 = await lockingLogo.getLogoInfo(TOKEN_2);
        expect(logoInfos2.claimableInUsd).to.be.eq(0n);

        const logoInfos3 = await lockingLogo.getLogoInfo(TOKEN_3);
        expect(logoInfos3.claimableInUsd).to.be.eq(0n);
    });
});
