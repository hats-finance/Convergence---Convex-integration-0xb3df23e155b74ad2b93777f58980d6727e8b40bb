import {ethers, network} from "hardhat";
import {BOND_POSITION_MANAGER, LOCKING_POSITION_MANAGER_CONTRACT, SDT_STAKING_POSITION_MANAGER_CONTRACT} from "../../../../../resources/contracts";
import {IContractsConvex, IUsers} from "../../../../../utils/contractInterface";
import {txCheck, getContract} from "../../helper";
import {parseEther, Signer, MaxUint256} from "ethers";
import {BondPositionManager, Ibo, LockingPositionManager, SdtStakingPositionManager, SeedPresaleCvg, WlPresaleCvg} from "../../../../../typechain-types";
import {MINT} from "../../../../../resources/constant";
import {CVX_CRV_WRAPPER, CVX_FPIS_WRAPPER, CVX_FXN_WRAPPER, CVX_FXS_WRAPPER, CVX_PRISMA_WRAPPER, EMPTY_CVX_DATA_STRUCT} from "../../../../../resources/convex";

export const getPositionsConvex = async (contractsUsers: IContractsConvex) => {
    console.info("\x1b[33m ************ Get Positions process ************ \x1b[0m");
    const amountEther = ethers.parseEther("10");
    let depositedAmountUser1 = parseEther("5000"),
        depositedAmountUser2 = parseEther("100000");
    const users = contractsUsers.contractsUserMainnet.users;
    //assets
    const cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
    const fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;
    const crv = contractsUsers.contractsUserMainnet.globalAssets.crv;
    const cvg = contractsUsers.contractsUserMainnet.cvg;
    const eusdfraxbp = contractsUsers.contractsUserMainnet.curveLps!.eusdfraxbp;
    const cvxCrv = contractsUsers.contractsUserMainnet.convexAssets!.cvxCrv;
    const cvxFpis = contractsUsers.contractsUserMainnet.convexAssets!.cvxFpis;
    const cvxFxn = contractsUsers.contractsUserMainnet.convexAssets!.cvxFxn;
    const cvxFxs = contractsUsers.contractsUserMainnet.convexAssets!.cvxFxs;

    //contracts
    const cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
    const cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;
    const cvgeUSDFRAXBPStaking = contractsUsers.convex.cvgFraxLpStaking.cvgeUSDFRAXBPStaking;
    const cvgeUSDFRAXBPLocker = contractsUsers.convex.cvgFraxLpLocker.cvgeUSDFRAXBPLocker;
    const cvxCrvWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_CRV_WRAPPER);
    const cvxCrvStakingPositionService = contractsUsers.convex.cvxCrvStakingPositionService;
    const cvxFpisWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FPIS_WRAPPER);
    const cvxFxnWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FXN_WRAPPER);
    const cvxFxnStakingPositionService = contractsUsers.convex.cvxFxnStakingPositionService;
    const cvxFxsWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FXS_WRAPPER);
    const cvxFxsStakingPositionService = contractsUsers.convex.cvxFxsStakingPositionService;
    const cvxPrisma = contractsUsers.contractsUserMainnet.convexAssets!.cvxPrisma;
    const cvxPrismaWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_PRISMA_WRAPPER);
    const cvxPrismaStakingPositionService = contractsUsers.convex.cvxPrismaStakingPositionService;

    //CvgCvxStaking
    console.log("CvgCvxStaking");
    // mint cvgCVX
    await cvx.approve(cvxConvergenceLocker, MaxUint256);
    await cvxConvergenceLocker.mint(users.owner, parseEther("3000000"), false);
    // transfer cvgCVX to users
    await cvxConvergenceLocker.transfer(users.user1, parseEther("1000000"));
    await cvxConvergenceLocker.transfer(users.user2, parseEther("1000000"));
    // approve cvgCVX spending from staking contract
    await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxStaking, MaxUint256);
    await cvxConvergenceLocker.connect(users.user2).approve(cvgCvxStaking, MaxUint256);
    // deposit for user1 and user2;
    await cvgCvxStaking.connect(users.user1).deposit(MINT, depositedAmountUser1, EMPTY_CVX_DATA_STRUCT);
    await cvgCvxStaking.connect(users.user2).deposit(MINT, depositedAmountUser2, EMPTY_CVX_DATA_STRUCT);

    //CvgFraxLpStaking
    console.log("CvgFraxLpStaking");
    await eusdfraxbp.connect(users.owner).approve(cvgeUSDFRAXBPLocker, ethers.MaxUint256);
    await cvgeUSDFRAXBPLocker.connect(users.owner).depositLp(ethers.parseEther("3000000"), true, users.owner);
    //transfer cvgeUSDFRAXBP to users
    await cvgeUSDFRAXBPLocker.transfer(users.user1, ethers.parseEther("1000000"));
    await cvgeUSDFRAXBPLocker.transfer(users.user2, ethers.parseEther("1000000"));
    await cvgeUSDFRAXBPLocker.transfer(users.user3, ethers.parseEther("1000000"));
    // approve cvgSdt spending from staking contract
    await cvgeUSDFRAXBPLocker.connect(users.user1).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
    await cvgeUSDFRAXBPLocker.connect(users.user2).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
    //deposit
    await cvgeUSDFRAXBPStaking.connect(users.user1).deposit(MINT, depositedAmountUser1);
    await cvgeUSDFRAXBPStaking.connect(users.user2).deposit(MINT, depositedAmountUser2);

    //CvxCrv
    console.log("CvxCrv");
    await cvxCrv.connect(users.user1).approve(cvxCrvWrapper, ethers.MaxUint256);
    await cvxCrvWrapper.connect(users.user1)["stake(uint256,address)"](ethers.parseEther("10000000"), users.user1);
    await cvxCrvWrapper.connect(users.user1).approve(cvxCrvStakingPositionService, ethers.MaxUint256);
    await cvxCrvStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

    //CvxFpis
    console.log("CvxFpis");
    const cvxFpisStakingPositionService = contractsUsers.convex.cvxFpisStakingPositionService;
    await cvxFpis.connect(users.user1).approve(cvxFpisWrapper, ethers.MaxUint256);
    await cvxFpisWrapper.connect(users.user1)["stake(uint256)"](ethers.parseEther("10000000"));
    await cvxFpisWrapper.connect(users.user1).approve(cvxFpisStakingPositionService, ethers.MaxUint256);
    await cvxFpisStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

    //CvxFxn
    console.log("CvxFxn");
    await cvxFxn.connect(users.user1).approve(cvxFxnWrapper, ethers.MaxUint256);
    await cvxFxnWrapper.connect(users.user1)["stake(uint256)"](ethers.parseEther("10000000"));
    await cvxFxnWrapper.connect(users.user1).approve(cvxFxnStakingPositionService, ethers.MaxUint256);
    await cvxFxnStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

    //CvxFxs
    console.log("CvxFxs");
    await cvxFxs.connect(users.user1).approve(cvxFxsWrapper, ethers.MaxUint256);
    await cvxFxsWrapper.connect(users.user1)["stake(uint256)"](ethers.parseEther("10000000"));
    await cvxFxsWrapper.connect(users.user1).approve(cvxFxsStakingPositionService, ethers.MaxUint256);
    await cvxFxsStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

    //CvxPrisma
    console.log("CvxPrisma");
    await cvxPrisma.connect(users.user1).approve(cvxPrismaWrapper, ethers.MaxUint256);
    await cvxPrismaWrapper.connect(users.user1)["stake(uint256)"](ethers.parseEther("10000000"));
    await cvxPrismaWrapper.connect(users.user1).approve(cvxPrismaStakingPositionService, ethers.MaxUint256);
    await cvxPrismaStakingPositionService.connect(users.user1).deposit(MINT, ethers.parseEther("2000000"), 2, 0, false, false);

    //VOTES
    // mint locking position and vote for cvgCvxStaking gauge
    // const currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();
    // const lockingEndCycle = 96n - currentCycle;
    // const tokenId = await contractsUsers.contractsUserMainnet.locking.lockingPositionManager.nextId();
    // await cvg.approve(contractsUsers.contractsUserMainnet.locking.lockingPositionService, parseEther("300000"));
    // await contractsUsers.contractsUserMainnet.locking.lockingPositionService.mintPosition(lockingEndCycle, parseEther("100000"), 0, users.owner, true);
    // await contractsUsers.contractsUserMainnet.locking.gaugeController.simple_vote(tokenId, cvgCvxStaking, 1000);
};
