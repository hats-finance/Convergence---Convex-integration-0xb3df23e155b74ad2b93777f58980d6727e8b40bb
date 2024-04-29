import {deployControlTowerContract} from "./00_deployControlTower";
import {deployCvgTokenContract} from "./01_deployCvgToken";
import {deployOracleContract} from "./02_deployOracle";
import {deployBondCalculatorContract} from "./03_deployBondCalculator";
import {deployCloneFactoryContract} from "./04_deployCloneFactory";

import {deployBondDepositoryContract} from "./deployBondDepositoryContract";
import {deployVeCVGContract} from "./07_deployVeCVG";
import {deployGaugeControllerContract} from "./08_deployGaugeController";
import {deployCvgRewardsContract} from "./13_deployCvgRewards";
import {deployYsDistributor} from "./13_deployYsDistributor";

import {deployCvgSdtTokenContract} from "./XX_deployCvgSdtTokenContract";
import {deployCvgAirdrop} from "./XX_deployCvgAirdrop";
import {deployVeSDTAirdrop} from "./XX_deployVeSDTAirdrop";
import {deployQuestAirdrop} from "./XX_deployQuestAirdrop";
import {deployProxyAdmin} from "./XX_deployProxyAdmin";
import {setStorageBalanceAssets} from "./XX_setStorageBalanceAssets";

import {deployCvgSdtBuffer} from "./XX_deployCvgSdtBuffer";
import {deployBaseSdtStaking} from "./XX_deployBaseSdtStaking";
import {deployUpgradeableBeacon} from "./XX_deployUpgradeableBeacon";
import {deployCvgSdtStakingContract} from "./XX_deployCvgSdtStaking";

import {deployPresaleSeed} from "./XX_deployPresaleSeed";
import {deployPresaleWl} from "./XX_deployPresaleWl";
import {deployVestingContract} from "./XX_deployVestingCvg";

import {deployLiquidityCvgSdt} from "./XX_deployLiquidityCvgSdt";
import {deployLockingLogo} from "./XX_deployLockingLogo";

import {deployLockingPositionManagerContract} from "./06_deployLockingPositionManager";
import {deployMockFeeDistributor} from "./XX_deployMockFeeDistributor";
import {deployBondPositionManagerContract} from "./XX_deployBondPositionManager";
import {deployBondLogo} from "./XX_deployBondLogo";
import {deployIbo} from "./XX_deployIbo";
import {linkFeeDistributorAndVeSdt} from "./XX_linkFeeDistributorAndVeSdt";
import {deployCloneSdtStaking} from "./XX_deployCloneSdtStaking";
import {deployMockPositionLocker} from "./XX_deployMockPositionLocker";
import {deploySdtStakingPositionManager} from "./XX_deploySdtStakingPositionManager";
import {deploySdtStakingViewer} from "./XX_deploySdtStakingViewer";

import {fetchStakeDaoTokens} from "./fetchStakeDaoTokens";
import {deployInternalDaoContract} from "./XX_deployInternalDao";
import {deployProtoDaoContract} from "./XX_deployProtoDao";
import {deploySdtBlackHole} from "./XX_deploySdtBlackHole";

import {deploySdtFeeCollector} from "./XX_deploySdtFeeCollector";
import {deploySdtUtilities} from "./deploySdtUtilities";
import {deploySdtStakingLogo} from "./XX_deploySdtStakingLogo";
import {deploySdtRewardDistributor} from "./deploySdtRewardDistributor";

export default {
    deployControlTowerContract,
    deployCvgTokenContract,
    deployOracleContract,
    deployBondCalculatorContract,
    deployCloneFactoryContract,
    deployBondDepositoryContract,
    deployVeCVGContract,
    deployGaugeControllerContract,
    deployCvgRewardsContract,
    deployYsDistributor,
    deployCvgSdtTokenContract,
    deployCvgAirdrop,
    deployVeSDTAirdrop,
    deployQuestAirdrop,
    deployProxyAdmin,
    setStorageBalanceAssets,
    deployBaseSdtStaking,
    deployCvgSdtBuffer,
    deployCvgSdtStakingContract,
    deployPresaleSeed,
    deployPresaleWl,
    deployVestingContract,
    deployLiquidityCvgSdt,
    deployLockingLogo,
    deployLockingPositionManagerContract,
    deployBondPositionManagerContract,
    deployBondLogo,
    deployIbo,
    linkFeeDistributorAndVeSdt,
    deployCloneSdtStaking,
    deployMockPositionLocker,
    fetchStakeDaoTokens,
    deployProtoDaoContract,
    deployInternalDaoContract,
    deploySdtBlackHole,
    deployUpgradeableBeacon,
    deploySdtFeeCollector,
    deploySdtUtilities,
    deploySdtStakingPositionManager,
    deploySdtStakingViewer,
    deploySdtStakingLogo,
    deployMockFeeDistributor,
    deploySdtRewardDistributor,
};
