import {expect} from "chai";
import {CvgControlTower, CvgRewards, CvgRewardsV2, LockingPositionManager, LockingPositionService} from "../../typechain-types";
import {ethers} from "hardhat";
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ONE_WEEK} from "../../resources/constant";
import {VeCVG} from "../../typechain-types-vyper/VeCVG";
import {GaugeController} from "../../typechain-types-vyper";
import {withinPercentage} from "../testUtils/testUtils";

export async function verifyYsSumBalancesEqualsTotalSupply(
    lockingService: LockingPositionService,
    lockingManager: LockingPositionManager,
    cycleStart: number,
    cycleEnd: number
) {
    for (let cycleId = cycleStart; cycleId <= cycleEnd; cycleId++) {
        const totalSupplyYs = await lockingService.totalSupplyOfYsCvgAt(cycleId);
        let sumBalanceYsToken = 0n;

        for (let tokenId = 1; tokenId < (await lockingManager.nextId()); tokenId++) {
            sumBalanceYsToken += await lockingService.balanceOfYsCvgAt(tokenId, cycleId);
        }
        expect(sumBalanceYsToken).to.be.eq(totalSupplyYs);
    }
}
export async function verifySumVotesGaugeControllerEqualsTotalVotes(gaugeController: GaugeController) {
    const numberOfGauges = await gaugeController.n_gauges();
    const totalWeight = await gaugeController.get_total_weight();

    let sumVotes = 0n;

    for (let index = 0; index < numberOfGauges; index++) {
        const stakingAddress = await gaugeController.gauges(index);
        const gaugeWeight = await gaugeController.get_gauge_weight(stakingAddress);
        sumVotes += gaugeWeight;
    }
    expect(sumVotes).to.be.eq(totalWeight);
}

export async function verifyTotalAmountDistributedInCvg(cvgControlTower: CvgControlTower, cvgRewards: CvgRewardsV2, gaugeController: GaugeController) {
    const numberOfGauges = await gaugeController.n_gauges();
    if (numberOfGauges > 0) {
        const cvgCycle = (await cvgControlTower.cvgCycle()) - 1n;
        const totalWeight = await gaugeController.get_total_weight();

        const expectedStakingInflation = await cvgRewards.stakingInflationAtCycle(cvgCycle);
        let sumVotes = 0n;
        let sumCvgDistributed = 0n;
        let amountReducedByKilledGauges = 0n;
        for (let index = 0; index < numberOfGauges; index++) {
            const stakingAddress = await gaugeController.gauges(index);
            const [gaugeWeight, isKilled] = await Promise.all([
                await gaugeController.get_gauge_weight(stakingAddress),
                await gaugeController.killed_gauges(stakingAddress),
            ]);
            sumVotes += gaugeWeight;
            if (isKilled) {
                amountReducedByKilledGauges += (expectedStakingInflation * gaugeWeight) / totalWeight;
            } else {
                const stakingContract = await ethers.getContractAt("SdtStakingPositionService", stakingAddress);
                sumCvgDistributed += (await stakingContract.cycleInfo(cvgCycle)).cvgRewardsAmount;
            }
        }
        const adjustedInflationPostKilled = expectedStakingInflation - amountReducedByKilledGauges;
        withinPercentage(sumCvgDistributed, adjustedInflationPostKilled, 0.01);
        expect(sumCvgDistributed).lte(expectedStakingInflation);
    }
}

export async function verifyVeSumBalancesEqualsTotalSupply(veCvg: VeCVG, lockingManager: LockingPositionManager) {
    const totalSupplyVe = await veCvg.total_supply();
    let sumBalanceVeToken = 0n;

    for (let tokenId = 1; tokenId < (await lockingManager.nextId()); tokenId++) {
        sumBalanceVeToken += await veCvg.balanceOf(tokenId);
    }
    expect(sumBalanceVeToken).to.be.eq(totalSupplyVe);
}

export async function verifyYsSumBalancesEqualsTotalSupplyHistory(
    lockingService: LockingPositionService,
    lockingManager: LockingPositionManager,
    cycleStart: number,
    cycleEnd: number
) {
    for (let cycleId = cycleStart; cycleId <= cycleEnd; cycleId++) {
        const totalSupplyYs = await lockingService.totalSupplyYsCvgHistories(cycleId);
        let sumBalanceYsToken = 0n;
        const nextId = await lockingManager.nextId();
        for (let tokenId = 1; tokenId < nextId; tokenId++) {
            sumBalanceYsToken += await lockingService.balanceOfYsCvgAt(tokenId, cycleId);
        }
        expect(sumBalanceYsToken).to.be.eq(totalSupplyYs);
    }
}

export async function goOnNextWeek() {
    const actualTimestamp = BigInt((await ethers.provider.getBlock("latest"))!.timestamp);
    const weekActual = actualTimestamp / ONE_WEEK;
    const nextWeekStartTimestamp = weekActual * ONE_WEEK + ONE_WEEK;
    await time.increaseTo(nextWeekStartTimestamp);
}
