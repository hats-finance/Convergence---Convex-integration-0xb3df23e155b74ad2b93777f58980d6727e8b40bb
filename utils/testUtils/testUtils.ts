import {expect} from "chai";
import {ethers} from "hardhat";

export function withinPercentage(value1: bigint, value2: bigint, percentage: number) {
    if (percentage <= 0 || percentage >= 100) {
        throw "Error percentage";
    }
    let percentageBigInt = BigInt(percentage * 100);
    expect(value1).to.be.within((value2 * (10_000n - percentageBigInt)) / 10_000n, (value2 * (10_000n + percentageBigInt)) / 10_000n);
}

export async function getActualBlockTimeStamp() {
    return (await ethers.provider.getBlock("latest"))!.timestamp;
}
