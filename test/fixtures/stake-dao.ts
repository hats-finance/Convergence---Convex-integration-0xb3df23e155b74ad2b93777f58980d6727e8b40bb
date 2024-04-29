import {configureAccounts, deployBase} from "./testContext";
import deployers from "../../scripts/deployer/unit/_index";
import {FakeLiquidityDeployer} from "../../utils/FakeLiquidityDeployer";
import {IContractsUser, IContractsUserMainnet} from "../../utils/contractInterface";
import {bedTestSdtStaking} from "../Beds/bedTest-sdt-staking";
import {
    goOnNextWeek,
    verifySumVotesGaugeControllerEqualsTotalVotes,
    verifyTotalAmountDistributedInCvg,
    verifyVeSumBalancesEqualsTotalSupply,
    verifyYsSumBalancesEqualsTotalSupply,
    verifyYsSumBalancesEqualsTotalSupplyHistory,
} from "../../utils/locking/invariants.checks";
import {ethers} from "hardhat";
import {IBO, PRESALE_SEED, PRESALE_WL} from "../../resources/cvg-mainnet";
import {getAddress, getContract, getStaking} from "../../scripts/deployer/complete/helper";
import {
    BOND_CALCULATOR_CONTRACT,
    BOND_DEPOSITORY_CONTRACT,
    BOND_POSITION_MANAGER,
    CLONE_FACTORY_CONTRACT,
    CONTROL_TOWER_CONTRACT,
    CVGSDT_CONTRACT,
    CVGSDT_STAKING_CONTRACT,
    CVG_CONTRACT,
    CVG_REWARDS_CONTRACT,
    GAUGE_CONTROLLER_CONTRACT,
    LOCKING_POSITION_MANAGER_CONTRACT,
    LOCKING_POSITION_SERVICE_CONTRACT,
    ORACLE_CONTRACT,
    PROXY_ADMIN,
    SDT_STAKING_POSITION_MANAGER_CONTRACT,
    SDT_UTILITIES_CONTRACT,
    VECVG_CONTRACT,
    VESTING_CONTRACT,
} from "../../resources/contracts";
import {TOKEN_ADDR_CRV, TOKEN_ADDR_FRAX, TOKEN_ADDR_SDT} from "../../resources/tokens/common";
import {getGlobalAssets} from "../../scripts/deployer/unit/XX_setStorageBalanceAssets";
import {CvgOracle} from "../../typechain-types";

