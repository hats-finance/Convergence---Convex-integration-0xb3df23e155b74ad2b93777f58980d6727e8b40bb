import {ethers, network} from "hardhat";
import {CvgSDT, CvgControlTower, SdtUtilities, SdtStakingLogo} from "../../../../../typechain-types";
import {TOKEN_ADDR_SDT} from "../../../../../resources/tokens/common";
import {FACTORY_PLAIN_POOL} from "../../../../../resources/curve";
import {MaxUint256, ZeroAddress, parseEther} from "ethers";
import {
    CONTROL_TOWER_CONTRACT,
    CVGSDT_CONTRACT,
    CVGSDT_POOL,
    CVGSDT_STAKING_CONTRACT,
    SDT_REWARD_DISTRIBUTOR_CONTRACT,
    SDT_STAKING_LOGO_CONTRACT,
} from "../../../../../resources/contracts";
import {getAddress, getContract, txCheck} from "../../../complete/helper";
import {VE_SDT_ADDRESS} from "../../../../../resources/stake";
import {TREASURY_POD} from "../../../../../resources/treasury";
export const deployCvgSdtPool = async (u: any) => {
    console.info("\x1b[33m ************ CvgSdt pool deployment ************ \x1b[0m");

    const controlTowerContract = (await getContract(CONTROL_TOWER_CONTRACT)) as unknown as CvgControlTower;

    await txCheck(async () => {
        const sdt = await ethers.getContractAt("ERC20", TOKEN_ADDR_SDT);
        const cvgSdt = await getContract<CvgSDT>(CVGSDT_CONTRACT);
        const cvgSdtPoolContract = await ethers.getContractAt("ICrvPoolPlain", getAddress("CVGSDT_POOL"));
        const amount = parseEther("1000000");
        await sdt.connect(u.owner).approve(cvgSdt, amount);
        await cvgSdt.connect(u.owner).mint(u.owner, amount);
        // await network.provider.request({
        //     method: "hardhat_impersonateAccount",
        //     params: [TREASURY_POD],
        // });
        // const podSigner = await ethers.getSigner(TREASURY_POD);

        console.log("bal sdt", await sdt.balanceOf(u.owner));
        console.log("bal cvgSDT", await cvgSdt.balanceOf(u.owner));

        // await (await sdt.connect(podSigner).approve(cvgSdtPoolContract, MaxUint256)).wait();
        // await (await cvgSdt.connect(podSigner).approve(cvgSdtPoolContract, MaxUint256)).wait();
        await (await sdt.approve(cvgSdtPoolContract, MaxUint256)).wait();
        await (await cvgSdt.approve(cvgSdtPoolContract, MaxUint256)).wait();

        return cvgSdtPoolContract["add_liquidity(uint256[],uint256,address)"]([amount, amount], 0, TREASURY_POD); // 1$
    }, "ADD_LIQ_CVGSDT_POOL");

    // await txCheck(async () => {
    //     return controlTowerContract.connect(u.treasuryDao).setPoolCvgSdt(getAddress(CVGSDT_POOL));
    // }, "SET_POOL_CVG_SDT_IN_CONTROL_TOWER");

    // await txCheck(async () => {
    //     const sdtRewardDistributor = await ethers.getContractAt(SDT_REWARD_DISTRIBUTOR_CONTRACT, getAddress(SDT_REWARD_DISTRIBUTOR_CONTRACT));

    //     return sdtRewardDistributor.connect(u.treasuryDao).setPoolCvgSdtAndApprove(getAddress(CVGSDT_POOL), ethers.MaxUint256);
    // }, "SET_CVGSDT_STABLE_LP && APPROVE IN CVGSDTSTAKING");

    // const sdtUtilities = await getContract<SdtUtilities>("SdtUtilities");
    // const cvgSdtStaking = getAddress(CVGSDT_STAKING_CONTRACT);
    // const cvgSdt = await getContract<CvgSDT>("CvgSDT");
    // const sdt = TOKEN_ADDR_SDT;
    // const cvgSdt_Sdt_lp = getAddress(CVGSDT_POOL);

    // const setStablePools: SdtUtilities.SetStablePoolStruct[] = [{liquidLocker: cvgSdt, lp: cvgSdt_Sdt_lp}];

    // await txCheck(async () => {
    //     return sdtUtilities.setStablePools(setStablePools);
    // }, "SET_CVGSDT_STABLE_LP ");

    // await txCheck(async () => {
    //     return sdtUtilities.approveTokens([
    //         {token: cvgSdt, spender: cvgSdtStaking, amount: ethers.MaxUint256},
    //         {token: sdt, spender: cvgSdt, amount: ethers.MaxUint256},
    //         {token: sdt, spender: cvgSdt_Sdt_lp, amount: ethers.MaxUint256},
    //     ]);
    // }, "APPROVE_CVGSDT & Utilities");

    // //LOCK SDT ON VESDT WITH VESDTMULTISIG
    // await txCheck(async () => {
    //     const veSdtContract = await ethers.getContractAt("IVeSDT", VE_SDT_ADDRESS);
    //     const sdtContract = await ethers.getContractAt("ERC20", TOKEN_ADDR_SDT);
    //     await sdtContract.connect(u.veSdtMultisig).approve(veSdtContract, ethers.MaxUint256);
    //     const timestamp = (await ethers.provider.getBlock("latest"))?.timestamp;
    //     const MAX_TIME = 4 * 365 * 86400;

    //     return veSdtContract.connect(u.veSdtMultisig).create_lock(ethers.parseEther("1000"), (timestamp as number) + MAX_TIME);
    // }, "LOCK_SDT");

    // await txCheck(async () => {
    //     const stakingLogoContract = await getContract<SdtStakingLogo>(SDT_STAKING_LOGO_CONTRACT);
    //     return stakingLogoContract
    //         .connect(u.treasuryDao)
    //         .setSdAssetInfos([{sdAsset: getAddress("CvgSDT"), asset: TOKEN_ADDR_SDT, curvePool: getAddress("CVGSDT_POOL")}]);
    // }, "SET_CVGSDT_IN_SDT_STAKING_LOGO");
};
