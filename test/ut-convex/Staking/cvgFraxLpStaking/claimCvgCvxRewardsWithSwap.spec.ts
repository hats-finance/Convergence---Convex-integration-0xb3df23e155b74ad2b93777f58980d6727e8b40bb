import {loadFixture, mine} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {Signer} from "ethers";
import {
    Cvg,
    CvgFraxLpLocker,
    CvgFraxLpStakingService,
    CvxRewardDistributor,
    CvxStakingPositionManager,
    ERC20,
    IConvexStaking,
    IConvexVault,
    ICrvPoolPlain,
    ICurveLp,
    LockingPositionService,
} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {CLAIMER_REWARDS_PERCENTAGE, MINT, TOKEN_1, TOKEN_2} from "../../../../resources/constant";
import {getExpectedCvgCvxRewards} from "../../../../utils/stakeDao/getStakingShareForCycle";

//eUSD/FRAXP

const DENOMINATOR = 100000n;

describe("cvgFraxLpStaking - Claim CvgCvx Rewards Rewards With Swap Or Mint", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer, owner: Signer, user1: Signer, user2: Signer, user3: Signer;
    let cvg: Cvg, cvx: ERC20, fxs: ERC20, crv: ERC20, usdc: ERC20, frax: ERC20, eusd: ERC20, fraxbp: ERC20, eusdfraxbp: ICurveLp;
    let cvgeUSDFRAXBPLocker: CvgFraxLpLocker;
    let cvgeUSDFRAXBPStaking: CvgFraxLpStakingService;
    let cvxcvgeUSDFRAXBPStaking: IConvexStaking;
    let eUSDFRAXBPVault: IConvexVault;
    let cvxRewardDistributor: CvxRewardDistributor;
    let cvxStakingPositionManager: CvxStakingPositionManager;
    let lockingPositionService: LockingPositionService;
    let currentCycle: bigint;
    let depositedAmountUser1 = ethers.parseEther("5000"),
        depositedAmountUser2 = ethers.parseEther("100000"),
        withdrawAmount = ethers.parseEther("4000");
    let CYCLE_1: bigint, CYCLE_2: bigint, CYCLE_3: bigint, CYCLE_4: bigint, CYCLE_5: bigint;
    let poolCvgCvxCvx1: ICrvPoolPlain;
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
        fraxbp = contractsUsers.contractsUserMainnet.globalAssets!.fraxBp;
        eusdfraxbp = contractsUsers.contractsUserMainnet.curveLps!.eusdfraxbp;
        cvgeUSDFRAXBPStaking = contractsUsers.convex.cvgFraxLpStaking.cvgeUSDFRAXBPStaking;
        cvgeUSDFRAXBPLocker = contractsUsers.convex.cvgFraxLpLocker.cvgeUSDFRAXBPLocker;
        eUSDFRAXBPVault = contractsUsers.convex.convexVault.eUSDFRAXBPVault;
        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;
        cvxStakingPositionManager = contractsUsers.convex.cvxStakingPositionManager;
        lockingPositionService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;
        poolCvgCvxCvx1 = contractsUsers.convex.cvgCvxCvx1PoolContract;

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

        // mint locking position and vote for cvgSdtStaking gauge
        const lockingEndCycle = 96n - currentCycle;
        // console.log("lockingEndCycle", lockingEndCycle);
        const tokenId = await contractsUsers.contractsUserMainnet.locking.lockingPositionManager.nextId();
        await cvg.approve(lockingPositionService, ethers.parseEther("300000"));
        await lockingPositionService.mintPosition(lockingEndCycle, ethers.parseEther("100000"), 0, owner, true);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.simple_vote(tokenId, cvgeUSDFRAXBPStaking, 1000);

        //mint cvgeUSDFRAXBP
        await eusdfraxbp.connect(owner).approve(cvgeUSDFRAXBPLocker, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(owner).depositLp(ethers.parseEther("3000000"), true, owner);

        //transfer cvgeUSDFRAXBP to users
        await cvgeUSDFRAXBPLocker.transfer(user1, ethers.parseEther("1000000"));
        await cvgeUSDFRAXBPLocker.transfer(user2, ethers.parseEther("1000000"));
        await cvgeUSDFRAXBPLocker.transfer(user3, ethers.parseEther("1000000"));

        // approve cvgSdt spending from staking contract
        await cvgeUSDFRAXBPLocker.connect(user1).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(user2).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(user3).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);

        //deposit
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(MINT, depositedAmountUser1);
        await cvgeUSDFRAXBPStaking.connect(user2).deposit(MINT, depositedAmountUser2);
    });
    it("Success : Processing rewards & Updating cvg cycle to 1", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_2);
    });

    it("Success : Withdrawing user2 at cycle 2", async () => {
        await cvgeUSDFRAXBPStaking.connect(user2).withdraw(TOKEN_2, withdrawAmount);
        expect(await cvgeUSDFRAXBPStaking.stakingHistoryByToken(TOKEN_2, 0)).to.be.eq(CYCLE_2);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_2)).to.be.deep.eq([depositedAmountUser2 - withdrawAmount, depositedAmountUser2]);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_3, TOKEN_2)).to.be.deep.eq([depositedAmountUser2 - withdrawAmount, 0]);
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_2)).to.be.deep.eq([0, depositedAmountUser1 + depositedAmountUser2 - withdrawAmount, false]);
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_3)).to.be.deep.eq([0, depositedAmountUser1 + depositedAmountUser2 - withdrawAmount, false]);
    });

    it("Success : Processing rewards & update cvg cycle to 3 should compute right infos", async () => {
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);
        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_3);
    });
    it("Success : Process Convex for cycle 2.", async () => {
        const amountCvx = ethers.parseEther("1000");
        const amountCrv = ethers.parseEther("400");
        const amountfxs = ethers.parseEther("200");

        //simulate getReward call with the owner
        const getRewards = await cvgeUSDFRAXBPLocker.connect(treasuryDao).getReward.staticCall();

        //rewards distribution
        await cvx.transfer(cvgeUSDFRAXBPLocker, amountCvx);
        await crv.transfer(cvgeUSDFRAXBPLocker, amountCrv);
        await fxs.transfer(cvgeUSDFRAXBPLocker, amountfxs);

        //process
        await cvgeUSDFRAXBPStaking.processCvxRewards();

        const rewardForCycle = await cvgeUSDFRAXBPStaking.getProcessedCvxRewards(CYCLE_2);
        const expectedCvxAmount = ((amountCvx + getRewards[0]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedCrvAmount = ((amountCrv + getRewards[1]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        const expectedFxsAmount = ((amountfxs + getRewards[2]) * (DENOMINATOR - CLAIMER_REWARDS_PERCENTAGE)) / DENOMINATOR;
        expect(rewardForCycle[0].token).to.deep.eq(await cvx.getAddress());
        expect(rewardForCycle[0].amount).to.be.approximately(expectedCvxAmount, ethers.parseEther("0.1"));
        expect(rewardForCycle[1].token).to.deep.eq(await crv.getAddress());
        expect(rewardForCycle[1].amount).to.be.approximately(expectedCrvAmount, ethers.parseEther("0.1"));
        expect(rewardForCycle[2].token).to.deep.eq(await fxs.getAddress());
        expect(rewardForCycle[2].amount).to.be.approximately(expectedFxsAmount, ethers.parseEther("0.1"));
    });
    it("Success : ClaimCvgSdtRewards for cycle 2 with convert and mint", async () => {
        await mine();
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_1, CYCLE_2);
        const cvxRewards = cycle2RewardsExpected[1];
        const crvRewards = cycle2RewardsExpected[2];
        const fxsRewards = cycle2RewardsExpected[3];

        const cvgCVXMintFees = cvxRewards / 100n;
        const tx = cvgeUSDFRAXBPStaking.connect(user1).claimCvgCvxRewards(TOKEN_1, 0, true);
        await expect(tx).to.changeTokenBalances(cvx, [user1], [0]);
        await expect(tx).to.changeTokenBalances(contractsUsers.convex.cvxConvergenceLocker, [user1], [cvxRewards - cvgCVXMintFees]);
        await expect(tx).to.changeTokenBalances(crv, [user1], [crvRewards]);
        await expect(tx).to.changeTokenBalances(fxs, [user1], [fxsRewards]);

        expect(await cvgeUSDFRAXBPStaking.nextClaims(TOKEN_1)).to.be.deep.equal([CYCLE_3, CYCLE_3]);
    });
    it("Fails : ClaimCvgCvxRewards for cycle N+1 with convert only with min CVX amount too high", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_2, currentCycle + 1n);

        const cvxRewards = cycle2RewardsExpected[1];
        const cvx_dy = await poolCvgCvxCvx1.get_dy(0, 1, cvxRewards);

        const tx = cvgeUSDFRAXBPStaking.connect(users.user2).claimCvgCvxRewards(TOKEN_2, cvx_dy + 1n, true);
        await expect(tx).to.be.revertedWith("Exchange resulted in fewer coins than expected");
    });

    it("Success : ClaimCvgSdtRewards for cycle 2 with convert only", async () => {
        const cycle2RewardsExpected = await getExpectedCvgCvxRewards(cvgeUSDFRAXBPStaking, TOKEN_2, CYCLE_2);
        const cvxRewards = cycle2RewardsExpected[1];
        const cvx_dy = await poolCvgCvxCvx1.get_dy(0, 1, cvxRewards);

        const slippage = 5n;
        const minCvgSdtAmountOut = cvx_dy - (cvx_dy * slippage) / 1000n; // 0.5%

        const tx = cvgeUSDFRAXBPStaking.connect(user2).claimCvgCvxRewards(TOKEN_2, minCvgSdtAmountOut, true);
        await expect(tx).to.changeTokenBalances(cvx, [user2], [0]);
        await expect(tx).to.changeTokenBalances(contractsUsers.convex.cvxConvergenceLocker, [user2], [cvx_dy]);

        expect(await cvgeUSDFRAXBPStaking.nextClaims(TOKEN_2)).to.be.deep.equal([CYCLE_3, CYCLE_3]);
    });
});
