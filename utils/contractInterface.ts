import * as Contracts from "../typechain-types";
import {GaugeController} from "../typechain-types-vyper";

import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";
import {VeCVG} from "../typechain-types-vyper/VeCVG";

export interface IContracts {
    base: {
        cvgControlTower: Contracts.CvgControlTower;
        cloneFactory: Contracts.CloneFactory;
        proxyAdmin: Contracts.ProxyAdmin;
    };
    locking: {
        lockingPositionService: Contracts.LockingPositionService;
        lockingPositionManager: Contracts.LockingPositionManager;
        lockingPositionDelegate: Contracts.LockingPositionDelegate;
        lockingLogo: Contracts.LockingLogo;
        veCvg: VeCVG;
        gaugeController: GaugeController;
    };

    stakeDao: {
        baseSdAssetStaking: Contracts.SdtStakingPositionService;
        sdtBlackHole: Contracts.SdtBlackHole;
        baseSdtBuffer: Contracts.SdtBuffer;
        cvgSdtBuffer: Contracts.CvgSdtBuffer;
        sdtStakingViewer: Contracts.SdtStakingViewer;
        sdtStakingPositionManager: Contracts.SdtStakingPositionManager;
        cvgSdtStaking: Contracts.SdtStakingPositionService;
        feeDistributor: Contracts.IFeeDistributor;
        veSdt: Contracts.IVeSDT;
        multiMerkleStash: Contracts.IMultiMerkleStash;
        sdtFeeCollector: Contracts.SdtFeeCollector;
        sdtUtilities: Contracts.SdtUtilities;
        sdtStakingLogo: Contracts.SdtStakingLogo;
        sdtRewardDistributor: Contracts.SdtRewardDistributor;
        sdAssetsStaking: {
            sdCRVStaking: Contracts.SdtStakingPositionService;
            sdANGLEStaking: Contracts.SdtStakingPositionService;
            sdFXSStaking: Contracts.SdtStakingPositionService;
            sdBALStaking: Contracts.SdtStakingPositionService;
            sdPENDLEStaking: Contracts.SdtStakingPositionService;
            sdFXNStaking: Contracts.SdtStakingPositionService;
            sdYFIStaking: Contracts.SdtStakingPositionService;
            sdAPWStaking: Contracts.SdtStakingPositionService;
            triUSDCStaking: Contracts.SdtStakingPositionService;
            triUSDTStaking: Contracts.SdtStakingPositionService;
            triUSDT2Staking: Contracts.SdtStakingPositionService;
            triLLAMAStaking: Contracts.SdtStakingPositionService;
            triCRVStaking: Contracts.SdtStakingPositionService;
            triSDTStaking: Contracts.SdtStakingPositionService;
            ETHpWETHStaking: Contracts.SdtStakingPositionService;
            crvUSDUSDTStaking: Contracts.SdtStakingPositionService;
            STGUSDCStaking: Contracts.SdtStakingPositionService;
            sdCRVCRVStaking: Contracts.SdtStakingPositionService;
            USDCcrvUSDStaking: Contracts.SdtStakingPositionService;
            frxETHETHStaking: Contracts.SdtStakingPositionService;
            agEUREUROCStaking: Contracts.SdtStakingPositionService;
            MIM3CRVStaking: Contracts.SdtStakingPositionService;
            dETHfrxETHStaking: Contracts.SdtStakingPositionService;
            cvxCRVCRVStaking: Contracts.SdtStakingPositionService;
            sdFXSFXSStaking: Contracts.SdtStakingPositionService;
            FRAXBPStaking: Contracts.SdtStakingPositionService;
            alUSDFRAXBPStaking: Contracts.SdtStakingPositionService;
            ETHrETHStaking: Contracts.SdtStakingPositionService;
            XAIcrvUSDStaking: Contracts.SdtStakingPositionService;
            COILFRAXBPStaking: Contracts.SdtStakingPositionService;
            sUSDcrvUSDStaking: Contracts.SdtStakingPositionService;
            DOLAcrvUSDStaking: Contracts.SdtStakingPositionService;
            mkUSDFRAXBPStaking: Contracts.SdtStakingPositionService;
            CNCETHStaking: Contracts.SdtStakingPositionService;
            XAIFRAXBPStaking: Contracts.SdtStakingPositionService;
            stETHETHStaking: Contracts.SdtStakingPositionService;
        };
        sdAssetsBuffer: {
            sdCRVBuffer: Contracts.SdtBuffer;
            sdANGLEBuffer: Contracts.SdtBuffer;
            sdFXSBuffer: Contracts.SdtBuffer;
            sdBALBuffer: Contracts.SdtBuffer;
            sdPENDLEBuffer: Contracts.SdtBuffer;
            sdFXNBuffer: Contracts.SdtBuffer;
            triUSDCBuffer: Contracts.SdtBuffer;
            triUSDTBuffer: Contracts.SdtBuffer;
            triUSDT2Buffer: Contracts.SdtBuffer;
            triLLAMABuffer: Contracts.SdtBuffer;
            triCRVBuffer: Contracts.SdtBuffer;
            triSDTBuffer: Contracts.SdtBuffer;
            ETHpWETHBuffer: Contracts.SdtStakingPositionService;
            crvUSDUSDTBuffer: Contracts.SdtBuffer;
            STGUSDCBuffer: Contracts.SdtBuffer;
            sdCRVCRVBuffer: Contracts.SdtBuffer;
            USDCcrvUSDBuffer: Contracts.SdtBuffer;
            frxETHETHBuffer: Contracts.SdtBuffer;
            agEUREUROCBuffer: Contracts.SdtBuffer;
            MIM3CRVBuffer: Contracts.SdtBuffer;
            dETHfrxETHBuffer: Contracts.SdtBuffer;
            cvxCRVCRVBuffer: Contracts.SdtBuffer;
            sdFXSFXSBuffer: Contracts.SdtBuffer;
            FRAXBPBuffer: Contracts.SdtBuffer;
            alUSDFRAXBPBuffer: Contracts.SdtBuffer;
            ETHrETHBuffer: Contracts.SdtBuffer;
            XAIcrvUSDBuffer: Contracts.SdtBuffer;
            COILFRAXBPBuffer: Contracts.SdtBuffer;
            sUSDcrvUSDBuffer: Contracts.SdtBuffer;
            DOLAcrvUSDBuffer: Contracts.SdtBuffer;
            mkUSDFRAXBPBuffer: Contracts.SdtBuffer;
            CNCETHBuffer: Contracts.SdtBuffer;
            XAIFRAXBPBuffer: Contracts.SdtBuffer;
            stETHETHBuffer: Contracts.SdtBuffer;
        };
        upgradeableSdStakingBeacon: Contracts.UpgradeableBeacon;
        upgradeableBufferBeacon: Contracts.UpgradeableBeacon;
    };

