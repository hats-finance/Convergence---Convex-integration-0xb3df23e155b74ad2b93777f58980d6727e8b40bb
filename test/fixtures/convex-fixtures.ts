import {impersonateAccount, setStorageAt, stopImpersonatingAccount} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers, upgrades} from "hardhat";
import {
    CONVEX_LOCKER,
    CVX_CRV_DEPOSITOR,
    CVX_CRV_WRAPPER,
    CVX_FPIS_DEPOSITOR,
    CVX_FPIS_WRAPPER,
    CVX_FXN_DEPOSITOR,
    CVX_FXN_WRAPPER,
    CVX_FXS_DEPOSITOR,
    CVX_FXS_WRAPPER,
    CVX_PRISMA_DEPOSITOR,
    CVX_PRISMA_WRAPPER, CVX_STAKING_CONTRACT,
    DELEGATE_REGISTRY_CONVEX,
    TOKEN_ADDR_CVX_CRV,
    TOKEN_ADDR_CVX_FPIS,
    TOKEN_ADDR_CVX_FXN,
    TOKEN_ADDR_CVX_FXS,
    TOKEN_ADDR_CVX_PRISMA,
} from "../../resources/convex";
import {TREASURY_DAO} from "../../resources/treasury";
import {getConvexAssets} from "../../scripts/deployer/unit/XX_setStorageBalanceAssets";
import {
    CvxConvergenceLocker,
    CvxStakingPositionManager,
    CvxRewardDistributor,
    CvgFraxLpLocker,
    CvgCvxStakingPositionService,
    CvgFraxLpStakingService, CVX1,
} from "../../typechain-types";
import {IContractsUserMainnet, IContractsConvex} from "../../utils/contractInterface";
import {deployProxy} from "../../utils/global/deployProxy";
import {configureAccounts} from "./testContext";
import {
    TOKEN_ADDR_CRV,
    TOKEN_ADDR_CVX,
    TOKEN_ADDR_FPIS,
    TOKEN_ADDR_FRAX,
    TOKEN_ADDR_FXN,
    TOKEN_ADDR_FXS,
    TOKEN_ADDR_PRISMA,
    TOKEN_ADDR_USDC,
    TOKEN_ADDR_eUSD,
} from "../../resources/tokens/common";
import {fetchMainnetContracts} from "./stake-dao";
import {
    CRV_DUO_FRAXBP,
    CRV_DUO_FRAXBP_POOL,
    CRV_DUO_cvxCRV_CRV,
    CRV_DUO_cvxFPIS_FPIS,
    CRV_DUO_cvxFXN_FXN,
    CRV_DUO_cvxFXS_FXS,
    CRV_DUO_cvxPRISMA_PRISMA,
    TOKEN_ADDR_3CRV,
} from "../../resources/lp";

export async function fetchMainnetConvexContracts(): Promise<IContractsUserMainnet> {
    // remove votes tracking on FXS token
    await setStorageAt(TOKEN_ADDR_FXS, 11, 0);

    const users = await configureAccounts();

    const contracts = await fetchMainnetContracts();
    const {convexAssets, curveLps} = await getConvexAssets(users);

    return {
        ...contracts,
        convexAssets,
        curveLps,
    };
}

