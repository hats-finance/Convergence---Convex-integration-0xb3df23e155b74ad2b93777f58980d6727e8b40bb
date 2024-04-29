import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {Signer, EventLog} from "ethers";
import {ethers} from "hardhat";
import {
    ERC20,
    SdtStakingPositionService,
    ISdAssetGauge,
    SdtRewardDistributor,
    ILpStakeDaoStrat,
    CloneFactory,
    LockingPositionService,
    ICrvPoolPlain,
} from "../../../../../typechain-types";
import {IContractsUser, IUsers} from "../../../../../utils/contractInterface";
import {deploySdtStakingFixture, increaseCvgCycle} from "../../../../fixtures/stake-dao";
import {takesGaugeOwnershipAndSetDistributor} from "../../../../../utils/stakeDao/takesGaugeOwnershipAndSetDistributor";
import {distributeGaugeRewards} from "../../../../../utils/stakeDao/distributeGaugeRewards";
import {
    CYCLE_2,
    CYCLE_3,
    CYCLE_4,
    CYCLE_5,
    CYCLE_6,
    MINT,
    TOKEN_1,
    TOKEN_10,
    TOKEN_12,
    TOKEN_3,
    TOKEN_4,
    TOKEN_5,
    TOKEN_6,
    TOKEN_7,
    TOKEN_8,
    TOKEN_9,
} from "../../../../../resources/constant";
import {expect} from "chai";
import {CRV_DUO_frxETH_ETH, CRV_TRI_CRYPTO_LLAMA} from "../../../../../resources/lp";
import {
    TOKEN_ADDR_frxETH_ETH_GAUGE,
    TOKEN_ADDR_frxETH_ETH_STRAT,
    TOKEN_ADDR_triLLAMA_GAUGE,
    TOKEN_ADDR_triLLAMA_STRAT,
} from "../../../../../resources/tokens/stake-dao";
import {GaugeController} from "../../../../../typechain-types-vyper";
import {getExpectedCvgSdtRewards} from "../../../../../utils/stakeDao/getStakingShareForCycle";