export async function fetchMainnetContracts() {
    let users = await configureAccounts();

    const globalAssets = await getGlobalAssets(users);

    const presaleWl = await ethers.getContractAt("WlPresaleCvg", PRESALE_WL);
    const presaleIbo = await ethers.getContractAt("Ibo", IBO);
    const presaleSeed = await ethers.getContractAt("SeedPresaleCvg", PRESALE_SEED);
    const vesting = await ethers.getContractAt("VestingCvg", await getContract(VESTING_CONTRACT));
    const proxyAdmin = await ethers.getContractAt("ProxyAdmin", await getContract(PROXY_ADMIN));

    const cvg = await ethers.getContractAt("Cvg", await getContract(CVG_CONTRACT));
    const cvgSDT = await ethers.getContractAt("CvgSDT", await getContract(CVGSDT_CONTRACT));
    const cvgControlTower = await ethers.getContractAt("CvgControlTowerV2", await getContract(CONTROL_TOWER_CONTRACT));
    const cloneFactory = await ethers.getContractAt("CloneFactoryV2", await getContract(CLONE_FACTORY_CONTRACT));

    const lockingPositionService = await ethers.getContractAt("LockingPositionService", await getContract(LOCKING_POSITION_SERVICE_CONTRACT));
    const lockingPositionManager = await ethers.getContractAt("LockingPositionManager", await getContract(LOCKING_POSITION_MANAGER_CONTRACT));
    const bondPositionManager = await ethers.getContractAt("BondPositionManager", await getContract(BOND_POSITION_MANAGER));
    const sdtStakingPositionManager = await ethers.getContractAt("SdtStakingPositionManager", await getContract(SDT_STAKING_POSITION_MANAGER_CONTRACT));

    const bondDepository = await ethers.getContractAt("BondDepository", await getContract(BOND_DEPOSITORY_CONTRACT));
    const bondCalculator = await ethers.getContractAt("BondCalculator", await getContract(BOND_CALCULATOR_CONTRACT));

    const cvgSdtStaking = await ethers.getContractAt("SdtStakingPositionService", await getAddress(CVGSDT_STAKING_CONTRACT));
    const sdCRVStaking = await ethers.getContractAt("SdtStakingPositionService", await getStaking("sdCRVGAUGEContractStaking"));
    const sdANGLEStaking = await ethers.getContractAt("SdtStakingPositionService", await getStaking("sdANGLEGAUGEContractStaking"));

    const veCvg = await ethers.getContractAt("veCVG", await getContract(VECVG_CONTRACT));
    const cvgRewards = await ethers.getContractAt("CvgRewardsV2", await getContract(CVG_REWARDS_CONTRACT));
    const gaugeController = await ethers.getContractAt("GaugeController", await getContract(GAUGE_CONTROLLER_CONTRACT));
    const sdtUtilities = await ethers.getContractAt("SdtUtilities", await getContract(SDT_UTILITIES_CONTRACT));
    const cvgOracle = await ethers.getContractAt("CvgOracleUpgradeable", await getContract("CvgOracleUpgradeable"));

    const crv = await ethers.getContractAt("ERC20", TOKEN_ADDR_CRV);
    const frax = await ethers.getContractAt("ERC20", TOKEN_ADDR_FRAX);
    const sdt = await ethers.getContractAt("ERC20", TOKEN_ADDR_SDT);

    return {
        users,
        globalAssets,
        base: {cvgControlTower, proxyAdmin, cloneFactory},
        locking: {lockingPositionService, lockingPositionManager, veCvg, gaugeController},
        rewards: {cvgRewards},
        presales: {presaleWl, presaleIbo, presaleSeed, vesting},
        cvg,
        cvgSDT,
        crv,
        frax,
        sdt,
        bondPositionManager,
        bondDepository,
        cvgSdtStaking,
        sdtUtilities,
        sdtStakingPositionManager,
        cvgOracle,
        bondCalculator,
        sdAssetsStaking: {sdCRVStaking, sdANGLEStaking},
    };
}

export async function deployBondCalculatorFixture() {
    let contractsUsers = await deployBase(false);
    contractsUsers = await deployers.deployBondCalculatorContract(contractsUsers, false);
    return contractsUsers;
}
export async function deployBondFixture() {
    await goOnNextWeek();
    let contractsUsers = await deployBase(false);
    const cvgControlTower = contractsUsers.contracts.base.cvgControlTower;
    await (await cvgControlTower.connect(contractsUsers.users.treasuryDao).setSdt(contractsUsers.contracts.tokens.sdt)).wait();
    contractsUsers = await deployers.deployCvgSdtTokenContract(contractsUsers);
    contractsUsers = await deployers.deployLiquidityCvgSdt(contractsUsers, false);
    contractsUsers = await FakeLiquidityDeployer.deployCvgFraxBpLiquidity(contractsUsers);
    contractsUsers = await deployers.deployBondPositionManagerContract(contractsUsers);
    contractsUsers = await deployers.deployOracleContract(contractsUsers, false);
    contractsUsers = await deployers.deployBondCalculatorContract(contractsUsers, false);
    contractsUsers = await deployers.deployVeCVGContract(contractsUsers);
    contractsUsers = await deployers.deployGaugeControllerContract(contractsUsers);
    contractsUsers = await deployers.deployCvgRewardsContract(contractsUsers);
    contractsUsers = await deployers.deployLockingPositionManagerContract(contractsUsers);
    contractsUsers = await deployers.deployBondDepositoryContract(contractsUsers);
    contractsUsers = await deployers.deployBondLogo(contractsUsers);
    contractsUsers = await deployers.deployYsDistributor(contractsUsers);

    contractsUsers = await deployers.deployMockPositionLocker(contractsUsers);
    return contractsUsers;
}

