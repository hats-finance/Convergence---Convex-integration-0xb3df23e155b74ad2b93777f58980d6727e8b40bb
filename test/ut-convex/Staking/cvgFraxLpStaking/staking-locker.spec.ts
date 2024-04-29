import {loadFixture, mine} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, Signer} from "ethers";
import {
    Cvg,
    CvgFraxLpLocker,
    CvgFraxLpStakingService,
    CvxRewardDistributor,
    CvxStakingPositionManager,
    ERC20,
    IConvexStaking,
    IConvexVault,
    ICurveLp,
    LockingPositionService,
} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {OWNABLE_REVERT} from "../../../../resources/revert";
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {CLAIMER_REWARDS_PERCENTAGE, CYCLE_2, MINT, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_4, TOKEN_5, TOKEN_6} from "../../../../resources/constant";
import {GaugeController} from "../../../../typechain-types-vyper";
import {getExpectedCvgCvxRewards} from "../../../../utils/stakeDao/getStakingShareForCycle";

import {TypedContractEvent, TypedDeferredTopicFilter} from "../../../../typechain-types/common";
import {ClaimCvgCvxMultipleEvent, ClaimCvgMultipleEvent} from "../../../../typechain-types/contracts/Staking/Convex/CvxStakingPositionService";

//eUSD/FRAXP
const convexBooster = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
const stakingAddress = "0x4c9AD8c53d0a001E7fF08a3E5E26dE6795bEA5ac";
const stakingToken = "0x49BF6f9B860fAF73B0b515c06Be1Bcbf4A0db3dF";
const stakerVoterProxy = "0x989AEb4d175e16225E39E87d0D97A3360524AD80";
const gaugeCurve = "0x8605dc0c339a2e7e85eea043bd29d42da2c6d784";

const FEE_FOR_NON_LOCKER = 1000n;
const DENOMINATOR = 100000n;

