import {loadFixture, time} from "@nomicfoundation/hardhat-network-helpers";
import {Signer, ContractTransactionResponse, solidityPacked} from "ethers";
import {deploySdtStakingFixture, increaseCvgCycle, increaseCvgCycleWithoutTime} from "../../../../../fixtures/stake-dao";
import {IContractsUser, IUsers} from "../../../../../../utils/contractInterface";
import {
    CvgControlTower,
    ERC20,
    IMultiMerkleStash,
    ISdAsset,
    ISdAssetGauge,
    SdtBlackHole,
    SdtRewardDistributor,
    SdtBuffer,
    SdtFeeCollector,
    SdtStakingPositionService,
} from "../../../../../../typechain-types";

import {expect} from "chai";
import {takesGaugeOwnershipAndSetDistributor} from "../../../../../../utils/stakeDao/takesGaugeOwnershipAndSetDistributor";
import {ethers} from "hardhat";
import {distributeGaugeRewards} from "../../../../../../utils/stakeDao/distributeGaugeRewards";
import {Balances, getBalances} from "../../../../../../utils/erc20/getBalances";
import {CLAIMER_REWARDS_PERCENTAGE, DENOMINATOR, SD_ASSETS_FEE_PERCENTAGE, TOKEN_3} from "../../../../../../resources/constant";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";
import {ICommonStruct} from "../../../../../../typechain-types/contracts/interfaces/ISdtBuffer";

