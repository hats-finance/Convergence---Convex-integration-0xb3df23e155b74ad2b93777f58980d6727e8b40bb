import {ERC20, ISdAssetGauge} from "../../typechain-types";
import {Signer, parseEther} from "ethers";
import {ethers} from "hardhat";
import {impersonateAccount, stopImpersonatingAccount} from "@nomicfoundation/hardhat-network-helpers";

export async function takesGaugeOwnershipAndSetDistributor(gauge: ISdAssetGauge, newDistributor: Signer) {
    const cvgRewardsAmount = await gauge.reward_count();

    const admin = await gauge.admin();
    await newDistributor.sendTransaction({
        to: admin,
        value: parseEther("1"),
    });
    await impersonateAccount(admin);
    for (let index = 0; index < cvgRewardsAmount; index++) {
        const tokenAddress = await gauge.reward_tokens(index);

        const token = await ethers.getContractAt("ERC20", tokenAddress);
        await (await token.connect(newDistributor).approve(gauge, 0)).wait();
        await (await token.connect(newDistributor).approve(gauge, ethers.MaxUint256)).wait();

        await (await gauge.connect(await ethers.getSigner(admin)).set_reward_distributor(token, newDistributor)).wait();
    }

    await stopImpersonatingAccount(admin);
}