export async function deployRewardsFixture() {
    await goOnNextWeek();
    let contractsUsers = await deployBase(false);
    const cvgControlTower = contractsUsers.contracts.base.cvgControlTower;
    await (await cvgControlTower.connect(contractsUsers.users.treasuryDao).setSdt(contractsUsers.contracts.tokens.sdt)).wait();
    contractsUsers = await deployers.deployCvgSdtTokenContract(contractsUsers);
    contractsUsers = await deployers.deployLiquidityCvgSdt(contractsUsers, false);
    contractsUsers = await deployers.deployVeCVGContract(contractsUsers);
    contractsUsers = await deployers.deployGaugeControllerContract(contractsUsers);
    contractsUsers = await deployers.deployCvgRewardsContract(contractsUsers);
    contractsUsers = await deployers.deployLockingPositionManagerContract(contractsUsers);

    return contractsUsers;
}

export async function deployYsDistributorFixture() {
    await goOnNextWeek();
    let contractsUsers = await deployBase(false);
    contractsUsers = await deployers.fetchStakeDaoTokens(contractsUsers);

    const cvgControlTower = contractsUsers.contracts.base.cvgControlTower;
    await (await cvgControlTower.connect(contractsUsers.users.treasuryDao).setSdt(contractsUsers.contracts.tokens.sdt)).wait();
    contractsUsers = await deployers.deployCvgSdtTokenContract(contractsUsers);
    contractsUsers = await deployers.deployLiquidityCvgSdt(contractsUsers, false);

    contractsUsers = await deployers.deployVeCVGContract(contractsUsers);
    contractsUsers = await deployers.deployGaugeControllerContract(contractsUsers);
    contractsUsers = await deployers.deployCvgRewardsContract(contractsUsers);
    contractsUsers = await deployers.deployLockingPositionManagerContract(contractsUsers);

    contractsUsers = await deployers.deployYsDistributor(contractsUsers);
    contractsUsers = await deployers.deployLockingLogo(contractsUsers);
    contractsUsers = await deployers.deployMockPositionLocker(contractsUsers);
    contractsUsers = await FakeLiquidityDeployer.deployCvgFraxBpLiquidity(contractsUsers);
    contractsUsers = await deployers.deployOracleContract(contractsUsers, false);
    contractsUsers = await deployers.deployCvgAirdrop(contractsUsers);
    contractsUsers = await deployers.deployVeSDTAirdrop(contractsUsers);
    contractsUsers = await deployers.deployQuestAirdrop(contractsUsers);
    return contractsUsers;
}

export async function deployPresaleVestingFixture() {
    let contractsUsers = await deployBase(true);

    contractsUsers = await deployers.deployVeCVGContract(contractsUsers);
    contractsUsers = await deployers.deployGaugeControllerContract(contractsUsers);
    contractsUsers = await deployers.deployCvgRewardsContract(contractsUsers);
    contractsUsers = await deployers.deployLockingPositionManagerContract(contractsUsers);
    return contractsUsers;
}

export async function deployOracleFixture() {
    await goOnNextWeek();
    let contractsUsers = await deployBase(false);
    contractsUsers = await FakeLiquidityDeployer.deployCvgFraxBpLiquidity(contractsUsers);
    contractsUsers = await deployers.deployOracleContract(contractsUsers, false);

    return contractsUsers;
}