    rewards: {
        cvgRewards: Contracts.CvgRewardsV2;
        cvgSdtBuffer: Contracts.CvgSdtBuffer;
        ysDistributor: Contracts.YsDistributor;
    };

    bonds: {
        bondCalculator: Contracts.BondCalculator;
        cvgOracle: Contracts.CvgOracle;
        bondPositionManager: Contracts.BondPositionManager;
        bondLogo: Contracts.BondLogo;
        bondDepository: Contracts.BondDepository;
    };

    presaleVesting: {
        ibo: Contracts.Ibo;
        sbt: Contracts.SBT;
        seedPresale: Contracts.SeedPresaleCvg;
        vestingCvg: Contracts.VestingCvg;
        wlPresaleCvg: Contracts.WlPresaleCvg;
        cvgAirdrop: Contracts.CvgAirdrop;
        veSDTAirdrop: Contracts.VeSDTAirdrop;
        questAirdrop: Contracts.QuestAirdrop;
        wl: {
            S_wlAddresses: string[];
            M_wlAddresses: string[];
            L_wlAddresses: string[];
        };
    };

    tokens: {
        cvg: Contracts.Cvg;
        cvgSdt: Contracts.CvgSDT;
        frax: Contracts.ERC20;
        dai: Contracts.ERC20;
        usdc: Contracts.ERC20;
        usdt: Contracts.ERC20;
        sdt: Contracts.ERC20;
        crv: Contracts.ERC20;
        weth: Contracts.ERC20;
        cvx: Contracts.ERC20;
        cnc: Contracts.ERC20;
        fxs: Contracts.ERC20;
        fxn: Contracts.ERC20;
        fraxBp: Contracts.ERC20;
        _3crv: Contracts.ERC20;
    };
    tokensStakeDao: {
        sdCrv: Contracts.ISdAsset;
        sdBal: Contracts.ISdAsset;
        sdPendle: Contracts.ISdAsset;
        sdAngle: Contracts.ISdAsset;
        sdFxs: Contracts.ISdAsset;
        sdFxn: Contracts.ISdAsset;
        sdYfi: Contracts.ISdAsset;
        sdApw: Contracts.ISdAsset;

        sdCrvGauge: Contracts.ISdAssetGauge;
        sdBalGauge: Contracts.ISdAssetGauge;
        sdPendleGauge: Contracts.ISdAssetGauge;
        sdAngleGauge: Contracts.ISdAssetGauge;
        sdFxsGauge: Contracts.ISdAssetGauge;
        sdFxnGauge: Contracts.ISdAssetGauge;
        sdYfiGauge: Contracts.ISdAssetGauge;
        sdApwGauge: Contracts.ISdAssetGauge;

        sdFrax3Crv: Contracts.ERC20;
        bbAUsd: Contracts.ERC20;
        bal: Contracts.ERC20;

        sanUsdEur: Contracts.ERC20;
        agEur: Contracts.ERC20;
        angle: Contracts.ERC20;
        _80bal_20weth: Contracts.ERC20;

        triLLAMA: Contracts.ERC20;
        triLLAMAGauge: Contracts.ISdAssetGauge;

        triSDT: Contracts.ERC20;
        triSDTGauge: Contracts.ISdAssetGauge;

        ETHp_WETH: Contracts.ERC20;
        ETHp_WETHGauge: Contracts.ISdAssetGauge;
    };