export async function deployConvexFixture(): Promise<IContractsConvex> {
    const contractsUserMainnet = await fetchMainnetConvexContracts();

    await contractsUserMainnet.users.user1.sendTransaction({
        to: TREASURY_DAO,
        value: ethers.parseEther("100"),
    });

    await impersonateAccount(TREASURY_DAO);
    const treasuryDao = await ethers.getSigner(TREASURY_DAO);
    const proxyAdmin = contractsUserMainnet.base.proxyAdmin;

    const cvxLocker = await ethers.getContractAt("ICvxLocker", CONVEX_LOCKER);

    /// Migration ControlTower V2
    const CvgControlTowerFactory = await ethers.getContractFactory("CvgControlTower");
    const CvgControlTowerFactoryV2 = await ethers.getContractFactory("CvgControlTowerV2");
    await upgrades.validateUpgrade(CvgControlTowerFactory, CvgControlTowerFactoryV2);

    let cvgControlTowerV2 = await ethers.deployContract("CvgControlTowerV2", []);
    await cvgControlTowerV2.waitForDeployment();

    await proxyAdmin.connect(treasuryDao).upgrade(contractsUserMainnet.base.cvgControlTower, cvgControlTowerV2);
    cvgControlTowerV2 = await ethers.getContractAt("CvgControlTowerV2", contractsUserMainnet.base.cvgControlTower);

    /// Migration CloneFactory V2
    const CloneFactory = await ethers.getContractFactory("CloneFactory");
    const CloneFactoryV2 = await ethers.getContractFactory("CloneFactoryV2");
    await upgrades.validateUpgrade(CloneFactory, CloneFactoryV2);

    let cloneFactoryV2 = await ethers.deployContract("CloneFactoryV2", []);
    await cloneFactoryV2.waitForDeployment();

    await proxyAdmin.connect(treasuryDao).upgrade(contractsUserMainnet.base.cloneFactory, cloneFactoryV2);
    cloneFactoryV2 = await ethers.getContractAt("CloneFactoryV2", contractsUserMainnet.base.cloneFactory);

    /// Setup Proxy Beacon for CvxAssets

    const CvxAssetStakingServiceFactory = await ethers.getContractFactory("CvxAssetStakingService");
    const cvxAssetStakingServiceBase = await CvxAssetStakingServiceFactory.deploy();
    await cvxAssetStakingServiceBase.waitForDeployment();

    const CvxAssetStakerBufferFactory = await ethers.getContractFactory("CvxAssetStakerBuffer");
    const cvxAssetStakerBufferBase = await CvxAssetStakerBufferFactory.deploy();
    await cvxAssetStakerBufferBase.waitForDeployment();

    const upgradeableCvxAssetStakingBeacon = await ethers.deployContract("UpgradeableBeacon", [cvxAssetStakingServiceBase, treasuryDao]);
    await upgradeableCvxAssetStakingBeacon.waitForDeployment();

    const upgradeableCvxAssetBufferBeacon = await ethers.deployContract("UpgradeableBeacon", [cvxAssetStakerBufferBase, treasuryDao]);
    await upgradeableCvxAssetBufferBeacon.waitForDeployment();

    await cloneFactoryV2.connect(treasuryDao).setBeaconStakingServiceCvxAsset(upgradeableCvxAssetStakingBeacon);
    await cloneFactoryV2.connect(treasuryDao).setBeaconStakerBufferCvxAsset(upgradeableCvxAssetBufferBeacon);

    const filterCvxAssetCreated = cloneFactoryV2.filters.CvxAssetStakingCreated(undefined, undefined, undefined);

    // set CVX token
    await cvgControlTowerV2.connect(treasuryDao).setCvx(TOKEN_ADDR_CVX);

    // deploy CVX1 and mint some
    const CVX1 = await deployProxy<CVX1>(
        "string,string,address",
        ["Convergence Staked CVX", "CVX1", CVX_STAKING_CONTRACT],
        "CVX1",
        proxyAdmin
    );
    await contractsUserMainnet.globalAssets.cvx.approve(CVX1, ethers.parseEther("10000"));
    await CVX1.mint(contractsUserMainnet.users.owner, ethers.parseEther("10000"));

    // Convex Locker (cvgCVX + Buffer + Locker)
    const cvxConvergenceLocker = await deployProxy<CvxConvergenceLocker>(
        "string,string,address,address",
        ["Convergence CVX", "cvgCVX", DELEGATE_REGISTRY_CONVEX, await CVX1.getAddress()],
        "CvxConvergenceLocker",
        proxyAdmin
    );
    await cvgControlTowerV2.connect(treasuryDao).setCvxConvergenceLocker(cvxConvergenceLocker);
    const cvxStakingPositionManager = await deployProxy<CvxStakingPositionManager>("", [], "CvxStakingPositionManager", proxyAdmin);
    await cvgControlTowerV2.connect(treasuryDao).setCvxStakingPositionManager(cvxStakingPositionManager);

    // CVX Reward Distributor
    const cvxRewardDistributor = await deployProxy<CvxRewardDistributor>("address", [await CVX1.getAddress()], "CvxRewardDistributor", proxyAdmin);
    await cvgControlTowerV2.connect(treasuryDao).setCvxRewardDistributor(cvxRewardDistributor);
    await cvgControlTowerV2.connect(treasuryDao).toggleStakingContract(cvxRewardDistributor);

    // deploy cvgCVX/CVX1 pool
    const NEW_FACTORY_PLAIN_POOL = "0x6a8cbed756804b16e05e741edabd5cb544ae21bf";
    const curveFactoryPlain = await ethers.getContractAt("ICrvFactoryPlain", NEW_FACTORY_PLAIN_POOL);
    // TODO: review these params
    await curveFactoryPlain.deploy_plain_pool(
        "cvgCVX/CVX1", //name
        "cvgCVXCVX1", //symbol
        [CVX1, cvxConvergenceLocker], // coins
        37, // A
        10000000, // fee
        20000000000, // _offpeg_fee_multiplier
        866, // _ma_exp_time
        0, // _implementation_idx
        [0, 0], // _asset_types
        ["0x00000000", "0x00000000"], //_method_ids
        [ethers.ZeroAddress, ethers.ZeroAddress]
    );

    // get cvgCVX/CVX1 pool
    const poolAddress = await curveFactoryPlain.find_pool_for_coins(CVX1, cvxConvergenceLocker);
    const cvgCvxCvx1PoolContract = await ethers.getContractAt("ICrvPoolPlain", poolAddress);

    const amount = ethers.parseEther("10000");
    await contractsUserMainnet.globalAssets.cvx.approve(cvxConvergenceLocker, amount);
    await cvxConvergenceLocker.mint(contractsUserMainnet.users.owner, amount, true);

    await (await CVX1.approve(poolAddress, ethers.MaxUint256)).wait();
    await (await cvxConvergenceLocker.approve(poolAddress, ethers.MaxUint256)).wait();

    // add liquidity on cvgCVX/CVX1 pool + set in reward distributor
    await cvgCvxCvx1PoolContract["add_liquidity(uint256[],uint256)"]([amount, amount], "0"); //1$
    await cvxRewardDistributor.connect(treasuryDao).setPoolCvgCvxCvx1AndApprove(cvgCvxCvx1PoolContract, ethers.MaxUint256);

    const cvgCvxStakingPositionService = await deployProxy<CvgCvxStakingPositionService>(
        "address,address,address,string",
        [await cvxConvergenceLocker.getAddress(), await cvgCvxCvx1PoolContract.getAddress(), await CVX1.getAddress(), "STK-CVX1"],
        "CvgCvxStakingPositionService",
        proxyAdmin
    );

    await cvgControlTowerV2.connect(treasuryDao).toggleStakingContract(cvgCvxStakingPositionService);
    await cvxConvergenceLocker.connect(treasuryDao).setCvxStakingPositionService(cvgCvxStakingPositionService);

    /// cvxCRV
    await cloneFactoryV2
        .connect(treasuryDao)
        .createCvxAssetStakingAndBuffer(TOKEN_ADDR_CRV, TOKEN_ADDR_CVX_CRV, CVX_CRV_WRAPPER, CRV_DUO_cvxCRV_CRV, CVX_CRV_DEPOSITOR, 0, "CVX-CRV", [
            {token: TOKEN_ADDR_CVX, processorFees: 1_000, podFees: 2_000},
            {token: TOKEN_ADDR_CRV, processorFees: 1_000, podFees: 2_000},
            {token: TOKEN_ADDR_3CRV, processorFees: 1_000, podFees: 2_000},
        ]);

    const events = await cloneFactoryV2.queryFilter(filterCvxAssetCreated, -1, "latest");
    const event = events[events.length - 1].args;

    const cvxCrvStakingPositionService = await ethers.getContractAt("CvxAssetStakingService", event.stakingService);
    const cvxCrvStakerBuffer = await ethers.getContractAt("CvxAssetStakerBuffer", event.stakerBuffer);

    await cvgControlTowerV2.connect(treasuryDao).toggleStakingContract(cvxCrvStakingPositionService);
    await cvxCrvStakingPositionService.connect(treasuryDao).setBuffer(cvxCrvStakerBuffer);

    /// cvxFxs
    await cloneFactoryV2
        .connect(treasuryDao)
        .createCvxAssetStakingAndBuffer(TOKEN_ADDR_FXS, TOKEN_ADDR_CVX_FXS, CVX_FXS_WRAPPER, CRV_DUO_cvxFXS_FXS, CVX_FXS_DEPOSITOR, 1, "CVX-FXS", [
            {token: TOKEN_ADDR_CVX, processorFees: 1_000, podFees: 2_000},
            {token: TOKEN_ADDR_FXS, processorFees: 1_000, podFees: 2_000},
        ]);

    const eventFxs = (await cloneFactoryV2.queryFilter(filterCvxAssetCreated, -1, "latest"))[events.length - 1].args;

    const cvxFxsStakingPositionService = await ethers.getContractAt("CvxAssetStakingService", eventFxs.stakingService);
    const cvxFxsStakerBuffer = await ethers.getContractAt("CvxAssetStakerBuffer", eventFxs.stakerBuffer);

    await cvgControlTowerV2.connect(treasuryDao).toggleStakingContract(cvxFxsStakingPositionService);
    await cvxFxsStakingPositionService.connect(treasuryDao).setBuffer(cvxFxsStakerBuffer);

    /// cvxPrisma

    await cloneFactoryV2
        .connect(treasuryDao)
        .createCvxAssetStakingAndBuffer(
            TOKEN_ADDR_PRISMA,
            TOKEN_ADDR_CVX_PRISMA,
            CVX_PRISMA_WRAPPER,
            CRV_DUO_cvxPRISMA_PRISMA,
            CVX_PRISMA_DEPOSITOR,
            1,
            "CVX-PRISMA",
            [
                {token: TOKEN_ADDR_CVX, processorFees: 1_000, podFees: 2_000},
                {token: TOKEN_ADDR_PRISMA, processorFees: 1_000, podFees: 2_000},
            ]
        );

    const eventPrisma = (await cloneFactoryV2.queryFilter(filterCvxAssetCreated, -1, "latest"))[events.length - 1].args;

    const cvxPrismaStakingPositionService = await ethers.getContractAt("CvxAssetStakingService", eventPrisma.stakingService);
    const cvxPrismaStakerBuffer = await ethers.getContractAt("CvxAssetStakerBuffer", eventPrisma.stakerBuffer);

    await cvgControlTowerV2.connect(treasuryDao).toggleStakingContract(cvxPrismaStakingPositionService);

    await cvxPrismaStakingPositionService.connect(treasuryDao).setBuffer(cvxPrismaStakerBuffer);

    /// cvxFxn

    await cloneFactoryV2
        .connect(treasuryDao)
        .createCvxAssetStakingAndBuffer(TOKEN_ADDR_FXN, TOKEN_ADDR_CVX_FXN, CVX_FXN_WRAPPER, CRV_DUO_cvxFXN_FXN, CVX_FXN_DEPOSITOR, 1, "CVX-FXN", [
            {token: TOKEN_ADDR_CVX, processorFees: 1_000, podFees: 2_000},
            {token: TOKEN_ADDR_FXN, processorFees: 1_000, podFees: 2_000},
        ]);

    const eventFxn = (await cloneFactoryV2.queryFilter(filterCvxAssetCreated, -1, "latest"))[events.length - 1].args;

    const cvxFxnStakingPositionService = await ethers.getContractAt("CvxAssetStakingService", eventFxn.stakingService);
    const cvxFxnStakerBuffer = await ethers.getContractAt("CvxAssetStakerBuffer", eventFxn.stakerBuffer);

    await cvgControlTowerV2.connect(treasuryDao).toggleStakingContract(cvxFxnStakingPositionService);

    await cvxFxnStakingPositionService.connect(treasuryDao).setBuffer(cvxFxnStakerBuffer);

    /// cvxFpis

    await cloneFactoryV2
        .connect(treasuryDao)
        .createCvxAssetStakingAndBuffer(TOKEN_ADDR_FPIS, TOKEN_ADDR_CVX_FPIS, CVX_FPIS_WRAPPER, CRV_DUO_cvxFPIS_FPIS, CVX_FPIS_DEPOSITOR, 1, "CVX-FPIS", [
            {token: TOKEN_ADDR_CVX, processorFees: 1_000, podFees: 2_000},
            {token: TOKEN_ADDR_FPIS, processorFees: 1_000, podFees: 2_000},
        ]);

    const eventFpis = (await cloneFactoryV2.queryFilter(filterCvxAssetCreated, -1, "latest"))[events.length - 1].args;

    const cvxFpisStakingPositionService = await ethers.getContractAt("CvxAssetStakingService", eventFpis.stakingService);
    const cvxFpisStakerBuffer = await ethers.getContractAt("CvxAssetStakerBuffer", eventFpis.stakerBuffer);

    await cvgControlTowerV2.connect(treasuryDao).toggleStakingContract(cvxFpisStakingPositionService);

    await cvxFpisStakingPositionService.connect(treasuryDao).setBuffer(cvxFpisStakerBuffer);

    /// CVGFRAXLP

    //cvgFraxLpLocker (eUSD/FRAXBP) TODO: Do we need to use clone pattern for LP ???
    const curveLpContract = contractsUserMainnet.curveLps!.eusdfraxbp;
    const pid = 44;
    const name = "Convergence eUSD/FRAXBP Locker";
    const symbol = "CvgeUSDFRAXBP";
    const coins = [TOKEN_ADDR_eUSD, CRV_DUO_FRAXBP]; //eUSD/FRAXPB(token)
    const coinsUnderlying = [TOKEN_ADDR_FRAX, TOKEN_ADDR_USDC];
    const curveLpUnderlying = CRV_DUO_FRAXBP_POOL; //FRAXBP(pool)
    const cvgeUSDFRAXBPLocker = await deployProxy<CvgFraxLpLocker>(
        "uint256,address,string,string,address[2],address[2],address,address",
        [pid, await curveLpContract.getAddress(), name, symbol, coins, coinsUnderlying, curveLpUnderlying, await cvxRewardDistributor.getAddress()],
        "CvgFraxLpLocker",
        proxyAdmin
    );
    //cvgFraxLpVault(eUSD/FRAXBP)
    const eUSDFRAXBPVault = await ethers.getContractAt("IConvexVault", await cvgeUSDFRAXBPLocker.cvgConvexVault());
    //cvgFraxLpStaking (eUSD/FRAXBP)
    const cvgeUSDFRAXBPStaking = await deployProxy<CvgFraxLpStakingService>(
        "address,string",
        [await cvgeUSDFRAXBPLocker.getAddress(), "STK-eUSD/FRAXBP"],
        "CvgFraxLpStakingService",
        proxyAdmin
    );

    // Add gauges to GaugeController
    await contractsUserMainnet.locking.gaugeController
        .connect(treasuryDao)
        .toggle_votes_pause([
            cvgCvxStakingPositionService,
            cvxCrvStakingPositionService,
            cvxFxsStakingPositionService,
            cvxPrismaStakingPositionService,
            cvxFxnStakingPositionService,
            cvxFpisStakingPositionService,
        ]);

    await contractsUserMainnet.locking.gaugeController.connect(treasuryDao).add_gauges([
        {addr: cvgCvxStakingPositionService, gauge_type: 0, weight: 0},
        {addr: cvxCrvStakingPositionService, gauge_type: 0, weight: 0},
        {addr: cvxFxsStakingPositionService, gauge_type: 0, weight: 0},
        {addr: cvxPrismaStakingPositionService, gauge_type: 0, weight: 0},
        {addr: cvxFxnStakingPositionService, gauge_type: 0, weight: 0},
        {addr: cvxFpisStakingPositionService, gauge_type: 0, weight: 0},
    ]);

    await cvgControlTowerV2.connect(treasuryDao).toggleStakingContract(cvgeUSDFRAXBPStaking);

    //stake in wrapper with user1
    const user1 = contractsUserMainnet.users.user1;
    const cvxFpis = contractsUserMainnet.convexAssets!["cvxFpis"];
    const cvxFxs = contractsUserMainnet.convexAssets!["cvxFxs"];
    const cvxCrv = contractsUserMainnet.convexAssets!["cvxCrv"];
    const cvxFxn = contractsUserMainnet.convexAssets!["cvxFxn"];
    const cvxPrisma = contractsUserMainnet.convexAssets!["cvxPrisma"];
    const cvxFpisWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FPIS_WRAPPER);
    const cvxFxsWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FXS_WRAPPER);
    const cvxCrvWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_CRV_WRAPPER);
    const cvxFxnWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_FXN_WRAPPER);
    const cvxPrismaWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_PRISMA_WRAPPER);

    await cvxFpis.connect(user1).approve(cvxFpisWrapper, ethers.MaxUint256);
    await cvxFpisWrapper.connect(user1)["stake(uint256)"](ethers.parseEther("10000000"));

    await cvxFxs.connect(user1).approve(cvxFxsWrapper, ethers.MaxUint256);
    await cvxFxsWrapper.connect(user1)["stake(uint256)"](ethers.parseEther("10000000"));

    await cvxCrv.connect(user1).approve(cvxCrvWrapper, ethers.MaxUint256);
    await cvxCrvWrapper.connect(user1)["stake(uint256,address)"](ethers.parseEther("10000000"), user1);

    await cvxFxn.connect(user1).approve(cvxFxnWrapper, ethers.MaxUint256);
    await cvxFxnWrapper.connect(user1)["stake(uint256)"](ethers.parseEther("10000000"));

    await cvxPrisma.connect(user1).approve(cvxPrismaWrapper, ethers.MaxUint256);
    await cvxPrismaWrapper.connect(user1)["stake(uint256)"](ethers.parseEther("10000000"));

    return {
        contractsUserMainnet,
        convex: {
            cvxConvergenceLocker,
            cvxStakingPositionManager,
            cvxRewardDistributor,

            CVX1,

            // cvgCvx
            cvgCvxStakingPositionService,
            cvxLocker,
            cvgCvxCvx1PoolContract,
            // cvxCrv
            cvxCrvStakingPositionService,
            cvxCrvStakerBuffer,
            // cvxFxs
            cvxFxsStakingPositionService,
            cvxFxsStakerBuffer,
            // cvxPrisma
            cvxPrismaStakingPositionService,
            cvxPrismaStakerBuffer,
            // cvxFxn
            cvxFxnStakingPositionService,
            cvxFxnStakerBuffer,
            // cvxFpis
            cvxFpisStakingPositionService,
            cvxFpisStakerBuffer,

            // LP
            cvgFraxLpLocker: {
                cvgeUSDFRAXBPLocker,
            },
            cvgFraxLpStaking: {
                cvgeUSDFRAXBPStaking,
            },
            convexVault: {
                eUSDFRAXBPVault,
            },
        },
    };
}