describe("sdAssetStaking - SD_BAL - process SDT rewards with bribes only", () => {
    let contractsUsers: IContractsUser, users: IUsers;
    let owner: Signer, user1: Signer, user2: Signer, treasuryDao: Signer, veSdtMultisig: Signer, treasuryPod: Signer;
    let sdtFeeCollector: SdtFeeCollector,
        sdAssetBlackHole: SdtBlackHole,
        cvgControlTower: CvgControlTower,
        sdBalStakingBuffer: SdtBuffer,
        sdtRewardDistributor: SdtRewardDistributor;
    let bbAUsd: ERC20, sdt: ERC20, bal: ERC20, dai: ERC20, frax: ERC20, sdBal: ISdAsset;
    // let sdBALGaugeStaking: SdtStakingPositionService, sdBalGauge: ISdAssetGauge;
    let multiMerkleStash: IMultiMerkleStash;
    let sdBALStaking: SdtStakingPositionService, sdBalGauge: ISdAssetGauge;
    let rootFees: bigint;

    before(async () => {
        contractsUsers = await loadFixture(deploySdtStakingFixture);
        const tokens = contractsUsers.contracts.tokens;
        const tokensStakeDao = contractsUsers.contracts.tokensStakeDao;

        users = contractsUsers.users;
        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        treasuryDao = users.treasuryDao;
        treasuryPod = users.treasuryPod;
        veSdtMultisig = users.veSdtMultisig;
        sdAssetBlackHole = contractsUsers.contracts.stakeDao.sdtBlackHole;
        cvgControlTower = contractsUsers.contracts.base.cvgControlTower;
        sdtFeeCollector = contractsUsers.contracts.stakeDao.sdtFeeCollector;
        multiMerkleStash = contractsUsers.contracts.stakeDao.multiMerkleStash;

        sdBALStaking = contractsUsers.contracts.stakeDao.sdAssetsStaking.sdBALStaking;
        sdBalStakingBuffer = await ethers.getContractAt("SdtBuffer", await sdBALStaking.buffer());
        sdBalGauge = tokensStakeDao.sdBalGauge;
        sdtRewardDistributor = contractsUsers.contracts.stakeDao.sdtRewardDistributor;

        sdt = tokens.sdt;
        sdBal = tokensStakeDao.sdBal;
        bal = tokensStakeDao.bal;
        bbAUsd = tokensStakeDao.bbAUsd;
        dai = tokens.dai;
        frax = tokens.frax;

        rootFees = await sdtFeeCollector.rootFees();
    });

    it("Success : Takes the ownership of the gauge contract and set reward distributor", async () => {
        await takesGaugeOwnershipAndSetDistributor(sdBalGauge, owner);
    });

    it("Fails : Try to claim SDT rewards before CVG processing ", async () => {
        await expect(sdBALStaking.processSdtRewards()).to.be.rejectedWith("NO_STAKERS");
    });

    it("Success : Going to cycle 2", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });
    it("Fails : Claiming SDT on the first cycle of the integration", async () => {
        await expect(sdBALStaking.processSdtRewards()).to.be.rejectedWith("NO_STAKERS");
    });

    it("Success : Distributing gauges rewards in SDT, BBAUSD & BAL ", async () => {
        await distributeGaugeRewards(
            sdBalGauge,
            [
                {token: sdt, amount: ethers.parseEther("2000")},
                {token: bbAUsd, amount: ethers.parseEther("100000")},
                {token: bal, amount: ethers.parseEther("10")},
            ],
            owner
        );
    });

    it("Success : Going to cycle 3", async () => {
        await increaseCvgCycle(contractsUsers, 1);
    });

    let processSdtRewardsTx: Promise<ContractTransactionResponse>;

    it("Success : Processing SDT rewards for cycle 2 in cycle 3", async () => {
        processSdtRewardsTx = sdBALStaking.processSdtRewards();
    });

    it("Success : Claiming amounts are the full amount", async () => {
        await sdBALStaking.connect(user1).claimCvgSdtRewards(TOKEN_3, 0, false);
    });

    it("Fails : Setting bribe token as not the owner", async () => {
        await expect(
            sdAssetBlackHole.connect(user1).setBribeTokens([{token: sdBalGauge, fee: SD_ASSETS_FEE_PERCENTAGE}], sdBalStakingBuffer)
        ).to.be.rejectedWith("Ownable: caller is not the owner");
    });

    it("Fails : Adding a bribe reward with a gauge token staked on the blackhole", async () => {
        await expect(sdAssetBlackHole.setBribeTokens([{token: sdBalGauge, fee: SD_ASSETS_FEE_PERCENTAGE}], sdBalStakingBuffer)).to.be.rejectedWith(
            "GAUGE_ASSET"
        );
    });

    it("Fails : Adding a bribe on a non buffer address", async () => {
        await expect(sdAssetBlackHole.setBribeTokens([{token: sdBalGauge, fee: SD_ASSETS_FEE_PERCENTAGE}], owner)).to.be.rejectedWith("NOT_BUFFER");
    });
    it("Fails : Setting bribe token with fee to high", async () => {
        await expect(sdAssetBlackHole.setBribeTokens([{token: sdBal, fee: 15_500n}], sdBalStakingBuffer)).to.be.rejectedWith("FEE_TOO_HIGH");
    });

    it("Success : Adding a bribe reward on the SdAssetBlackhole linked to the buffer", async () => {
        await sdAssetBlackHole.setBribeTokens([{token: sdBal, fee: SD_ASSETS_FEE_PERCENTAGE}], sdBalStakingBuffer);
    });

    let sdBalBribe = ethers.parseEther("5000");
    it("Success : Sending bribes in the buffer via multiMerkleStash", async () => {
        //add sdBal rewards into multiMerkle
        await sdBal.transfer(multiMerkleStash, sdBalBribe);
        //create merkleTreefor claim
        const veSdtMultisigAddress = await veSdtMultisig.getAddress();
        const claims = [
            {index: 0, account: veSdtMultisigAddress, amount: sdBalBribe},
            // {index: 1, account: veSdtMultisigAddress, amount: "200"},
        ];
        const nodes = claims.map((claim) => keccak256(solidityPacked(["uint256", "address", "uint256"], [claim.index, claim.account, claim.amount])));
        const merkleTree = new MerkleTree(nodes, keccak256, {sortPairs: true});
        const rootHash = merkleTree.getHexRoot();
        const claiming = keccak256(solidityPacked(["uint256", "address", "uint256"], [claims[0].index, claims[0].account, claims[0].amount]));
        const proof = merkleTree.getHexProof(claiming);
        //update merkle tree for sdBal bribe
        await multiMerkleStash.updateMerkleRoot(sdBal, rootHash);
        //claim sdBal bribe via veSdtMultisig
        await multiMerkleStash.connect(veSdtMultisig).claim(sdBal, claims[0].index, claims[0].account, claims[0].amount, proof);
        //send sdBal bribe to sdAssetBlackHole
        await sdBal.connect(veSdtMultisig).transfer(sdAssetBlackHole, sdBalBribe);
    });

    it("Success : Distributing gauges rewards in SDT, BBAUSD & BAL ", async () => {
        await distributeGaugeRewards(
            sdBalGauge,
            [
                {token: sdt, amount: ethers.parseEther("100")},
                {token: bbAUsd, amount: ethers.parseEther("18600.333")},
                {token: bal, amount: ethers.parseEther("6800")},
            ],
            owner
        );
    });

    it("Success : Increasing time and claiming rewards on gauge", async () => {
        await time.increase(7 * 86_400);
        await sdBalGauge.claim_rewards(sdAssetBlackHole);
    });

    it("Success : Going to cycle 4", async () => {
        await increaseCvgCycleWithoutTime(contractsUsers, 1);
    });

    let bufferBalances: Balances[];
    it("Success : Streaming the rewards on the buffer and process rewards separately", async () => {
        await sdBalGauge.claim_rewards(sdAssetBlackHole);
        bufferBalances = await getBalances([
            {
                token: await sdt.getAddress(),
                addresses: [await sdBalStakingBuffer.getAddress()],
            },
            {
                token: await bbAUsd.getAddress(),
                addresses: [await sdBalStakingBuffer.getAddress()],
            },
            {
                token: await bal.getAddress(),
                addresses: [await sdBalStakingBuffer.getAddress()],
            },
        ]);
        processSdtRewardsTx = sdBALStaking.processSdtRewards();
    });

    let rewardsWrittenCycle3: ICommonStruct.TokenAmountStruct[];

    it("Verify : Amounts in SDT sent to the Staking contract & to the FeeCollector", async () => {
        const sdtAmountBalance = bufferBalances[0].balances[0].amount;
        const feeAmount = (rootFees * sdtAmountBalance) / 100_000n;
        const claimerRewards = (sdtAmountBalance * CLAIMER_REWARDS_PERCENTAGE) / DENOMINATOR;
        const rewardsAmount = sdtAmountBalance - feeAmount - claimerRewards;

        // Verify amount of SDT, check that fees are distributed to FeeCollector
        await expect(processSdtRewardsTx).to.changeTokenBalances(
            sdt,
            [sdBalStakingBuffer, sdtRewardDistributor, sdtFeeCollector, owner],
            [-sdtAmountBalance, rewardsAmount, feeAmount, claimerRewards]
        );

        rewardsWrittenCycle3 = await sdBALStaking.getProcessedSdtRewards(3);
        const sdtWritten = rewardsWrittenCycle3[0];

        expect(sdtWritten.token).to.be.eq(await sdt.getAddress());
        expect(sdtWritten.amount).to.be.eq(rewardsAmount);
    });

    it("Verify : Amounts of gauge rewards BBAUSD ", async () => {
        const claimerRewards = (bufferBalances[1].balances[0].amount * CLAIMER_REWARDS_PERCENTAGE) / DENOMINATOR;
        await expect(processSdtRewardsTx).to.changeTokenBalances(
            bbAUsd,
            [sdBalStakingBuffer, sdtRewardDistributor, owner],
            [-bufferBalances[1].balances[0].amount, bufferBalances[1].balances[0].amount - claimerRewards, claimerRewards]
        );

        const rewardWritten = rewardsWrittenCycle3[1];

        expect(rewardWritten.token).to.be.eq(await bbAUsd.getAddress());
        expect(rewardWritten.amount).to.be.eq(bufferBalances[1].balances[0].amount - claimerRewards);
    });

    it("Verify : Amounts of gauge rewards BAL ", async () => {
        const claimerRewards = (bufferBalances[2].balances[0].amount * CLAIMER_REWARDS_PERCENTAGE) / DENOMINATOR;
        await expect(processSdtRewardsTx).to.changeTokenBalances(
            bal,
            [sdBalStakingBuffer, sdtRewardDistributor, owner],
            [-bufferBalances[2].balances[0].amount, bufferBalances[2].balances[0].amount - claimerRewards, claimerRewards]
        );

        const rewardWritten = rewardsWrittenCycle3[2];

        expect(rewardWritten.token).to.be.eq(await bal.getAddress());
        expect(rewardWritten.amount).to.be.eq(bufferBalances[2].balances[0].amount - claimerRewards);
    });

    it("Verify : sdBAL bribes are claimed", async () => {
        const claimerRewards = (sdBalBribe * CLAIMER_REWARDS_PERCENTAGE) / DENOMINATOR;
        const feeSdAssets = (sdBalBribe * SD_ASSETS_FEE_PERCENTAGE) / DENOMINATOR;

        await expect(processSdtRewardsTx).to.changeTokenBalances(
            sdBal,
            [sdAssetBlackHole, sdtRewardDistributor, owner],
            [-sdBalBribe, sdBalBribe - claimerRewards - feeSdAssets, claimerRewards]
        );

        const rewardWritten = rewardsWrittenCycle3[3];

        expect(rewardWritten.token).to.be.eq(await sdBal.getAddress());
        expect(rewardWritten.amount).to.be.eq(sdBalBribe - claimerRewards - feeSdAssets);
    });

    it("Success : Modify the bribe reward array, modify positions", async () => {
        await sdAssetBlackHole.setBribeTokens(
            [
                {token: dai, fee: SD_ASSETS_FEE_PERCENTAGE},
                {token: sdBal, fee: SD_ASSETS_FEE_PERCENTAGE},
            ],
            sdBalStakingBuffer
        );

        expect(await sdAssetBlackHole.bribeTokensLinkedToBuffer(sdBalStakingBuffer, 0)).to.be.eql([await dai.getAddress(), SD_ASSETS_FEE_PERCENTAGE]);
        expect(await sdAssetBlackHole.bribeTokensLinkedToBuffer(sdBalStakingBuffer, 1)).to.be.eql([await sdBal.getAddress(), SD_ASSETS_FEE_PERCENTAGE]);
    });

    it("Success : Distributes gauges rewards for cycle 4 in SDT & BAL only to leave an empty space in the middle", async () => {
        await distributeGaugeRewards(
            sdBalGauge,
            [
                {token: sdt, amount: ethers.parseEther("100")},
                {token: bal, amount: ethers.parseEther("6800")},
            ],
            owner
        );
    });

    it("Success : Increase time and claim rewards on gauge", async () => {
        await time.increase(7 * 86_400);
        await sdBalGauge.claim_rewards(sdAssetBlackHole);
    });

    it("Success : Go to cycle 4", async () => {
        await increaseCvgCycleWithoutTime(contractsUsers, 1);
    });

    const bribeDAI = ethers.parseEther("4000");
    it("Success : Bribe DAI only in the SdASsetBlackHole", async () => {
        await dai.transfer(sdAssetBlackHole, bribeDAI);
    });

    it("Success : Stream the rewards on the buffer and process rewards separately", async () => {
        await sdBalGauge.claim_rewards(sdAssetBlackHole);
        bufferBalances = await getBalances([
            {
                token: await sdt.getAddress(),
                addresses: [await sdBalStakingBuffer.getAddress()],
            },
            {
                token: await bal.getAddress(),
                addresses: [await sdBalStakingBuffer.getAddress()],
            },
        ]);
        processSdtRewardsTx = sdBALStaking.processSdtRewards();
    });

    let rewardsWrittenAtCycle4: ICommonStruct.TokenAmountStruct[] = [];
    it("Verify : Amounts in SDT sent to the Staking contract & to the FeeCollector", async () => {
        rewardsWrittenAtCycle4 = await sdBALStaking.getProcessedSdtRewards(4);
        expect(rewardsWrittenAtCycle4.length).to.be.eq(3);

        const sdtAmountBalance = bufferBalances[0].balances[0].amount;
        const feeAmount = (rootFees * sdtAmountBalance) / 100_000n;
        const claimerRewards = (sdtAmountBalance * CLAIMER_REWARDS_PERCENTAGE) / DENOMINATOR;
        const rewardsAmount = sdtAmountBalance - feeAmount - claimerRewards;

        // Verify amount of SDT, check that fees are distributed to FeeCollector
        await expect(processSdtRewardsTx).to.changeTokenBalances(
            sdt,
            [sdBalStakingBuffer, sdtRewardDistributor, sdtFeeCollector, owner],
            [-sdtAmountBalance, rewardsAmount, feeAmount, claimerRewards]
        );

        const sdtWritten = rewardsWrittenAtCycle4[0];

        expect(sdtWritten.token).to.be.eq(await sdt.getAddress());
        expect(sdtWritten.amount).to.be.eq(rewardsAmount);
    });

    it("Verify : Amounts of gauge rewards BAL ", async () => {
        const claimerRewards = (bufferBalances[1].balances[0].amount * CLAIMER_REWARDS_PERCENTAGE) / DENOMINATOR;
        await expect(processSdtRewardsTx).to.changeTokenBalances(
            bal,
            [sdBalStakingBuffer, sdtRewardDistributor, owner],
            [-bufferBalances[1].balances[0].amount, bufferBalances[1].balances[0].amount - claimerRewards, claimerRewards]
        );

        const rewardWritten = rewardsWrittenAtCycle4[1];

        expect(rewardWritten.token).to.be.eq(await bal.getAddress());
        expect(rewardWritten.amount).to.be.eq(bufferBalances[1].balances[0].amount - claimerRewards);
    });

    it("Verify : Amounts of bribes rewards DAI", async () => {
        const claimerRewards = (bribeDAI * CLAIMER_REWARDS_PERCENTAGE) / DENOMINATOR;
        const feeSdAssets = (bribeDAI * SD_ASSETS_FEE_PERCENTAGE) / DENOMINATOR;

        await expect(processSdtRewardsTx).to.changeTokenBalances(
            dai,
            [sdAssetBlackHole, sdtRewardDistributor, owner],
            [-bribeDAI, bribeDAI - claimerRewards - feeSdAssets, claimerRewards]
        );

        const rewardWritten = rewardsWrittenAtCycle4[2];

        expect(rewardWritten.token).to.be.eq(await dai.getAddress());
        expect(rewardWritten.amount).to.be.eq(bribeDAI - claimerRewards - feeSdAssets);
    });
    it("Fail: setProcessorRewardPercentage with random user", async () => {
        await sdBalStakingBuffer.setProcessorRewardsPercentage(3500n).should.be.rejectedWith("Ownable: caller is not the owner");
    });
    it("Fail: setProcessorRewardPercentage with fee too high", async () => {
        await sdBalStakingBuffer.connect(treasuryDao).setProcessorRewardsPercentage(3500n).should.be.rejectedWith("PERCENTAGE_TOO_HIGH");
    });
    it("Success: setProcessorRewardPercentage ", async () => {
        await sdBalStakingBuffer.connect(treasuryDao).setProcessorRewardsPercentage(3000n);
    });
});