    lp: {
        poolCvgFraxBp: Contracts.ICrvPool;
        stablePoolCvgSdt: Contracts.ICrvPoolPlain;
    };

    mainnetDeployed: {
        cvgPepe: Contracts.CvgPepe;
        presaleWl: Contracts.WlPresaleCvg;
        presaleSeed: Contracts.SeedPresaleCvg;
        ibo: Contracts.Ibo;
    };

    tests: {
        baseTest: Contracts.BaseTest;
        positionLocker: Contracts.PositionLocker;
        mockFeeDistributor: Contracts.MockFeeDistributor;
    };

    dao: {
        protoDao: Contracts.ProtoDao;
        internalDao: Contracts.InternalDao;
    };
}

export interface IUsers {
    owner: HardhatEthersSigner;
    user1: HardhatEthersSigner;
    user2: HardhatEthersSigner;
    user3: HardhatEthersSigner;
    user4: HardhatEthersSigner;
    user5: HardhatEthersSigner;
    user6: HardhatEthersSigner;
    user7: HardhatEthersSigner;
    user8: HardhatEthersSigner;
    user9: HardhatEthersSigner;
    user10: HardhatEthersSigner;
    user11: HardhatEthersSigner;
    user12: HardhatEthersSigner;
    treasuryDao: HardhatEthersSigner;
    treasuryTeam: HardhatEthersSigner;
    treasuryPod: HardhatEthersSigner;
    treasuryPdd: HardhatEthersSigner;
    treasuryAirdrop: HardhatEthersSigner;
    veSdtMultisig: HardhatEthersSigner;
    treasuryPartners: HardhatEthersSigner;
    allUsers: HardhatEthersSigner[];
    classicWl: string[];
}
export interface ITreasury {
    treasuryDao: string;
    treasuryTeam: string;
    treasuryPod: string;
    treasuryPdd: string;
    treasuryAirdrop: string;
    veSdtMultisig: string;
}
export interface IContractsUser {
    contracts: IContracts;
    users: IUsers;
}