export async function deploySdtStakingFixture() {
    await goOnNextWeek();
    let contractsUsers = await deployBase(false);
    const cvgControlTower = contractsUsers.contracts.base.cvgControlTower;
    await (await cvgControlTower.connect(contractsUsers.users.treasuryDao).setSdt(contractsUsers.contracts.tokens.sdt)).wait();
    contractsUsers = await deployers.fetchStakeDaoTokens(contractsUsers);
    contractsUsers = await deployers.deployVeCVGContract(contractsUsers);
    contractsUsers = await deployers.deployGaugeControllerContract(contractsUsers);
    contractsUsers = await deployers.deployCvgRewardsContract(contractsUsers);
    contractsUsers = await deployers.deployLockingPositionManagerContract(contractsUsers);
    contractsUsers = await deployers.deployYsDistributor(contractsUsers);
    contractsUsers = await deployers.deployLockingLogo(contractsUsers);
    contractsUsers = await FakeLiquidityDeployer.deployCvgFraxBpLiquidity(contractsUsers);
    contractsUsers = await deployers.deployOracleContract(contractsUsers, false);
    contractsUsers = await deployers.deployCvgSdtTokenContract(contractsUsers);
    contractsUsers = await deployers.linkFeeDistributorAndVeSdt(contractsUsers);
    contractsUsers = await deployers.deployCvgSdtBuffer(contractsUsers);
    contractsUsers = await deployers.deploySdtFeeCollector(contractsUsers);
    contractsUsers = await deployers.deploySdtBlackHole(contractsUsers);
    contractsUsers = await deployers.deploySdtStakingPositionManager(contractsUsers);
    contractsUsers = await deployers.deployLiquidityCvgSdt(contractsUsers, true);

    contractsUsers = await deployers.deploySdtRewardDistributor(contractsUsers);

    contractsUsers = await deployers.deploySdtStakingViewer(contractsUsers);
    contractsUsers = await deployers.deployBaseSdtStaking(contractsUsers);
    contractsUsers = await deployers.deployUpgradeableBeacon(contractsUsers);
    contractsUsers = await deployers.deployCvgSdtStakingContract(contractsUsers);
    contractsUsers = await deployers.deployCloneSdtStaking(contractsUsers);
    contractsUsers = await deployers.deploySdtUtilities(contractsUsers);
    contractsUsers = await deployers.deploySdtStakingLogo(contractsUsers);

    contractsUsers = await deployers.deploySdtUtilities(contractsUsers);

    contractsUsers = await bedTestSdtStaking(contractsUsers);

    return contractsUsers;
}
export async function deployDaoFixture() {
    let contractsUsers = await deployBase(false);
    contractsUsers = await deployers.deployProtoDaoContract(contractsUsers);
    contractsUsers = await deployers.deployInternalDaoContract(contractsUsers);

    return contractsUsers;
}

export async function increaseCvgCycleMainnet(contractsUsers: IContractsUserMainnet, cycleAmount: number) {
    const cvgRewards = contractsUsers.rewards.cvgRewards;
    const treasuryDao = contractsUsers.users.treasuryDao;
    for (let i = 0; i < cycleAmount; i++) {
        const actualCycle = await contractsUsers.base.cvgControlTower.cvgCycle();
        await goOnNextWeek();
        await contractsUsers.locking.veCvg.checkpoint();

        await (await cvgRewards.connect(treasuryDao).writeStakingRewards(3)).wait();

        // Verify Invariants of the project
        await verifySumVotesGaugeControllerEqualsTotalVotes(contractsUsers.locking.gaugeController);
        await verifyVeSumBalancesEqualsTotalSupply(contractsUsers.locking.veCvg, contractsUsers.locking.lockingPositionManager);
        await verifyYsSumBalancesEqualsTotalSupply(
            contractsUsers.locking.lockingPositionService,
            contractsUsers.locking.lockingPositionManager,
            Number(actualCycle),
            Number(actualCycle)
        );
        await verifyYsSumBalancesEqualsTotalSupplyHistory(
            contractsUsers.locking.lockingPositionService,
            contractsUsers.locking.lockingPositionManager,
            Number(actualCycle),
            Number(actualCycle)
        );
        await verifyTotalAmountDistributedInCvg(contractsUsers.base.cvgControlTower, contractsUsers.rewards.cvgRewards, contractsUsers.locking.gaugeController);
    }
}

