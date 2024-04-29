import {LOCKING_POSITION_SERVICE_CONTRACT} from "../../../../../resources/contracts";
import {IUsers} from "../../../../../utils/contractInterface";
import {txCheck, getAddress, getContract} from "../../../complete/helper";
import {Cvg} from "../../../../../typechain-types/contracts/Token";
import {BoostWlIbo, LockingPositionService, VeSDTAirdrop} from "../../../../../typechain-types";
import hre, {ethers} from "hardhat";
export const deployAirdrop = async () => {
    console.info("\x1b[33m ************ Deploy Airdrop Protocol ************ \x1b[0m");

    const cvgContract = await getContract<Cvg>("Cvg");
    // await txCheck(
    //     async () => {
    //         return await (await ethers.deployContract("BoostWlIbo", [])).waitForDeployment();
    //     },
    //     "DEPLOY_BOOST_WL",
    //     "BoostWlIbo"
    // );
    // await txCheck(async () => {
    //     const treasuryDao = getAddress("treasuryDao");
    //     const treasuryAirdrop = getAddress("treasuryAirdrop");
    //     await u.owner.sendTransaction({
    //         to: treasuryAirdrop,
    //         value: ethers.parseEther("2"),
    //     });
    //     await network.provider.request({
    //         method: "hardhat_impersonateAccount",
    //         params: [treasuryDao],
    //     });
    //     await network.provider.request({
    //         method: "hardhat_impersonateAccount",
    //         params: [treasuryAirdrop],
    //     });

    //     const BoostWlIbo = await getContract<BoostWlIbo>("BoostWlIbo");
    //     await cvgContract.connect(await ethers.getSigner(treasuryAirdrop)).approve(BoostWlIbo, ethers.parseEther("165600"));
    //     const tx = await BoostWlIbo.connect(await ethers.getSigner(treasuryDao)).startAirdrop();

    //     return tx;
    // }, "START_WL_BOOST");

    // await txCheck(
    //     async () => {
    //         return await (await ethers.deployContract("VeSDTAirdrop", [getAddress("CvgControlTower")])).waitForDeployment();
    //     },
    //     "DEPLOY_VESDT_AIRDROP",
    //     "VeSDTAirdrop"
    // );

    // await txCheck(async () => {
    //     const treasuryDao = getAddress("treasuryDao");
    //     const treasuryAirdrop = getAddress("treasuryAirdrop");
    //     await u.owner.sendTransaction({
    //         to: treasuryAirdrop,
    //         value: ethers.parseEther("2"),
    //     });
    //     await network.provider.request({
    //         method: "hardhat_impersonateAccount",
    //         params: [treasuryDao],
    //     });
    //     await network.provider.request({
    //         method: "hardhat_impersonateAccount",
    //         params: [treasuryAirdrop],
    //     });
    //     const merkleRoot = "0x159e2649ec25ed81432aa1e009033d4bc91dcf5edf47570d530462730dc4a513";
    //     const veSDTAirdropContract = await getContract<VeSDTAirdrop>("VeSDTAirdrop");
    //     await cvgContract.connect(await ethers.getSigner(treasuryAirdrop)).approve(veSDTAirdropContract, ethers.parseEther("300000"));
    //     const tx = await veSDTAirdropContract.connect(await ethers.getSigner(treasuryDao)).startAirdrop(merkleRoot);

    //     return tx;
    // }, "START_VESDT_AIRDROP");

    // await txCheck(async () => {
    //     const lockingPositionService = await getContract<LockingPositionService>(LOCKING_POSITION_SERVICE_CONTRACT);
    //     const treasuryDao = getAddress("treasuryDao");
    //     const veSDTAirdropContract = await getContract<VeSDTAirdrop>("VeSDTAirdrop");
    //     const tx = await lockingPositionService.connect(await ethers.getSigner(treasuryDao)).toggleContractLocker(veSDTAirdropContract);
    //     return tx;
    // }, "TOGGLE_VESDT_AIRDROP_LOCKER");
};