describe("SdtUtilities - Claim Multiple Sdt", () => {
    let contractsUsers: IContractsUser, users: IUsers;
    let owner: Signer, user1: Signer;

    let sdt: ERC20, crv: ERC20, _3crv: ERC20, bal: ERC20, bbAUsd: ERC20, triLLAMA: ERC20, frxEthEthLp: ERC20, cvg: ERC20, cvgSdt: ERC20, usdc: ERC20;
    let sdCRVStaking: SdtStakingPositionService,
        sdBALStaking: SdtStakingPositionService,
        triLLAMAGaugeStaking: SdtStakingPositionService,
        frxEthEthStaking: SdtStakingPositionService,
        sdtRewardDistributor: SdtRewardDistributor;
    let triLLAMAStrat: ILpStakeDaoStrat, frxEthEthStrat: ILpStakeDaoStrat, cvgSdtPool: ICrvPoolPlain;
    let sdCrvGauge: ISdAssetGauge, sdBALGauge: ISdAssetGauge, sdFXSGauge: ISdAssetGauge, triLLAMAGauge: ISdAssetGauge, frxEthEthGauge: ISdAssetGauge;
    let cloneFactory: CloneFactory, gaugeController: GaugeController, lockingPositionService: LockingPositionService;

    before(async () => {
        contractsUsers = await loadFixture(deploySdtStakingFixture);
        const tokens = contractsUsers.contracts.tokens;
        const tokensStakeDao = contractsUsers.contracts.tokensStakeDao;

        cloneFactory = contractsUsers.contracts.base.cloneFactory;

        gaugeController = contractsUsers.contracts.locking.gaugeController;
        lockingPositionService = contractsUsers.contracts.locking.lockingPositionService;
        users = contractsUsers.users;
        owner = users.owner;
        user1 = users.user1;

        sdCRVStaking = contractsUsers.contracts.stakeDao.sdAssetsStaking.sdCRVStaking;
        sdBALStaking = contractsUsers.contracts.stakeDao.sdAssetsStaking.sdBALStaking;
        sdBALStaking = contractsUsers.contracts.stakeDao.sdAssetsStaking.sdBALStaking;

        sdtRewardDistributor = contractsUsers.contracts.stakeDao.sdtRewardDistributor;

        sdCrvGauge = tokensStakeDao.sdCrvGauge;
        sdBALGauge = tokensStakeDao.sdBalGauge;
        sdFXSGauge = tokensStakeDao.sdFxsGauge;

        cvgSdtPool = contractsUsers.contracts.lp.stablePoolCvgSdt;

        triLLAMA = await ethers.getContractAt("ERC20", CRV_TRI_CRYPTO_LLAMA);
        triLLAMAStrat = await ethers.getContractAt("ILpStakeDaoStrat", TOKEN_ADDR_triLLAMA_STRAT);
        triLLAMAGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_triLLAMA_GAUGE);

        frxEthEthLp = await ethers.getContractAt("ERC20", CRV_DUO_frxETH_ETH);
        frxEthEthStrat = await ethers.getContractAt("ILpStakeDaoStrat", TOKEN_ADDR_frxETH_ETH_STRAT);
        frxEthEthGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_frxETH_ETH_GAUGE);

        cvg = tokens.cvg;
        sdt = tokens.sdt;
        _3crv = tokens._3crv;
        crv = tokens.crv;
        cvgSdt = tokens.cvgSdt;
        usdc = tokens.usdc;

        sdt = tokens.sdt;
        bal = tokensStakeDao.bal;
        bbAUsd = tokensStakeDao.bbAUsd;
    });

    it("Success : Get a locking position for voting", async () => {
        await lockingPositionService.connect(users.user2).mintPosition(95, ethers.parseEther("10"), 0, users.user2, true);
    });

    it("Success : Mint some positions on sdCRV", async () => {
        await sdCRVStaking.connect(user1).deposit(MINT, ethers.parseEther("200"), ethers.ZeroAddress);
        await sdCRVStaking.connect(user1).deposit(MINT, ethers.parseEther("90000"), ethers.ZeroAddress);
        await sdCRVStaking.connect(user1).deposit(MINT, ethers.parseEther("90000"), ethers.ZeroAddress);
        await sdCRVStaking.connect(user1).deposit(MINT, ethers.parseEther("90000"), ethers.ZeroAddress);
        await sdCRVStaking.connect(user1).deposit(MINT, ethers.parseEther("90000"), ethers.ZeroAddress);
    });

    it("Success : Takes the ownership of the gauge contract and set reward distributor", async () => {
        await takesGaugeOwnershipAndSetDistributor(sdCrvGauge, owner);
        await takesGaugeOwnershipAndSetDistributor(sdBALGauge, owner);
        await takesGaugeOwnershipAndSetDistributor(sdFXSGauge, owner);
        await takesGaugeOwnershipAndSetDistributor(triLLAMAGauge, owner);
        await takesGaugeOwnershipAndSetDistributor(frxEthEthGauge, owner);
    });

    /**
     *
     *              CYCLE 2
     *
     */

    it("Success : Go to cycle 2", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });

    it("Success : Distributes gauges rewards for sdCRV", async () => {
        await distributeGaugeRewards(
            sdCrvGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                {token: crv, amount: ethers.parseEther("100000")},
                {token: _3crv, amount: ethers.parseEther("10")},
            ],
            owner
        );
    });

    it("Success : Distributing gauges rewards for sdBAL", async () => {
        await distributeGaugeRewards(
            sdBALGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                {token: bbAUsd, amount: ethers.parseEther("100000")},
                {token: usdc, amount: ethers.parseUnits("1000", 6)},
                {token: bal, amount: ethers.parseEther("10")},
            ],
            owner
        );
    });

    it("Success : Distributes gauges rewards for Trillama", async () => {
        await distributeGaugeRewards(
            triLLAMAGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                {token: crv, amount: ethers.parseEther("100000")},
            ],
            owner
        );
    });

    it("Success : Distributes gauges rewards for frxEthEth", async () => {
        await distributeGaugeRewards(
            frxEthEthGauge,
            [
                {token: sdt, amount: ethers.parseEther("5000")},
                {token: crv, amount: ethers.parseEther("100000")},
            ],
            owner
        );
    });
    /**
     *
     *              CYCLE 3
     *
     */
    it("Success : Go to cycle 3", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });

    it("Success : processing rewards on CRV for cycle 2", async () => {
        await sdCRVStaking.processSdtRewards();
        await sdBALStaking.processSdtRewards();
    });

    it("Success : Claim the Cvg for Token 4 for cycle 2", async () => {
        const rewards = await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_4, CYCLE_2);
        const claimCvgTx = sdCRVStaking.connect(users.user1).claimCvgRewards(TOKEN_4);

        await expect(claimCvgTx).to.changeTokenBalance(cvg, users.user1, rewards[0]);

        expect(await sdCRVStaking.nextClaims(TOKEN_4)).to.be.deep.equal([CYCLE_3, 0]);
    });

    it("Success : Claim the CvgSdt for Token 5 for cycle 2", async () => {
        const rewards = await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_5, CYCLE_2);
        const claimCvgSdtTx = sdCRVStaking.connect(users.user1).claimCvgSdtRewards(TOKEN_5, 0, false);

        await expect(claimCvgSdtTx).to.changeTokenBalance(cvg, users.user1, rewards[0]);
        await expect(claimCvgSdtTx).to.changeTokenBalances(sdt, [sdtRewardDistributor, users.user1], [-rewards[1], rewards[1]]);
        await expect(claimCvgSdtTx).to.changeTokenBalances(_3crv, [sdtRewardDistributor, users.user1], [-rewards[2], rewards[2]]);
        await expect(claimCvgSdtTx).to.changeTokenBalances(crv, [sdtRewardDistributor, users.user1], [-rewards[3], rewards[3]]);
        expect(await sdCRVStaking.nextClaims(TOKEN_4)).to.be.deep.equal([CYCLE_3, 0]);
    });

    it("Success : Distributes gauges rewards in SDT, CRV & 3CRV ", async () => {
        await distributeGaugeRewards(
            sdCrvGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                {token: crv, amount: ethers.parseEther("100000")},
                {token: _3crv, amount: ethers.parseEther("10")},
            ],
            owner
        );
    });

    it("Success : Distributing gauges rewards in SDT, BBAUSD & BAL ", async () => {
        await distributeGaugeRewards(
            sdBALGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                {token: usdc, amount: ethers.parseUnits("100000", 6)},
                {token: bal, amount: ethers.parseEther("10")},
            ],
            owner
        );
    });

    /**
     *
     *  DEPLOY NEW STAKING CONTRACT
     *
     */
    it("Success : Get Gauge token Trillama through Strategy", async () => {
        await triLLAMA.connect(user1).approve(triLLAMAStrat, ethers.MaxUint256);
        await triLLAMAStrat.connect(user1).deposit(user1, ethers.parseEther("1000000"), true);
    });

    it("Success : Get Gauge frxEthEth through Strategy", async () => {
        await frxEthEthLp.connect(user1).approve(frxEthEthStrat, ethers.MaxUint256);
        await frxEthEthStrat.connect(user1).deposit(user1, ethers.parseEther("1000000"), true);
    });

    it("Success : Create Staking contract Trillama at cycle 3", async () => {
        const createTx = await cloneFactory.connect(users.treasuryDao).createSdtStakingAndBuffer(triLLAMAGauge, "triLLAMA", true);

        const receipt1 = await createTx.wait();
        const logs = receipt1?.logs as EventLog[];
        const events1 = logs.filter((e) => e.fragment && e.fragment.name === "SdtStakingCreated");
        const args = events1[0].args;

        triLLAMAGaugeStaking = await ethers.getContractAt("SdtStakingPositionService", args.stakingClone);
        // triLLAMAGaugeStaking = await ethers.getContractAt("SdtBuffer", args.bufferClone);

        await gaugeController.connect(users.treasuryDao).add_gauge(triLLAMAGaugeStaking, 0, 0);
    });

    it("Success : Create Staking contract frxEthEth at cycle 3", async () => {
        const createTx = await cloneFactory.connect(users.treasuryDao).createSdtStakingAndBuffer(frxEthEthGauge, "frxETH-ETH", true);

        const receipt1 = await createTx.wait();
        const logs = receipt1?.logs as EventLog[];
        const events1 = logs.filter((e) => e.fragment && e.fragment.name === "SdtStakingCreated");
        const args = events1[0].args;

        frxEthEthStaking = await ethers.getContractAt("SdtStakingPositionService", args.stakingClone);
        // triLLAMAGaugeStaking = await ethers.getContractAt("SdtBuffer", args.bufferClone);

        await gaugeController.connect(users.treasuryDao).add_gauge(frxEthEthStaking, 0, 0);
    });

    /**
     *
     *  ----------------------------------------------------------------
     *
     */

    it("Success : Mint some positions on frxEthEth & Trillama", async () => {
        await frxEthEthGauge.connect(user1).approve(frxEthEthStaking, ethers.MaxUint256);
        await triLLAMAGauge.connect(user1).approve(triLLAMAGaugeStaking, ethers.MaxUint256);

        await triLLAMAGaugeStaking.connect(user1).deposit(MINT, 1, ethers.ZeroAddress);
        await triLLAMAGaugeStaking.connect(user1).deposit(MINT, ethers.parseEther("10000"), ethers.ZeroAddress);
        await triLLAMAGaugeStaking.connect(user1).deposit(MINT, ethers.parseEther("45.36"), ethers.ZeroAddress);

        await frxEthEthStaking.connect(user1).deposit(MINT, ethers.parseEther("200"), ethers.ZeroAddress);
        await frxEthEthStaking.connect(user1).deposit(MINT, ethers.parseEther("5000"), ethers.ZeroAddress);
        await frxEthEthStaking.connect(user1).deposit(MINT, ethers.parseEther("1"), ethers.ZeroAddress);
    });

    it("Fails : Try processing rewards on contracts just deployed", async () => {
        await expect(triLLAMAGaugeStaking.processSdtRewards()).to.be.rejectedWith("NO_STAKERS");
        await expect(frxEthEthStaking.processSdtRewards()).to.be.rejectedWith("NO_STAKERS");
    });
    it("Fails : Try to claim without claimContract data", async () => {
        await expect(sdtRewardDistributor.connect(user1).claimMultipleStaking([], 0, false, 6)).to.be.rejectedWith("NO_STAKING_SELECTED");
    });
    it("Fails : Try to claim without tokenId in claimContract data", async () => {
        await expect(sdtRewardDistributor.connect(user1).claimMultipleStaking([{stakingContract: sdCRVStaking, tokenIds: []}], 0, false, 6)).to.be.rejectedWith(
            "NO_STAKING_POSITIONS_SELECTED"
        );
    });

    it("Fails : Try to claim on some token claimable and 1 not claimable", async () => {
        await expect(
            sdtRewardDistributor.connect(user1).claimMultipleStaking(
                [
                    {stakingContract: sdCRVStaking, tokenIds: [TOKEN_1, TOKEN_4, TOKEN_5, TOKEN_6, TOKEN_7, TOKEN_8]},
                    {stakingContract: triLLAMAGaugeStaking, tokenIds: [TOKEN_9]},
                ],
                0,
                false,
                6
            )
        ).to.be.rejectedWith("ALL_SDT_CLAIMED_FOR_NOW");
    });

    /**
     *
     *              CYCLE 4
     *
     */

    it("Success : Go to cycle 4", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });

    it("Success : processing rewards on sdCRV for cycle 3. Don't process BAL.", async () => {
        await sdCRVStaking.processSdtRewards();
    });
    it("Fails : Try to claim on some token claimable and 1 not claimable", async () => {
        await expect(
            sdtRewardDistributor.connect(user1).claimMultipleStaking(
                [
                    {stakingContract: sdCRVStaking, tokenIds: [TOKEN_1]},
                    {stakingContract: sdBALStaking, tokenIds: [TOKEN_3]},
                ],
                0,
                true,
                1
            )
        ).to.be.rejectedWith("REWARD_COUNT_TOO_SMALL");
    });

    it("Success : Claim on sdCRV and sdBAL. BAL doesn't receive cycle 4.", async () => {
        const [rewardsToken1Cycle2, rewardsToken1Cycle3, rewardsToken3Cycle2, rewardsToken3Cycle3] = await Promise.all([
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_1, CYCLE_2),
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_1, CYCLE_3),

            await getExpectedCvgSdtRewards(sdBALStaking, TOKEN_3, CYCLE_2),
            await getExpectedCvgSdtRewards(sdBALStaking, TOKEN_3, CYCLE_3),
        ]);
        // Cycle 2 & 3 claimed on both tokens
        const cvgExpected = rewardsToken1Cycle2[0] + rewardsToken3Cycle2[0] + rewardsToken1Cycle3[0] + rewardsToken3Cycle3[0];

        // Only Cycle 2 is claimable for Token 3 as not yet processed on sdBal
        const sdtExpected = rewardsToken1Cycle2[1] + rewardsToken3Cycle2[1] + rewardsToken1Cycle3[1];

        // Rewards of cycle 2 & 3 from SdCRV
        const _3CrvClaimable = rewardsToken1Cycle2[2] + rewardsToken1Cycle3[2];
        const crvClaimable = rewardsToken1Cycle2[3] + rewardsToken1Cycle3[3];

        // Rewards of cycle 2 only from sdBAL
        const bbaUsdClaimable = rewardsToken3Cycle2[2];
        const balClaimable = rewardsToken3Cycle2[3];
        const usdcClaimable = rewardsToken3Cycle2[4];

        const claimTx = sdtRewardDistributor.connect(user1).claimMultipleStaking(
            [
                {stakingContract: sdCRVStaking, tokenIds: [TOKEN_1]},
                {stakingContract: sdBALStaking, tokenIds: [TOKEN_3]},
            ],
            0,
            true,
            6
        );

        await expect(claimTx).to.be.changeTokenBalance(cvg, user1, cvgExpected);

        await expect(claimTx).to.be.changeTokenBalance(cvgSdt, user1, sdtExpected);
        await expect(claimTx).to.be.changeTokenBalances(sdt, [sdtRewardDistributor, users.veSdtMultisig], [-sdtExpected, sdtExpected]);

        await expect(claimTx).to.be.changeTokenBalances(_3crv, [sdtRewardDistributor, user1], [-_3CrvClaimable, _3CrvClaimable]);
        await expect(claimTx).to.be.changeTokenBalances(crv, [sdtRewardDistributor, user1], [-crvClaimable, crvClaimable]);

        await expect(claimTx).to.be.changeTokenBalances(bbAUsd, [sdtRewardDistributor, user1], [-bbaUsdClaimable, bbaUsdClaimable]);
        await expect(claimTx).to.be.changeTokenBalances(bal, [sdtRewardDistributor, user1], [-balClaimable, balClaimable]);
        await expect(claimTx).to.be.changeTokenBalances(usdc, [sdtRewardDistributor, user1], [-usdcClaimable, usdcClaimable]);

        expect(await sdCRVStaking.nextClaims(TOKEN_1)).to.be.deep.equal([CYCLE_4, CYCLE_4]);
        expect(await sdBALStaking.nextClaims(TOKEN_3)).to.be.deep.equal([CYCLE_4, CYCLE_3]);
    });

    it("Success : Activate votes on the deployed gauges 1 cycle later & vote on it ", async () => {
        await gaugeController.connect(users.treasuryDao).toggle_vote_pause(triLLAMAGaugeStaking);
        await gaugeController.connect(users.treasuryDao).toggle_vote_pause(frxEthEthStaking);

        await gaugeController.connect(users.user2).multi_vote([
            {
                tokenId: TOKEN_5,
                votes: [
                    {gauge_address: triLLAMAGaugeStaking, weight: 20n},
                    {gauge_address: frxEthEthStaking, weight: 20n},
                ],
            },
        ]);
    });

    it("Fails : Try to claim Cvg & CvgSdt on a Staking created on the cycle before, didn't accumulate rewards", async () => {
        await expect(triLLAMAGaugeStaking.connect(user1).claimCvgRewards(TOKEN_9)).to.be.rejectedWith("ALL_CVG_CLAIMED_FOR_NOW");
        await expect(triLLAMAGaugeStaking.connect(user1).claimCvgSdtRewards(TOKEN_9, 0, false)).to.be.rejectedWith("ALL_SDT_CLAIMED_FOR_NOW");
    });

    it("Success : Distributes gauges rewards in SDCRV ", async () => {
        await distributeGaugeRewards(
            sdCrvGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                {token: crv, amount: ethers.parseEther("100000")},
                {token: _3crv, amount: ethers.parseEther("10")},
            ],
            owner
        );
    });

    it("Success : Distributing gauges rewards in SDBAL ", async () => {
        await distributeGaugeRewards(
            sdBALGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                {token: bbAUsd, amount: ethers.parseEther("100000")},
                {token: bal, amount: ethers.parseEther("10")},
            ],
            owner
        );
    });

    it("Success : Distributes gauges rewards in Trillama  ", async () => {
        await distributeGaugeRewards(
            triLLAMAGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                {token: crv, amount: ethers.parseEther("1")},
            ],
            owner
        );
    });

    it("Success : Distributing gauges rewards in frxEthEth ", async () => {
        await distributeGaugeRewards(
            frxEthEthGauge,
            [
                {token: sdt, amount: ethers.parseEther("10")},
                {token: crv, amount: ethers.parseEther("500")},
            ],
            owner
        );
    });

    /**
     *
     *              CYCLE 5
     *
     */

    it("Success : Go to cycle 5", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });

    it("Success : processing rewards on CRV for cycle 4 for all ", async () => {
        await sdCRVStaking.processSdtRewards();
        await sdBALStaking.processSdtRewards();
        await triLLAMAGaugeStaking.processSdtRewards();
        await frxEthEthStaking.processSdtRewards();
    });

    it("Fails : Claim on a very small position. No cvg are claimable", async () => {
        await expect(triLLAMAGaugeStaking.connect(user1).claimCvgRewards(TOKEN_9)).to.be.rejectedWith("NO_CVG_TO_CLAIM");
    });

    it("Success : Claim the Cvg for the cycle 4 on TriLLama.", async () => {
        const rewards = await getExpectedCvgSdtRewards(triLLAMAGaugeStaking, TOKEN_10, CYCLE_4);

        const claimTx = triLLAMAGaugeStaking.connect(user1).claimCvgRewards(TOKEN_10);

        await expect(claimTx).to.changeTokenBalance(cvg, user1, rewards[0]);

        expect(await triLLAMAGaugeStaking.nextClaims(TOKEN_10)).to.be.deep.equal([CYCLE_5, 0]);
    });

    it("Fails : Claim on one contract with min SDT amount too high", async () => {
        const [
            rewardsToken1Cycle4,

            rewardsToken3Cycle4,

            rewardsToken4Cycle2,
            rewardsToken4Cycle3,
            rewardsToken4Cycle4,

            rewardsToken5Cycle3,
            rewardsToken5Cycle4,

            rewardsToken9Cycle4,

            rewardsToken12Cycle4,
        ] = await Promise.all([
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_1, CYCLE_4),

            await getExpectedCvgSdtRewards(sdBALStaking, TOKEN_3, CYCLE_4),

            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_4, CYCLE_2),
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_4, CYCLE_3),
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_4, CYCLE_4),

            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_5, CYCLE_3),
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_5, CYCLE_4),

            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_9, CYCLE_4),
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_12, CYCLE_4),
        ]);

        const sdtExpected =
            rewardsToken1Cycle4[1] +
            rewardsToken3Cycle4[1] +
            rewardsToken4Cycle2[1] +
            rewardsToken4Cycle3[1] +
            rewardsToken4Cycle4[1] +
            rewardsToken5Cycle3[1] +
            rewardsToken5Cycle4[1] +
            rewardsToken9Cycle4[1] +
            rewardsToken12Cycle4[1];

        const sdt_dy = await cvgSdtPool.get_dy(0, 1, sdtExpected);
        const claimTx = sdtRewardDistributor.connect(user1).claimMultipleStaking(
            [
                {stakingContract: sdCRVStaking, tokenIds: [TOKEN_1, TOKEN_4, TOKEN_5]},
                {stakingContract: sdBALStaking, tokenIds: [TOKEN_3]},
            ],
            sdt_dy + 1n,
            true,
            6
        );

        await expect(claimTx).to.be.revertedWith("Exchange resulted in fewer coins than expected");
    });

    it("Success : Claim on one contract", async () => {
        const [
            rewardsToken1Cycle4,

            rewardsToken3Cycle4,

            rewardsToken4Cycle2,
            rewardsToken4Cycle3,
            rewardsToken4Cycle4,

            rewardsToken5Cycle3,
            rewardsToken5Cycle4,

            rewardsToken9Cycle4,

            rewardsToken12Cycle4,
        ] = await Promise.all([
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_1, CYCLE_4),

            await getExpectedCvgSdtRewards(sdBALStaking, TOKEN_3, CYCLE_4),

            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_4, CYCLE_2),
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_4, CYCLE_3),
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_4, CYCLE_4),

            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_5, CYCLE_3),
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_5, CYCLE_4),

            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_9, CYCLE_4),
            await getExpectedCvgSdtRewards(sdCRVStaking, TOKEN_12, CYCLE_4),
        ]);

        const cvgExpected =
            rewardsToken1Cycle4[0] +
            rewardsToken3Cycle4[0] +
            rewardsToken4Cycle3[0] +
            rewardsToken4Cycle4[0] +
            rewardsToken5Cycle3[0] +
            rewardsToken5Cycle4[0] +
            rewardsToken9Cycle4[0] +
            rewardsToken12Cycle4[0];

        const sdtExpected =
            rewardsToken1Cycle4[1] +
            rewardsToken3Cycle4[1] +
            rewardsToken4Cycle2[1] +
            rewardsToken4Cycle3[1] +
            rewardsToken4Cycle4[1] +
            rewardsToken5Cycle3[1] +
            rewardsToken5Cycle4[1] +
            rewardsToken9Cycle4[1] +
            rewardsToken12Cycle4[1];

        const sdt_dy = await cvgSdtPool.get_dy(0, 1, sdtExpected);
        const slippage = 5n;
        const minSdtAmountOut = sdt_dy - (sdt_dy * slippage) / 1000n; // 0.5%

        const claimTx = sdtRewardDistributor.connect(user1).claimMultipleStaking(
            [
                {stakingContract: sdCRVStaking, tokenIds: [TOKEN_1, TOKEN_4, TOKEN_5]},
                {stakingContract: sdBALStaking, tokenIds: [TOKEN_3]},
            ],
            minSdtAmountOut,
            true,
            6
        );

        await expect(claimTx).to.changeTokenBalance(cvg, user1, cvgExpected);
        await expect(claimTx).to.changeTokenBalances(sdt, [sdtRewardDistributor, cvgSdtPool], [-sdtExpected, sdtExpected]);

        expect(await sdCRVStaking.nextClaims(TOKEN_1)).to.be.deep.equal([CYCLE_5, CYCLE_5]);
        expect(await sdCRVStaking.nextClaims(TOKEN_4)).to.be.deep.equal([CYCLE_5, CYCLE_5]);
        expect(await sdCRVStaking.nextClaims(TOKEN_5)).to.be.deep.equal([CYCLE_5, CYCLE_5]);
        expect(await sdBALStaking.nextClaims(TOKEN_3)).to.be.deep.equal([CYCLE_5, CYCLE_5]);
    });
});