export async function increaseCvgCycleNoCheck(contractsUsers: IContractsUserMainnet, cycleAmount: number) {
    const cvgRewards = contractsUsers.rewards.cvgRewards;
    const treasuryDao = contractsUsers.users.treasuryDao;
    for (let i = 0; i < cycleAmount; i++) {
        const actualCycle = await contractsUsers.base.cvgControlTower.cvgCycle();
        await goOnNextWeek();
        await contractsUsers.locking.veCvg.checkpoint();

        await (await cvgRewards.connect(treasuryDao).writeStakingRewards(3)).wait();
    }
}

export async function increaseCvgCycle(contractsUsers: IContractsUser | IContractsUserMainnet, cycleAmount: number) {
    const users = contractsUsers.users;
    const contracts = "contracts" in contractsUsers ? contractsUsers.contracts : contractsUsers;

    const cvgRewards = contracts.rewards.cvgRewards;
    const treasuryDao = users.treasuryDao;
    for (let i = 0; i < cycleAmount; i++) {
        const actualCycle = await contracts.base.cvgControlTower.cvgCycle();
        await goOnNextWeek();
        await contracts.locking.veCvg.checkpoint();
        await (await cvgRewards.connect(treasuryDao).writeStakingRewards(3)).wait();

        // Verify Invariants of the project
        await verifySumVotesGaugeControllerEqualsTotalVotes(contracts.locking.gaugeController);

        await verifyVeSumBalancesEqualsTotalSupply(contracts.locking.veCvg, contracts.locking.lockingPositionManager);

        await verifyYsSumBalancesEqualsTotalSupply(
            contracts.locking.lockingPositionService,
            contracts.locking.lockingPositionManager,
            Number(actualCycle),
            Number(actualCycle)
        );

        await verifyYsSumBalancesEqualsTotalSupplyHistory(
            contracts.locking.lockingPositionService,
            contracts.locking.lockingPositionManager,
            Number(actualCycle),
            Number(actualCycle)
        );
        await verifyTotalAmountDistributedInCvg(contracts.base.cvgControlTower, contracts.rewards.cvgRewards, contracts.locking.gaugeController);
    }
}

export async function increaseCvgCycleWithoutTime({contracts, users}: IContractsUser, cycleAmount: number) {
    const cvgRewards = contracts.rewards.cvgRewards;
    const treasuryDao = users.treasuryDao;
    for (let i = 0; i < cycleAmount; i++) {
        const actualCycle = await contracts.base.cvgControlTower.cvgCycle();
        await contracts.locking.veCvg.checkpoint();

        await (await cvgRewards.connect(treasuryDao).writeStakingRewards(3)).wait();

        // Verify Invariants of the project
        await verifySumVotesGaugeControllerEqualsTotalVotes(contracts.locking.gaugeController);
        await verifyVeSumBalancesEqualsTotalSupply(contracts.locking.veCvg, contracts.locking.lockingPositionManager);
        await verifyYsSumBalancesEqualsTotalSupply(
            contracts.locking.lockingPositionService,
            contracts.locking.lockingPositionManager,
            Number(actualCycle),
            Number(actualCycle)
        );
        await verifyYsSumBalancesEqualsTotalSupplyHistory(
            contracts.locking.lockingPositionService,
            contracts.locking.lockingPositionManager,
            Number(actualCycle),
            Number(actualCycle)
        );
        await verifyTotalAmountDistributedInCvg(contracts.base.cvgControlTower, contracts.rewards.cvgRewards, contracts.locking.gaugeController);
    }
}
