import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../resources/treasury";
import {fetchMainnetContracts} from "../stake-dao";
import {impersonateAccount} from "@nomicfoundation/hardhat-toolbox/network-helpers";

export async function main() {
    const contractsUsers = await fetchMainnetContracts();
    const users = contractsUsers.users;
    await users.user1.sendTransaction({to: TREASURY_DAO, value: ethers.parseEther("100")});
    await impersonateAccount(TREASURY_DAO);
    const treasuryDao = await ethers.getSigner(TREASURY_DAO);

    const crv = contractsUsers.globalAssets.crv;
    const cvx = contractsUsers.globalAssets.cvx;
    const fxs = contractsUsers.globalAssets.fxs;

    const ysStreamer = await ethers.getContractAt("YsStreamer", "0xf93b0549cD50c849D792f0eAE94A598fA77C7718");

    await ysStreamer.connect(treasuryDao).addReward([
        {token: crv, distributor: users.user2},
        {token: cvx, distributor: users.user2},
        {token: fxs, distributor: users.user2},
    ]);

    await ysStreamer.connect(users.user2).notifyRewardAmount([
        {token: crv, amount: ethers.parseEther("5000")},
        {token: cvx, amount: ethers.parseEther("2000")},
        {token: fxs, amount: ethers.parseEther("30000")},
    ]);
}

main();
