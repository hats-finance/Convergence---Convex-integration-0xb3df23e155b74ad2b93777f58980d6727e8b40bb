import {loadFixture, time} from "@nomicfoundation/hardhat-network-helpers";
import {Signer, EventLog, ContractTransactionResponse} from "ethers";
import {SdtStakingPositionService} from "../../../../../../typechain-types/contracts/Staking/StakeDAO";
import {deploySdtStakingFixture, increaseCvgCycle, increaseCvgCycleWithoutTime} from "../../../../../fixtures/stake-dao";
import {IContractsUser, IUsers} from "../../../../../../utils/contractInterface";
import {
    CloneFactory,
    ERC20,
    ILpStakeDaoStrat,
    ISdAssetGauge,
    SdtBlackHole,
    SdtRewardDistributor,
    SdtBuffer,
    SdtFeeCollector,
} from "../../../../../../typechain-types";

import {expect} from "chai";
import {takesGaugeOwnershipAndSetDistributor} from "../../../../../../utils/stakeDao/takesGaugeOwnershipAndSetDistributor";
import {ethers} from "hardhat";
import {GaugeController} from "../../../../../../typechain-types-vyper/GaugeController";
import {getAllGaugeRewardsSdt, TokenAmount} from "../../../../../../utils/stakeDao/getGaugeRewardsSdt";
import {distributeGaugeRewards} from "../../../../../../utils/stakeDao/distributeGaugeRewards";
import {Balances, getBalances} from "../../../../../../utils/erc20/getBalances";
import {TOKEN_ADDR_wstETH} from "../../../../../../resources/tokens/common";
import {CLAIMER_REWARDS_PERCENTAGE, CYCLE_2, DENOMINATOR, TOKEN_4, TWO_MILLION_ETHER} from "../../../../../../resources/constant";
import {TOKEN_ADDR_triLLAMA_STRAT} from "../../../../../../resources/tokens/stake-dao";
import {ICommonStruct} from "../../../../../../typechain-types/contracts/interfaces/ISdtRewardDistributor";