describe("cvgFraxLpStaking - Staking Locker", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer, owner: Signer, user1: Signer, user2: Signer, user3: Signer;
    let cvg: Cvg, cvx: ERC20, fxs: ERC20, crv: ERC20, usdc: ERC20, frax: ERC20, eusd: ERC20, fraxbp: ERC20, fraxbpPool: ICurveLp, eusdfraxbp: ICurveLp;
    let cvgeUSDFRAXBPLocker: CvgFraxLpLocker;
    let cvgeUSDFRAXBPStaking: CvgFraxLpStakingService;
    let cvxcvgeUSDFRAXBPStaking: IConvexStaking;
    let eUSDFRAXBPVault: IConvexVault;
    let cvxRewardDistributor: CvxRewardDistributor;
    let cvxStakingPositionManager: CvxStakingPositionManager;
    let gaugeController: GaugeController, lockingPositionService: LockingPositionService;
    let currentCycle: bigint;
    let CYCLE_1: bigint, CYCLE_2: bigint, CYCLE_3: bigint, CYCLE_4: bigint, CYCLE_5: bigint;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        user3 = users.user3;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);
        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;
        crv = contractsUsers.contractsUserMainnet.globalAssets.crv;
        usdc = contractsUsers.contractsUserMainnet.globalAssets.usdc;
        frax = contractsUsers.contractsUserMainnet.globalAssets.frax;
        eusd = contractsUsers.contractsUserMainnet.convexAssets!.eusd;
        fraxbp = contractsUsers.contractsUserMainnet.convexAssets!.fraxbp;
        fraxbpPool = contractsUsers.contractsUserMainnet.curveLps!.fraxbp;
        eusdfraxbp = contractsUsers.contractsUserMainnet.curveLps!.eusdfraxbp;
        cvgeUSDFRAXBPStaking = contractsUsers.convex.cvgFraxLpStaking.cvgeUSDFRAXBPStaking;
        cvgeUSDFRAXBPLocker = contractsUsers.convex.cvgFraxLpLocker.cvgeUSDFRAXBPLocker;
        eUSDFRAXBPVault = contractsUsers.convex.convexVault.eUSDFRAXBPVault;
        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;
        cvxStakingPositionManager = contractsUsers.convex.cvxStakingPositionManager;
        lockingPositionService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;

        cvxcvgeUSDFRAXBPStaking = await ethers.getContractAt("IConvexStaking", await eUSDFRAXBPVault.stakingAddress());

        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();
        CYCLE_1 = currentCycle;
        CYCLE_2 = currentCycle + 1n;
        CYCLE_3 = currentCycle + 2n;
        CYCLE_4 = currentCycle + 3n;
        CYCLE_5 = currentCycle + 4n;

        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).add_gauge(cvgeUSDFRAXBPStaking, 0, 0);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).toggle_vote_pause(cvgeUSDFRAXBPStaking);

        // transfer 1 wei of to initialize the staker position of the locker contract
        await eusdfraxbp.transfer(cvgeUSDFRAXBPLocker, "1");
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setupLocker(cvgeUSDFRAXBPStaking);
    });
    it("Success: deposit lp with lock", async () => {
        const amount = ethers.parseEther("10");
        await eusdfraxbp.connect(user1).approve(cvgeUSDFRAXBPLocker, amount);
        const deposit = await cvgeUSDFRAXBPStaking.connect(user1).depositLp(MINT, amount, true);
        await expect(deposit).to.changeTokenBalances(eusdfraxbp, [user1, gaugeCurve], [-amount, amount]);
        await expect(deposit).to.changeTokenBalances(cvgeUSDFRAXBPLocker, [cvgeUSDFRAXBPStaking, user1], [amount, 0]);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_1)).to.be.deep.equal([amount, amount]);
    });
    it("Success: deposit lp without lock", async () => {
        const amount = ethers.parseEther("10");
        await eusdfraxbp.connect(user1).approve(cvgeUSDFRAXBPLocker, amount);
        const depositTx = await cvgeUSDFRAXBPStaking.connect(user1).depositLp(MINT, amount, false);
        await expect(depositTx).to.changeTokenBalances(eusdfraxbp, [user1, cvgeUSDFRAXBPLocker], [-amount, amount]);
        await expect(depositTx).to.changeTokenBalances(cvgeUSDFRAXBPLocker, [cvgeUSDFRAXBPStaking, user1], [amount, 0]);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_2)).to.be.deep.equal([amount, amount]);
    });
    it("Success: deposit with Lp assets", async () => {
        const eUSDAmount = ethers.parseEther("10");
        const fraxBPAmount = ethers.parseEther("10");
        const lp_amount_out = await eusdfraxbp.calc_token_amount([eUSDAmount, fraxBPAmount], true);
        const balBefore = await cvgeUSDFRAXBPLocker.balanceOf(cvgeUSDFRAXBPStaking);
        await eusd.connect(user1).approve(cvgeUSDFRAXBPLocker, eUSDAmount);
        await fraxbp.connect(user1).approve(cvgeUSDFRAXBPLocker, fraxBPAmount);
        const depositTx = await cvgeUSDFRAXBPStaking.connect(user1).depositLpAssets(MINT, [eUSDAmount, fraxBPAmount], 0, true);
        expect(depositTx).to.changeTokenBalances(eusd, [user1, cvgeUSDFRAXBPLocker], [-eUSDAmount, 0]);
        expect(depositTx).to.changeTokenBalances(fraxbp, [user1, cvgeUSDFRAXBPLocker], [-fraxBPAmount, 0]);
        const balAfter = await cvgeUSDFRAXBPLocker.balanceOf(cvgeUSDFRAXBPStaking);
        const amount = balAfter - balBefore;
        expect(amount).to.be.approximately(lp_amount_out, parseEther("0.01"));
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_3)).to.be.deep.equal([amount, amount]);
    });
    it("Success: deposit lp asset without lock", async () => {
        const eUSDAmount = ethers.parseEther("10");
        const fraxBPAmount = ethers.parseEther("10");
        const eUSDAmountFees = (eUSDAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const fraxBPAmountFees = (fraxBPAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const lp_amount_out = await eusdfraxbp.calc_token_amount([eUSDAmount - eUSDAmountFees, fraxBPAmount - fraxBPAmountFees], true);
        const balBefore = await cvgeUSDFRAXBPLocker.balanceOf(cvgeUSDFRAXBPStaking);
        await eusd.connect(user1).approve(cvgeUSDFRAXBPLocker, eUSDAmount);
        await fraxbp.connect(user1).approve(cvgeUSDFRAXBPLocker, fraxBPAmount);
        const depositTx = await cvgeUSDFRAXBPStaking.connect(user1).depositLpAssets(MINT, [eUSDAmount, fraxBPAmount], 0, false);
        await expect(depositTx).to.changeTokenBalances(eusd, [user1, cvgeUSDFRAXBPLocker], [-eUSDAmount, eUSDAmountFees]);
        await expect(depositTx).to.changeTokenBalances(fraxbp, [user1, cvgeUSDFRAXBPLocker], [-fraxBPAmount, fraxBPAmountFees]);
        const balAfter = await cvgeUSDFRAXBPLocker.balanceOf(cvgeUSDFRAXBPStaking);
        const amount = balAfter - balBefore;
        expect(amount).to.be.approximately(lp_amount_out, parseEther("0.01"));
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_4)).to.be.deep.equal([amount, amount]);
    });
    it("Success: deposit lp asset frax/usdc with lock", async () => {
        const eUSDAmount = ethers.parseEther("10");
        const fraxAmount = ethers.parseEther("10");
        const usdcAmount = ethers.parseUnits("10", 6);
        const fraxbp_amount_out = await fraxbpPool.calc_token_amount([fraxAmount, usdcAmount], true);
        const lp_amount_out = await eusdfraxbp.calc_token_amount([eUSDAmount, fraxbp_amount_out], true);
        const balBefore = await cvgeUSDFRAXBPLocker.balanceOf(cvgeUSDFRAXBPStaking);
        await eusd.connect(user1).approve(cvgeUSDFRAXBPLocker, eUSDAmount);
        await frax.connect(user1).approve(cvgeUSDFRAXBPLocker, fraxAmount);
        await usdc.connect(user1).approve(cvgeUSDFRAXBPLocker, usdcAmount);
        const depositTx = await cvgeUSDFRAXBPStaking.connect(user1).depositLpAssetUnderlying(MINT, [eUSDAmount, fraxAmount, usdcAmount], 0, 0, true);
        await expect(depositTx).to.changeTokenBalances(eusd, [user1, cvgeUSDFRAXBPLocker], [-eUSDAmount, 0]);
        await expect(depositTx).to.changeTokenBalances(frax, [user1, cvgeUSDFRAXBPLocker], [-fraxAmount, 0]);
        await expect(depositTx).to.changeTokenBalances(usdc, [user1, cvgeUSDFRAXBPLocker], [-usdcAmount, 0]);
        const balAfter = await cvgeUSDFRAXBPLocker.balanceOf(cvgeUSDFRAXBPStaking);
        const amount = balAfter - balBefore;
        expect(amount).to.be.approximately(lp_amount_out, parseEther("0.01"));
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_5)).to.be.deep.equal([amount, amount]);
    });
    it("Success: deposit lp asset frax/usdc without lock", async () => {
        const eUSDAmount = ethers.parseEther("10");
        const fraxAmount = ethers.parseEther("10");
        const usdcAmount = ethers.parseUnits("10", 6);
        const eUSDAmountFees = (eUSDAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const fraxAmountFees = (fraxAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const usdcAmountFees = (usdcAmount * FEE_FOR_NON_LOCKER) / DENOMINATOR;
        const fraxbp_amount_out = await fraxbpPool.calc_token_amount([fraxAmount - fraxAmountFees, usdcAmount - usdcAmountFees], true);
        const lp_amount_out = await eusdfraxbp.calc_token_amount([eUSDAmount - eUSDAmountFees, fraxbp_amount_out], true);
        const balBefore = await cvgeUSDFRAXBPLocker.balanceOf(cvgeUSDFRAXBPStaking);
        await eusd.connect(user1).approve(cvgeUSDFRAXBPLocker, eUSDAmount);
        await frax.connect(user1).approve(cvgeUSDFRAXBPLocker, fraxAmount);
        await usdc.connect(user1).approve(cvgeUSDFRAXBPLocker, usdcAmount);
        const depositTx = await cvgeUSDFRAXBPStaking.connect(user1).depositLpAssetUnderlying(MINT, [eUSDAmount, fraxAmount, usdcAmount], 0, 0, false);
        await expect(depositTx).to.changeTokenBalances(eusd, [user1, cvgeUSDFRAXBPLocker], [-eUSDAmount, eUSDAmountFees]);
        await expect(depositTx).to.changeTokenBalances(frax, [user1, cvgeUSDFRAXBPLocker], [-fraxAmount, fraxAmountFees]);
        await expect(depositTx).to.changeTokenBalances(usdc, [user1, cvgeUSDFRAXBPLocker], [-usdcAmount, usdcAmountFees]);
        const balAfter = await cvgeUSDFRAXBPLocker.balanceOf(cvgeUSDFRAXBPStaking);
        const amount = balAfter - balBefore;
        expect(amount).to.be.approximately(lp_amount_out, parseEther("0.01"));
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_6)).to.be.deep.equal([amount, amount]);
    });
});
