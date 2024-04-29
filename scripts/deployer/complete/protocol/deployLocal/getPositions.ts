import {ethers, network} from "hardhat";
import {BOND_POSITION_MANAGER, LOCKING_POSITION_MANAGER_CONTRACT, SDT_STAKING_POSITION_MANAGER_CONTRACT} from "../../../../../resources/contracts";
import {IUsers} from "../../../../../utils/contractInterface";
import {txCheck, getContract} from "../../helper";
import {BondPositionManager, Ibo, LockingPositionManager, SdtStakingPositionManager, SeedPresaleCvg, WlPresaleCvg} from "../../../../../typechain-types";

export const getPositions = async (u: IUsers) => {
    console.info("\x1b[33m ************ Get Positions process ************ \x1b[0m");
    const amountEther = ethers.parseEther("10");
    await txCheck(
        async () => {
            const tokenIds = [1, 2, 3];
            const lockingPositionManager = await getContract<LockingPositionManager>(LOCKING_POSITION_MANAGER_CONTRACT);
            const tokenInfos = await Promise.all(
                tokenIds.map(async (tokenId) => {
                    const owner = await lockingPositionManager.ownerOf(tokenId);
                    //give some eth to each owners
                    await u.owner.sendTransaction({
                        to: owner,
                        value: amountEther,
                    });
                    return {owner, tokenId};
                })
            );
            for (const tokenInfo of tokenInfos) {
                await network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [tokenInfo.owner],
                });
                await lockingPositionManager.connect(await ethers.getSigner(tokenInfo.owner)).transferFrom(tokenInfo.owner, u.user2, tokenInfo.tokenId);
            }
        },
        "SET_STORAGE_POSITIONS_LOCKING",
        null,
        false,
        true
    );
    await txCheck(
        async () => {
            const tokenIds = [1, 2, 3];
            const stakingPositionManager = await getContract<SdtStakingPositionManager>(SDT_STAKING_POSITION_MANAGER_CONTRACT);
            const tokenInfos = await Promise.all(
                tokenIds.map(async (tokenId) => {
                    const owner = await stakingPositionManager.ownerOf(tokenId);
                    //give some eth to each owners
                    await u.owner.sendTransaction({
                        to: owner,
                        value: amountEther,
                    });
                    return {owner, tokenId};
                })
            );
            for (const tokenInfo of tokenInfos) {
                await network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [tokenInfo.owner],
                });
                await stakingPositionManager.connect(await ethers.getSigner(tokenInfo.owner)).transferFrom(tokenInfo.owner, u.user2, tokenInfo.tokenId);
            }
        },
        "SET_STORAGE_POSITIONS_STAKING",
        null,
        false,
        true
    );
    await txCheck(
        async () => {
            const tokenIds = [1, 2, 3];
            const bondPositionManager = await getContract<BondPositionManager>(BOND_POSITION_MANAGER);
            const tokenInfos = await Promise.all(
                tokenIds.map(async (tokenId) => {
                    const owner = await bondPositionManager.ownerOf(tokenId);
                    //give some eth to each owners
                    await u.owner.sendTransaction({
                        to: owner,
                        value: amountEther,
                    });

                    return {owner, tokenId};
                })
            );
            for (const tokenInfo of tokenInfos) {
                await network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [tokenInfo.owner],
                });
                await bondPositionManager.connect(await ethers.getSigner(tokenInfo.owner)).transferFrom(tokenInfo.owner, u.user2, tokenInfo.tokenId);
            }
        },
        "SET_STORAGE_POSITIONS_BOND",
        null,
        false,
        true
    );
    await txCheck(
        async () => {
            const tokenIds = [1, 2, 3];
            const WlPresaleCvg = await getContract<WlPresaleCvg>("WlPresaleCvg");
            const tokenInfos = await Promise.all(
                tokenIds.map(async (tokenId) => {
                    const owner = await WlPresaleCvg.ownerOf(tokenId);
                    //give some eth to each owners
                    await u.owner.sendTransaction({
                        to: owner,
                        value: amountEther,
                    });

                    return {owner, tokenId};
                })
            );
            for (const tokenInfo of tokenInfos) {
                await network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [tokenInfo.owner],
                });
                await WlPresaleCvg.connect(await ethers.getSigner(tokenInfo.owner)).transferFrom(tokenInfo.owner, u.user2, tokenInfo.tokenId);
            }
        },
        "SET_STORAGE_POSITIONS_WLPRESALE",
        null,
        false,
        true
    );
    await txCheck(
        async () => {
            const tokenIds = [1, 2, 3];
            const SeedPresaleCvg = await getContract<SeedPresaleCvg>("SeedPresaleCvg");
            const tokenInfos = await Promise.all(
                tokenIds.map(async (tokenId) => {
                    const owner = await SeedPresaleCvg.ownerOf(tokenId);
                    //give some eth to each owners
                    await u.owner.sendTransaction({
                        to: owner,
                        value: amountEther,
                    });

                    return {owner, tokenId};
                })
            );
            for (const tokenInfo of tokenInfos) {
                await network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [tokenInfo.owner],
                });
                await SeedPresaleCvg.connect(await ethers.getSigner(tokenInfo.owner)).transferFrom(tokenInfo.owner, u.user2, tokenInfo.tokenId);
            }
        },
        "SET_STORAGE_POSITIONS_SEEDPRESALE",
        null,
        false,
        true
    );
    await txCheck(
        async () => {
            const tokenIds = [1, 2, 3];
            const Ibo = await getContract<Ibo>("Ibo");
            const tokenInfos = await Promise.all(
                tokenIds.map(async (tokenId) => {
                    const owner = await Ibo.ownerOf(tokenId);
                    //give some eth to each owners
                    await u.owner.sendTransaction({
                        to: owner,
                        value: amountEther,
                    });

                    return {owner, tokenId};
                })
            );
            for (const tokenInfo of tokenInfos) {
                await network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [tokenInfo.owner],
                });
                await Ibo.connect(await ethers.getSigner(tokenInfo.owner)).transferFrom(tokenInfo.owner, u.user2, tokenInfo.tokenId);
            }
        },
        "SET_STORAGE_POSITIONS_IBO",
        null,
        false,
        true
    );
};