describe("lpAssetStaking - gaugeLp - process SDT rewards on triLlama gauge LP", () => {
    let contractsUsers: IContractsUser, users: IUsers;
    let owner: Signer, user1: Signer, user2: Signer;
    let sdtFeeCollector: SdtFeeCollector,
        sdtBlackHole: SdtBlackHole,
        gaugeController: GaugeController,
        triLLAMAGaugeStakingBuffer: SdtBuffer,
        sdtRewardDistributor: SdtRewardDistributor;
    let triLLAMA: ERC20, sdt: ERC20, crv: ERC20, _3crv: ERC20, wsETH: ERC20;
    let triLLAMAGaugeStaking: SdtStakingPositionService, triLLAMAStrat: ILpStakeDaoStrat, triLLAMAGauge: ISdAssetGauge, cloneFactory: CloneFactory;

    let rootFees: bigint;

    before(async () => {
        contractsUsers = await loadFixture(deploySdtStakingFixture);
        const tokens = contractsUsers.contracts.tokens;
        const tokensStakeDao = contractsUsers.contracts.tokensStakeDao;

        users = contractsUsers.users;
        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        sdtBlackHole = contractsUsers.contracts.stakeDao.sdtBlackHole;
        sdtFeeCollector = contractsUsers.contracts.stakeDao.sdtFeeCollector;

        gaugeController = contractsUsers.contracts.locking.gaugeController;

        cloneFactory = contractsUsers.contracts.base.cloneFactory;
        triLLAMA = tokensStakeDao.triLLAMA;
        triLLAMAStrat = await ethers.getContractAt("ILpStakeDaoStrat", TOKEN_ADDR_triLLAMA_STRAT);
        triLLAMAGauge = tokensStakeDao.triLLAMAGauge;
        sdtRewardDistributor = contractsUsers.contracts.stakeDao.sdtRewardDistributor;

        sdt = tokens.sdt;
        crv = tokens.crv;
        wsETH = await ethers.getContractAt("ERC20", TOKEN_ADDR_wstETH);
        rootFees = await sdtFeeCollector.rootFees();
    });

    it("Success : Get Gauge token through Strategy", async () => {
        await triLLAMA.connect(user1).approve(triLLAMAStrat, ethers.MaxUint256);
        await triLLAMAStrat.connect(user1).deposit(user1, TWO_MILLION_ETHER, true);
    });

    it("Success : Create Staking contract", async () => {
        const createTx = await cloneFactory.connect(users.treasuryDao).createSdtStakingAndBuffer(triLLAMAGauge, "triLLAMA", true);

        const receipt1 = await createTx.wait();
        const logs = receipt1?.logs as EventLog[];
        const events1 = logs.filter((e) => e.fragment && e.fragment.name === "SdtStakingCreated");
        const args = events1[0].args;

        triLLAMAGaugeStaking = await ethers.getContractAt("SdtStakingPositionService", args.stakingClone);
        triLLAMAGaugeStakingBuffer = await ethers.getContractAt("SdtBuffer", args.bufferClone);

        await gaugeController.connect(users.treasuryDao).add_gauge(triLLAMAGaugeStaking, 0, 0);
    });

    it("Success : Deposit Gauge LP in convergence", async () => {
        const amount1M5 = ethers.parseEther("1500000");
        await triLLAMAGauge.connect(user1).approve(triLLAMAGaugeStaking, ethers.MaxUint256);
        const depositTx = triLLAMAGaugeStaking.connect(user1).deposit(0, amount1M5, ethers.ZeroAddress);

        await expect(depositTx).to.changeTokenBalances(triLLAMAGauge, [user1, sdtBlackHole], [-amount1M5, amount1M5]);
    });

    it("Success : Takes the ownership of the gauge contract and set reward distributor", async () => {
        await takesGaugeOwnershipAndSetDistributor(triLLAMAGauge, owner);
    });

    it("Fails : Try to claim SDT rewards before CVG processing ", async () => {
        await expect(triLLAMAGaugeStaking.processSdtRewards()).to.be.rejectedWith("NO_STAKERS");
    });
    it("Success : Distributes gauges rewards in SDT, BBAUSD & BAL ", async () => {
        await distributeGaugeRewards(
            triLLAMAGauge,
            [
                {token: sdt, amount: ethers.parseEther("600")},
                {token: crv, amount: ethers.parseEther("70000")},
            ],
            owner
        );
    });
    it("Success : Go to cycle 2", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });

    it("Fails : Try to claim SDT on the first cycle of the integration", async () => {
        await expect(triLLAMAGaugeStaking.processSdtRewards()).to.be.rejectedWith("NO_STAKERS");
    });

    it("Success : Go to cycle 3", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });

    let allClaimableRewards: TokenAmount[];
    let processSdtRewardsTx: Promise<ContractTransactionResponse>;

    it("Success : Process SDT rewards for cycle 2 in cycle 3", async () => {
        allClaimableRewards = await getAllGaugeRewardsSdt(triLLAMAGauge, sdtBlackHole, rootFees);
        processSdtRewardsTx = triLLAMAGaugeStaking.processSdtRewards();
    });

    let rewardsWritten: ICommonStruct.TokenAmountStruct[];
    it("Success : claimed amounts are the full amount", async () => {
        const claimSdtTx = triLLAMAGaugeStaking.connect(user1).claimCvgSdtRewards(TOKEN_4, 0, false);
        rewardsWritten = await triLLAMAGaugeStaking.getProcessedSdtRewards(2);
        for (let index = 0; index < allClaimableRewards.length; index++) {
            await expect(claimSdtTx).to.changeTokenBalances(
                await ethers.getContractAt("ERC20", await rewardsWritten[index].token),
                [sdtRewardDistributor, user1],
                [-rewardsWritten[index].amount, rewardsWritten[index].amount]
            );
        }
    });

    it("Verify : Amounts in SDT sent to the Staking contract & to the FeeCollector", async () => {
        const sdtClaimed = allClaimableRewards[0];
        // Verify amount of SDT, check that fees are distributed to FeeCollector
        await expect(processSdtRewardsTx).to.changeTokenBalances(
            sdtClaimed.token,
            [triLLAMAGauge, sdtRewardDistributor, sdtFeeCollector, owner],
            [-sdtClaimed.total, sdtClaimed.amount, sdtClaimed.feeAmount, sdtClaimed.claimerRewards]
        );

        expect(rewardsWritten[0].token).to.be.eq(await sdtClaimed.token.getAddress());
        expect(rewardsWritten[0].amount).to.be.eq(sdtClaimed.amount);
    });

    it("Verify : Amounts in other tokens are sent to SdAssetStaking contract", async () => {
        // Verify amount of other tokens
        for (let index = 1; index < allClaimableRewards.length; index++) {
            const claimableRewards = allClaimableRewards[index];
            await expect(processSdtRewardsTx).to.changeTokenBalances(
                claimableRewards.token,
                [triLLAMAGauge, sdtRewardDistributor],
                [-claimableRewards.total, claimableRewards.amount]
            );

            const rewardWritten = (await triLLAMAGaugeStaking.getProcessedSdtRewards(2))[index];

            expect(rewardWritten.token).to.be.eq(await claimableRewards.token.getAddress());
            expect(rewardWritten.amount).to.be.eq(claimableRewards.amount);
        }
    });

    it("Fails : Try to process SDT rewards", async () => {
        await expect(triLLAMAGaugeStaking.processSdtRewards()).to.be.rejectedWith("SDT_REWARDS_ALREADY_PROCESSED");
    });

    it("Success : Distributes rewards on LP Gauge for cycle 3", async () => {
        await distributeGaugeRewards(
            triLLAMAGauge,
            [
                {token: sdt, amount: ethers.parseEther("4000")},
                {token: crv, amount: ethers.parseEther("25000")},
                {token: wsETH, amount: ethers.parseEther("2.5")},
            ],
            owner
        );
    });

    it("Success : Increase time and claim rewards on gauge", async () => {
        await time.increase(7 * 86_400);
        await triLLAMAGauge.claim_rewards(sdtBlackHole);
    });

    it("Success : Go to cycle 4", async () => {
        await increaseCvgCycleWithoutTime(contractsUsers, 1);
    });

    let bufferBalances: Balances[];

    it("Success : Stream the rewards on the buffer and process rewards separately", async () => {
        await triLLAMAGauge.claim_rewards(sdtBlackHole);
        bufferBalances = await getBalances([
            {
                token: await sdt.getAddress(),
                addresses: [await triLLAMAGaugeStakingBuffer.getAddress()],
            },
            {
                token: await crv.getAddress(),
                addresses: [await triLLAMAGaugeStakingBuffer.getAddress()],
            },
            {
                token: await wsETH.getAddress(),
                addresses: [await triLLAMAGaugeStakingBuffer.getAddress()],
            },
        ]);
        processSdtRewardsTx = triLLAMAGaugeStaking.processSdtRewards();
    });

    it("Verify : Amounts in SDT sent to the Staking contract & to the FeeCollector", async () => {
        const sdtAmountBalance = bufferBalances[0].balances[0].amount;
        const feeAmount = (rootFees * sdtAmountBalance) / 100_000n;
        const claimerRewards = (sdtAmountBalance * CLAIMER_REWARDS_PERCENTAGE) / DENOMINATOR;
        const rewardsAmount = sdtAmountBalance - feeAmount - claimerRewards;

        // Verify amount of SDT, check that fees are distributed to FeeCollector
        await expect(processSdtRewardsTx).to.changeTokenBalances(
            sdt,
            [triLLAMAGaugeStakingBuffer, sdtRewardDistributor, sdtFeeCollector, owner],
            [-sdtAmountBalance, rewardsAmount, feeAmount, claimerRewards]
        );

        const sdtWritten = (await triLLAMAGaugeStaking.getProcessedSdtRewards(3))[0];

        expect(sdtWritten.token).to.be.eq(await sdt.getAddress());
        expect(sdtWritten.amount).to.be.eq(rewardsAmount);
    });

    it("Verify : Amounts in other tokens are sent to SdAssetStaking contract", async () => {
        // Verify amount of other tokens
        for (let index = 1; index < allClaimableRewards.length; index++) {
            const claimableRewards = allClaimableRewards[index];
            const claimerRewards = (bufferBalances[index].balances[0].amount * CLAIMER_REWARDS_PERCENTAGE) / DENOMINATOR;

            await expect(processSdtRewardsTx).to.changeTokenBalances(
                claimableRewards.token,
                [triLLAMAGaugeStakingBuffer, sdtRewardDistributor, owner],
                [-bufferBalances[index].balances[0].amount, bufferBalances[index].balances[0].amount - claimerRewards, claimerRewards]
            );

            const rewardWritten = (await triLLAMAGaugeStaking.getProcessedSdtRewards(3))[index];

            expect(rewardWritten.token).to.be.eq(await claimableRewards.token.getAddress());
            expect(rewardWritten.amount).to.be.eq(bufferBalances[index].balances[0].amount - claimerRewards);
        }
    });
});
