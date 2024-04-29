import {getAddress, getContract, txCheck} from "../../helper";
import {ethers, network} from "hardhat";
import {
    Cvg,
    CvgPepe,
    CvgRewards,
    Ibo,
    LockingPositionService,
    SdtStakingViewer,
    SdtUtilities,
    SeedPresaleCvg,
    WlPresaleCvg,
    YsDistributor,
} from "../../../../../typechain-types";
import {impersonateAccount, setStorageAt, stopImpersonatingAccount, time, getStorageAt} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {MaxUint256} from "ethers";
import {TOKEN_ADDR_CRV, TOKEN_ADDR_CVX, TOKEN_ADDR_FRAX, TOKEN_ADDR_SDT, TOKEN_ADDR_WETH} from "../../../../../resources/tokens/common";
import * as iboConfigurations from "../../../../../resources/ibo_config";
import {MerkleHelper} from "../../../../../utils/MerkleHelper";
import {CVGPEPE_HOLDER_1, CVGPEPE_HOLDER_2, CVGPEPE_HOLDER_3, CVG_PEPE, INVESTORWALLET} from "../../../../../resources/cvg-mainnet";

import {
    PRESALE_SEED_CONTRACT,
    PRESALE_WL_CONTRACT,
    IBO_CONTRACT,
    SDT_UTILITIES_CONTRACT,
    SDT_STAKING_VIEWER_CONTRACT,
    CVGSDT_CONTRACT,
    CVGSDT_STAKING_CONTRACT,
    CVG_PEPE_CONTRACT,
} from "../../../../../resources/contracts";
import {IUsers} from "../../../../../utils/contractInterface";
import {GaugeController} from "../../../../../typechain-types-vyper/GaugeController";

