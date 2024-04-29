import {ethers} from "hardhat";
import {BondDepository} from "../../typechain-types";

export interface Balances {
    token: string;
    balances: AddressAmount[];
}

interface AddressAmount {
    address: string;
    amount: bigint;
}

export async function getVestingRatio(bondDepository: BondDepository, tokenId: number): Promise<bigint> {
    const bondInfoUser = await bondDepository.positionInfos(tokenId);
    const actualTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
    const ratio = ((BigInt(actualTimestamp) - BigInt(bondInfoUser.lastTimestamp)) * 10_000n) / bondInfoUser.vestingTimeLeft;
    return ratio;
}