export interface IContractsUserMainnet {
    users: IUsers;
    presales: {
        presaleSeed: Contracts.SeedPresaleCvg;
        presaleWl: Contracts.WlPresaleCvg;
        presaleIbo: Contracts.Ibo;
        vesting: Contracts.VestingCvg;
    };
    globalAssets: {[tokenName: string]: Contracts.ERC20};
    curveLps?: {[tokenName: string]: Contracts.ICurveLp};
    convexAssets?: {[tokenName: string]: Contracts.ERC20};
    rewards: {cvgRewards: Contracts.CvgRewardsV2};
    base: {
        cvgControlTower: Contracts.CvgControlTowerV2;
        proxyAdmin: Contracts.ProxyAdmin;
        cloneFactory: Contracts.CloneFactoryV2;
    };
    locking: {
        lockingPositionService: Contracts.LockingPositionService;
        lockingPositionManager: Contracts.LockingPositionManager;
        veCvg: VeCVG;
        gaugeController: GaugeController;
    };
    cvg: Contracts.Cvg;
    cvgSDT: Contracts.CvgSDT;
    crv: Contracts.ERC20;
    frax: Contracts.ERC20;
    sdt: Contracts.ERC20;
    cvgOracle: Contracts.CvgOracle;
    bondPositionManager: Contracts.BondPositionManager;
    bondDepository: Contracts.BondDepository;
    sdtStakingPositionManager: Contracts.SdtStakingPositionManager;
    cvgSdtStaking: Contracts.SdtStakingPositionService;
    sdAssetsStaking: {
        sdCRVStaking: Contracts.SdtStakingPositionService;
        sdANGLEStaking: Contracts.SdtStakingPositionService;
    };
    sdtUtilities: Contracts.SdtUtilities;
}

export interface IContractsConvex {
    contractsUserMainnet: IContractsUserMainnet;
    convex: {
        cvxConvergenceLocker: Contracts.CvxConvergenceLocker;
        cvxStakingPositionManager: Contracts.CvxStakingPositionManager;
        cvgCvxStakingPositionService: Contracts.CvgCvxStakingPositionService;
        cvxRewardDistributor: Contracts.CvxRewardDistributor;
        cvgCvxCvx1PoolContract: Contracts.ICrvPoolPlain;
        CVX1: Contracts.CVX1;

        // cvxCRV
        cvxCrvStakingPositionService: Contracts.CvxAssetStakingService;
        cvxCrvStakerBuffer: Contracts.CvxAssetStakerBuffer;
        // cvxFXS
        cvxFxsStakingPositionService: Contracts.CvxAssetStakingService;
        cvxFxsStakerBuffer: Contracts.CvxAssetStakerBuffer;

        // cvxPRISMA
        cvxPrismaStakingPositionService: Contracts.CvxAssetStakingService;
        cvxPrismaStakerBuffer: Contracts.CvxAssetStakerBuffer;

        // cvxFXN
        cvxFxnStakingPositionService: Contracts.CvxAssetStakingService;
        cvxFxnStakerBuffer: Contracts.CvxAssetStakerBuffer;

        // cvxFPIS
        cvxFpisStakingPositionService: Contracts.CvxAssetStakingService;
        cvxFpisStakerBuffer: Contracts.CvxAssetStakerBuffer;

        // LP
        cvxLocker: Contracts.ICvxLocker;
        cvgFraxLpLocker: {[cvgFraxLpLockerName: string]: Contracts.CvgFraxLpLocker};
        cvgFraxLpStaking: {[cvgFraxLpStakingName: string]: Contracts.CvgFraxLpStakingService};
        convexVault: {[convexVaultName: string]: Contracts.IConvexVault};
    };
}