export const galleryPresale = async (u: IUsers, ISMULTIVOTE: boolean, ISMULTISTAKING: boolean) => {
    const signers = await ethers.getSigners();
    const user2 = signers[2];
    console.info("\x1b[33m ************ Gallery setup ************ \x1b[0m");

    const cvgPepeContract = (await ethers.getContractAt(CVG_PEPE_CONTRACT, CVG_PEPE)) as CvgPepe;
    const seedPresaleContract = await getContract<SeedPresaleCvg>(PRESALE_SEED_CONTRACT);
    const wlPresaleContract = await getContract<WlPresaleCvg>(PRESALE_WL_CONTRACT);
    const iboContract = await getContract<Ibo>(IBO_CONTRACT);
    const amount = ethers.parseEther("1");
    const iboOwner = await iboContract.owner();

    await txCheck(async () => {
        await u.owner.sendTransaction({
            to: CVGPEPE_HOLDER_1,
            value: amount,
        });
        await u.owner.sendTransaction({
            to: CVGPEPE_HOLDER_2,
            value: amount,
        });
        await u.owner.sendTransaction({
            to: CVGPEPE_HOLDER_3,
            value: amount,
        });
        // impersonateAccount(CVGPEPE_HOLDER_1);
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [CVGPEPE_HOLDER_1],
        });
        await cvgPepeContract.connect(await ethers.getSigner(CVGPEPE_HOLDER_1)).transferFrom(CVGPEPE_HOLDER_1, u.user2.address, 1);
        // stopImpersonatingAccount(CVGPEPE_HOLDER_1);
        // impersonateAccount(CVGPEPE_HOLDER_2);
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [CVGPEPE_HOLDER_2],
        });
        await cvgPepeContract.connect(await ethers.getSigner(CVGPEPE_HOLDER_2)).transferFrom(CVGPEPE_HOLDER_2, u.user2.address, 2);
        // stopImpersonatingAccount(CVGPEPE_HOLDER_2);
        // impersonateAccount(CVGPEPE_HOLDER_3);
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [CVGPEPE_HOLDER_3],
        });
        const tx = cvgPepeContract.connect(await ethers.getSigner(CVGPEPE_HOLDER_3)).transferFrom(CVGPEPE_HOLDER_3, u.user2.address, 4);
        // stopImpersonatingAccount(CVGPEPE_HOLDER_3);
        return tx;
    }, "SEND_CVGPEPE_NFTS");

    await txCheck(async () => {
        await u.owner.sendTransaction({
            to: INVESTORWALLET,
            value: amount,
        });
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [INVESTORWALLET],
        });
        console.log("seed", await seedPresaleContract.getAddress());
        console.log("wl", await wlPresaleContract.getAddress());
        console.log(await seedPresaleContract.balanceOf(INVESTORWALLET));
        console.log(await wlPresaleContract.balanceOf(INVESTORWALLET));
        //Send SeedPresale NFT to user2
        await seedPresaleContract.connect(await ethers.getSigner(INVESTORWALLET)).transferFrom(INVESTORWALLET, u.user2.address, 29);
        console.log("seed sent");
        //Send WlPresale NFT to user2
        const tx = wlPresaleContract.connect(await ethers.getSigner(INVESTORWALLET)).transferFrom(INVESTORWALLET, u.user2.address, 49);
        console.log("wl sent");

        // await network.provider.request({
        //     method: "hardhat_stopImpersonatingAccount",
        //     params: [INVESTORWALLET],
        // });
        return tx;
    }, "SEND_PRESALE_NFTS");

    // await txCheck(async () => {
    //     await network.provider.request({
    //         method: "hardhat_impersonateAccount",
    //         params: [iboOwner],
    //     });
    //     return await iboContract.connect(await ethers.getSigner(iboOwner)).setStartTimestamp(await time.latest());
    // }, "SET_TIMESTAMP_IBO");

    // await txCheck(async () => {
    //     return await iboContract.connect(await ethers.getSigner(iboOwner)).createBond(iboConfigurations.FRAX);
    // }, "CREATE_FRAX_BOND_IBO");

    // await txCheck(async () => {
    //     return await iboContract.connect(await ethers.getSigner(iboOwner)).createBond(iboConfigurations.CRV);
    // }, "CREATE_CRV_BOND_IBO");

    // await txCheck(async () => {
    //     const tx = await iboContract.connect(await ethers.getSigner(iboOwner)).createBond(iboConfigurations.CVX);
    //     await network.provider.request({
    //         method: "hardhat_stopImpersonatingAccount",
    //         params: [iboOwner],
    //     });
    //     return tx;
    // }, "CREATE_CVX_BOND_IBO");

    // await txCheck(async () => {
    //     //change merkleRootWl on IboContract
    //     const root = MerkleHelper.getRoot(u.classicWl);
    //     await setStorageAt(await iboContract.getAddress(), 17, root);

    //     const FRAX_AMOUNT_IN = MerkleHelper.bigNumberFactory(100, 18);
    //     const proof = MerkleHelper.getProofMerkle(u.classicWl, u.user2.address);

    //     const frax = await ethers.getContractAt("ERC20", TOKEN_ADDR_FRAX);
    //     await frax.connect(u.user2).approve(iboContract, MaxUint256);

    //     return await iboContract.connect(u.user2).deposit(0, 1, FRAX_AMOUNT_IN, MerkleHelper.bigNumberFactory(250, 18), 1, proof);
    // }, "DEPOSIT_IBO_BOND");

    if (ISMULTIVOTE) {
        await txCheck(async () => {
            const gaugeController = await getContract<GaugeController>("GaugeController");
            const lockingPositionService = await getContract<LockingPositionService>("LockingPositionService");
            const cvg = await getContract<Cvg>("Cvg");
            const cvgRewards = await getContract<CvgRewards>("CvgRewards");
            const allGauges = await cvgRewards.getGaugeChunk(0, 10);
            await cvg.approve(lockingPositionService, ethers.MaxUint256);
            await lockingPositionService.mintPosition(95, ethers.parseEther("10"), 50, signers[0], true);
            return await gaugeController.multi_vote([
                {
                    tokenId: 1n,
                    votes: [
                        {gauge_address: allGauges[0].stakingAddress, weight: 5n},
                        {gauge_address: allGauges[1].stakingAddress, weight: 5n},
                        {gauge_address: allGauges[2].stakingAddress, weight: 5n},
                        {gauge_address: allGauges[3].stakingAddress, weight: 5n},
                        {gauge_address: allGauges[4].stakingAddress, weight: 5n},
                        {gauge_address: allGauges[5].stakingAddress, weight: 5n},
                        {gauge_address: allGauges[6].stakingAddress, weight: 5n},
                        {gauge_address: allGauges[7].stakingAddress, weight: 5n},
                        {gauge_address: allGauges[8].stakingAddress, weight: 5n},
                        {gauge_address: allGauges[9].stakingAddress, weight: 5n},
                    ],
                },
            ]);
        }, "MULTI_VOTE");
    }

    if (ISMULTISTAKING) {
        await txCheck(async () => {
            const AMOUNT = ethers.parseEther("2000");
            const sdtUtilities = await getContract<SdtUtilities>(SDT_UTILITIES_CONTRACT);
            const sdtStakingViewer = await getContract<SdtStakingViewer>(SDT_STAKING_VIEWER_CONTRACT);
            const sdt = await ethers.getContractAt("ERC20", TOKEN_ADDR_SDT);
            const cvgSdt = await ethers.getContractAt("CvgSDT", getAddress(CVGSDT_CONTRACT));

            //cvgSdtStaking
            await sdt.connect(user2).approve(cvgSdt, ethers.MaxUint256);
            await cvgSdt.connect(user2).approve(sdtUtilities, ethers.MaxUint256);
            await cvgSdt.connect(user2).mint(user2, AMOUNT);
            await sdtUtilities.approveTokens([{token: cvgSdt, spender: getAddress(CVGSDT_STAKING_CONTRACT), amount: ethers.MaxUint256}]);
            await sdtUtilities.connect(user2).convertAndStakeCvgSdt(0, AMOUNT, 0, 0);

            //sdtStakings
            const sd = [
                "sdCRVGAUGEContractStaking",
                "sdANGLEGAUGEContractStaking",
                "sdFXSGAUGEContractStaking",
                "sdBALGAUGEContractStaking",
                "sdPENDLEGAUGEContractStaking",
                "sdFXNGAUGEContractStaking",
            ];
            const sdtStakings = getAddress("stakingContracts");
            for (const staking in sdtStakings) {
                const stakingAddress = sdtStakings[staking];
                const stakingName = staking;
                let tokenAdd;
                if (sd.includes(stakingName)) {
                    const staking = await sdtStakingViewer?.getGlobalViewSdAssetStaking([stakingAddress]);
                    tokenAdd = staking[0].sdAsset;
                    const tokenContract = await ethers.getContractAt("ERC20", tokenAdd);
                    await (await tokenContract.connect(user2).approve(sdtUtilities, ethers.MaxUint256)).wait();
                    await (await sdtUtilities.connect(user2).convertAndStakeSdAsset(0, stakingAddress, 0, 0, AMOUNT, 0, false)).wait();
                } else {
                    const staking = await sdtStakingViewer?.getGlobalViewLpAssetStaking([stakingAddress]);
                    tokenAdd = staking[0].lpAsset;
                    const tokenContract = await ethers.getContractAt("ERC20", tokenAdd);
                    await (await tokenContract.connect(user2).approve(sdtUtilities, ethers.MaxUint256)).wait();
                    await (await sdtUtilities.connect(user2).convertAndStakeLpAsset(0, stakingAddress, 0, AMOUNT, false)).wait();
                }
            }
        }, "MULTI_STAKING");
    }

    // await txCheck(async () => {
    //     // const lockingPositionServiceContract = await getContract<LockingPositionService>("LockingPositionService");
    //     const ysDistributor = await getContract<YsDistributor>("YsDistributor");
    //     const cvx = await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX);
    //     const crv = await ethers.getContractAt("ERC20", TOKEN_ADDR_CRV);
    //     const weth = await ethers.getContractAt("ERC20", TOKEN_ADDR_WETH);

    //     // approve treasuryPdd tokens spending
    //     await cvx.connect(u.treasuryPdd).approve(ysDistributor, MaxUint256);
    //     await crv.connect(u.treasuryPdd).approve(ysDistributor, MaxUint256);
    //     await weth.connect(u.treasuryPdd).approve(ysDistributor, MaxUint256);

    //     const cvxAmount = ethers.parseEther("5");
    //     const crvAmount = ethers.parseEther("10");
    //     const wethAmount = ethers.parseEther("15");

    //     const depositStructTDE1 = [
    //         {token: cvx, amount: cvxAmount},
    //         {token: crv, amount: crvAmount},
    //         {token: weth, amount: wethAmount},
    //     ];
    //     await ysDistributor.connect(u.treasuryPdd).depositMultipleToken(depositStructTDE1);
    // }, "DISTRIBUTE_TDE1");
};
