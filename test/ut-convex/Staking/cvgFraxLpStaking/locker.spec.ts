import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {Signer} from "ethers";
import {CvgFraxLpLocker, CvgFraxLpStakingService, CvxRewardDistributor, ERC20, IConvexVault, ICurveLp} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {OWNABLE_REVERT} from "../../../../resources/revert";
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
//eUSD/FRAXP
const gaugeCurve = "0x8605dc0c339a2e7e85eea043bd29d42da2c6d784";

const FEE_FOR_NON_LOCKER = 1000n;
const DENOMINATOR = 100000n;

describe("cvgFraxLpLocker Test", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer, user1: Signer;
    let cvx: ERC20, fxs: ERC20, crv: ERC20, usdc: ERC20, frax: ERC20, eusd: ERC20, fraxbp: ERC20, eusdfraxbp: ICurveLp;
    let cvgeUSDFRAXBPLocker: CvgFraxLpLocker;
    let cvgeUSDFRAXBPStaking: CvgFraxLpStakingService;
    let eUSDFRAXBPVault: IConvexVault;
    let cvxRewardDistributor: CvxRewardDistributor;
    let currentCycle: bigint;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        user1 = users.user1;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;
        crv = contractsUsers.contractsUserMainnet.globalAssets.crv;
        usdc = contractsUsers.contractsUserMainnet.globalAssets.usdc;
        frax = contractsUsers.contractsUserMainnet.globalAssets.frax;
        eusd = contractsUsers.contractsUserMainnet.convexAssets!.eusd;
        fraxbp = contractsUsers.contractsUserMainnet.globalAssets!.fraxBp;
        eusdfraxbp = contractsUsers.contractsUserMainnet.curveLps!.eusdfraxbp;
        cvgeUSDFRAXBPStaking = contractsUsers.convex.cvgFraxLpStaking.cvgeUSDFRAXBPStaking;
        cvgeUSDFRAXBPLocker = contractsUsers.convex.cvgFraxLpLocker.cvgeUSDFRAXBPLocker;
        eUSDFRAXBPVault = contractsUsers.convex.convexVault.eUSDFRAXBPVault;
        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;

        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();

        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).add_gauge(cvgeUSDFRAXBPStaking, 0, 0);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).toggle_vote_pause(cvgeUSDFRAXBPStaking);
    });
    it("Fail: Setup CvgFraxLpLocker contract with random user", async () => {
        await cvgeUSDFRAXBPLocker.setupLocker(cvgeUSDFRAXBPStaking).should.be.revertedWith(OWNABLE_REVERT);
    });
    it("Fail: Setup CvgFraxLpLocker contract", async () => {
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setupLocker(cvgeUSDFRAXBPStaking).should.be.revertedWith("NO_CURVE_LP");
    });
    it("Success: Setup CvgFraxLpLocker contract", async () => {
        // transfer 1 wei of to initialize the staker position of the locker contract
        await eusdfraxbp.transfer(cvgeUSDFRAXBPLocker, "1");
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setupLocker(cvgeUSDFRAXBPStaking);
    });
    it("Fail: Setup CvgFraxLpLocker contract", async () => {
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setupLocker(cvgeUSDFRAXBPStaking).should.be.revertedWith("LOCKER_ALREADY_SET");
    });
    it("Success: deposit lp with lock", async () => {
        const amount = ethers.parseEther("10");
        await eusdfraxbp.connect(user1).approve(cvgeUSDFRAXBPLocker, amount);
        const deposit = await cvgeUSDFRAXBPLocker.connect(user1).depositLp(amount, true, user1);
        await expect(deposit).to.changeTokenBalances(eusdfraxbp, [user1, gaugeCurve], [-amount, amount]);
        await expect(deposit).to.changeTokenBalances(cvgeUSDFRAXBPLocker, [user1], [amount]);
    });
    it("Success: deposit lp without lock", async () => {
        const amount = ethers.parseEther("10");
        await eusdfraxbp.connect(user1).approve(cvgeUSDFRAXBPLocker, amount);
        const depositTx = await cvgeUSDFRAXBPLocker.connect(user1).depositLp(amount, false, user1);
        await expect(depositTx).to.changeTokenBalances(eusdfraxbp, [user1, cvgeUSDFRAXBPLocker], [-amount, amount]);
        await expect(depositTx).to.changeTokenBalances(cvgeUSDFRAXBPLocker, [user1], [amount]);
    });
    it("Success: deposit lp asset with lock", async () => {
        const eUSDAmount = ethers.parseEther("10");
        const fraxBPAmount = ethers.parseEther("10");
        //TODO: calc_token_amount is not precize at all it's only used to calculate a slippage but this will not give the exact output amount
        await eusd.connect(user1).approve(cvgeUSDFRAXBPLocker, eUSDAmount);
        await fraxbp.connect(user1).approve(cvgeUSDFRAXBPLocker, fraxBPAmount);
        const depositTx = await cvgeUSDFRAXBPLocker.connect(user1).depositLpAssets([eUSDAmount, fraxBPAmount], 0, true, user1);
        await expect(depositTx).to.changeTokenBalances(eusd, [user1, cvgeUSDFRAXBPLocker], [-eUSDAmount, 0]);
        await expect(depositTx).to.changeTokenBalances(fraxbp, [user1, cvgeUSDFRAXBPLocker], [-fraxBPAmount, 0]);
        // await expect(depositTx).to.changeTokenBalances(cvgeUSDFRAXBPLocker, [user1], [lp_amount_out]); //Imposible to determinate in advance this amount
    });
    it("Success: deposit lp asset without lock", async () => {
        const eUSDAmount = ethers.parseEther("10");
        const fraxBPAmount = ethers.parseEther("10");
        const eUSDAmountFees = (eUSDAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const fraxBPAmountFees = (fraxBPAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        //TODO: calc_token_amount is not precize at all it's only used to calculate a slippage but this will not give the exact output amount
        // const lp_amount_out = await eusdfraxbp.calc_token_amount([eUSDAmount, fraxBPAmount], true);
        await eusd.connect(user1).approve(cvgeUSDFRAXBPLocker, eUSDAmount);
        await fraxbp.connect(user1).approve(cvgeUSDFRAXBPLocker, fraxBPAmount);
        const depositTx = await cvgeUSDFRAXBPLocker.connect(user1).depositLpAssets([eUSDAmount, fraxBPAmount], 0, false, user1);
        await expect(depositTx).to.changeTokenBalances(eusd, [user1, cvgeUSDFRAXBPLocker], [-eUSDAmount, eUSDAmountFees]);
        await expect(depositTx).to.changeTokenBalances(fraxbp, [user1, cvgeUSDFRAXBPLocker], [-fraxBPAmount, fraxBPAmountFees]);
        // await expect(depositTx).to.changeTokenBalances(cvgeUSDFRAXBPLocker, [user1], [lp_amount_out]); //Imposible to determinate in advance this amount
    });
    it("Success: deposit lp asset frax/usdc with lock", async () => {
        const eUSDAmount = ethers.parseEther("10");
        const fraxAmount = ethers.parseEther("10");
        const usdcAmount = ethers.parseUnits("10", 6);
        await eusd.connect(user1).approve(cvgeUSDFRAXBPLocker, eUSDAmount);
        await frax.connect(user1).approve(cvgeUSDFRAXBPLocker, fraxAmount);
        await usdc.connect(user1).approve(cvgeUSDFRAXBPLocker, usdcAmount);
        const depositTx = await cvgeUSDFRAXBPLocker.connect(user1).depositLpAssetUnderlying([eUSDAmount, fraxAmount, usdcAmount], 0, 0, true, user1);
        await expect(depositTx).to.changeTokenBalances(eusd, [user1, cvgeUSDFRAXBPLocker], [-eUSDAmount, 0]);
        await expect(depositTx).to.changeTokenBalances(frax, [user1, cvgeUSDFRAXBPLocker], [-fraxAmount, 0]);
        await expect(depositTx).to.changeTokenBalances(usdc, [user1, cvgeUSDFRAXBPLocker], [-usdcAmount, 0]);
    });
    it("Success: deposit lp asset frax/usdc without lock", async () => {
        const eUSDAmount = ethers.parseEther("10");
        const fraxAmount = ethers.parseEther("10");
        const usdcAmount = ethers.parseUnits("10", 6);
        await eusd.connect(user1).approve(cvgeUSDFRAXBPLocker, eUSDAmount);
        await frax.connect(user1).approve(cvgeUSDFRAXBPLocker, fraxAmount);
        await usdc.connect(user1).approve(cvgeUSDFRAXBPLocker, usdcAmount);
        const eUSDAmountFees = (eUSDAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const fraxAmountFees = (fraxAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const usdcAmountFees = (usdcAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const depositTx = await cvgeUSDFRAXBPLocker.connect(user1).depositLpAssetUnderlying([eUSDAmount, fraxAmount, usdcAmount], 0, 0, false, user1);
        await expect(depositTx).to.changeTokenBalances(eusd, [user1, cvgeUSDFRAXBPLocker], [-eUSDAmount, eUSDAmountFees]);
        await expect(depositTx).to.changeTokenBalances(frax, [user1, cvgeUSDFRAXBPLocker], [-fraxAmount, fraxAmountFees]);
        await expect(depositTx).to.changeTokenBalances(usdc, [user1, cvgeUSDFRAXBPLocker], [-usdcAmount, usdcAmountFees]);
    });
    it("Success: increaseLock and get fees", async () => {
        const eUSDAmount = ethers.parseEther("10");
        const fraxBPAmount = ethers.parseEther("10");
        const fraxAmount = ethers.parseEther("10");
        const usdcAmount = ethers.parseUnits("10", 6);
        const eUSDAmountFees = ((eUSDAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR) * 2n; //*2 because there is 2 deposit of 10 eUSD without lock
        const fraxBPAmountFees = (fraxBPAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const fraxAmountFees = (fraxAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const usdcAmountFees = (usdcAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const pendingLp = await eusdfraxbp.balanceOf(cvgeUSDFRAXBPLocker);

        const increaseTx = await cvgeUSDFRAXBPLocker.connect(user1).increaseLock();
        await expect(increaseTx).to.changeTokenBalances(eusdfraxbp, [cvgeUSDFRAXBPLocker, gaugeCurve], [-pendingLp, pendingLp]);
        await expect(increaseTx).to.changeTokenBalances(eusd, [cvgeUSDFRAXBPLocker, user1], [-eUSDAmountFees, eUSDAmountFees]);
        await expect(increaseTx).to.changeTokenBalances(fraxbp, [cvgeUSDFRAXBPLocker, user1], [-fraxBPAmountFees, fraxBPAmountFees]);
        await expect(increaseTx).to.changeTokenBalances(frax, [cvgeUSDFRAXBPLocker, user1], [-fraxAmountFees, fraxAmountFees]);
        await expect(increaseTx).to.changeTokenBalances(usdc, [cvgeUSDFRAXBPLocker, user1], [-usdcAmountFees, usdcAmountFees]);
    });
    it("Fail: increaseLock without pending LP", async () => {
        await cvgeUSDFRAXBPLocker.connect(user1).increaseLock().should.be.revertedWith("NO_PENDING_LP");
    });
    it("Fail: pullRewards with random user", async () => {
        await cvgeUSDFRAXBPLocker.connect(user1).pullRewards(user1).should.be.revertedWith("NOT_CVX_REWARD_DISTRIBUTOR");
    });

    it("Success: deposit in staking with user1", async () => {
        const balance = await cvgeUSDFRAXBPLocker.balanceOf(user1);
        await cvgeUSDFRAXBPLocker.connect(user1).approve(cvgeUSDFRAXBPStaking, balance);
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(0, balance);
    });
    it("Success : Processing rewards & Updating cvg cycle", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 2);

        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(currentCycle + 2n);
    });
    it("Success: processCvxRewards", async () => {
        await cvgeUSDFRAXBPStaking.processCvxRewards();
    });

    it("Fails: get reward without being owner", async () => {
        await cvgeUSDFRAXBPLocker.getReward().should.be.revertedWith(OWNABLE_REVERT);
    });
});
