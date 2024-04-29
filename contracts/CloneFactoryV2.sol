// SPDX-License-Identifier: MIT
/**
 _____
/  __ \
| /  \/ ___  _ ____   _____ _ __ __ _  ___ _ __   ___ ___
| |    / _ \| '_ \ \ / / _ \ '__/ _` |/ _ \ '_ \ / __/ _ \
| \__/\ (_) | | | \ V /  __/ | | (_| |  __/ | | | (_|  __/
 \____/\___/|_| |_|\_/ \___|_|  \__, |\___|_| |_|\___\___|
                                 __/ |
                                |___/
 */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./Upgradeable/Beacon/BeaconProxy.sol";

import "./interfaces/ICvgControlTowerV2.sol";
import "./interfaces/IOracleStruct.sol";
import "./interfaces/ICrvPoolPlain.sol";

import "./interfaces/Convex/ICvxAssetWrapper.sol";
import "./interfaces/Convex/IAssetDepositor.sol";
import "./interfaces/Convex/ICvxAssetStakerBuffer.sol";

/// @title Cvg-Finance - CloneFactoryV2
/// @notice Convergence's factory to deploy clone of contracts
contract CloneFactoryV2 is Ownable2StepUpgradeable {
    struct WithdrawCallInfo {
        address addr;
        bytes signature;
    }

    /// @dev Convergence ecosystem address.
    ICvgControlTowerV2 public cvgControlTower;

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        STAKE DAO
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /// @dev Beacon contract storing the staking implementation contract.
    address public beaconSdStaking;

    /// @dev Beacon contract storing the buffer implementation contract.
    address public beaconBuffer;

    /// @dev Withdraw signature info.
    WithdrawCallInfo private withdrawCallInfo;

    event SdtStakingCreated(address stakingClone, address gaugeAsset, address bufferClone, bool isLp);

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                            CONVEX
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /// @dev Beacon contract storing the cvxAsset staking service implementation contract.
    address public beaconStakingServiceCvxAsset;

    /// @dev Beacon contract storing the cvxAsset staker buffer implementation contract.
    address public beaconStakerBufferCvxAsset;

    event CvxAssetStakingCreated(address stakingService, address cvxAsset, address stakerBuffer);

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                            CONSTRUCTOR
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(ICvgControlTowerV2 _cvgControlTower) external initializer {
        cvgControlTower = _cvgControlTower;
        _transferOwnership(msg.sender);
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        STAKE DAO
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     * @notice Create a sdtStaking contract and its associated buffer contract through the beacon proxy implementation.
     * @dev This is linking the newly created SdtBuffer to the associated SdtStakingService.
     * @dev The SdtBuffer is then set as the receiver of the rewards from the StakeDao gauge.
     * @param _sdAssetGauge - address of the sdAsset-gauge
     * @param _symbol - string ticker of the stakingAsset
     */
    function createSdtStakingAndBuffer(address _sdAssetGauge, string memory _symbol, bool isLp) external onlyOwner {
        ICvgControlTower _cvgControlTower = cvgControlTower;
        address _beaconSdStaking = beaconSdStaking;
        address _beaconBuffer = beaconBuffer;
        address beaconSdStakingProxy = address(
            new BeaconProxy(
                _beaconSdStaking,
                abi.encodeWithSignature(
                    "initialize(address,address,string,bool,(address,bytes))",
                    _cvgControlTower,
                    _sdAssetGauge,
                    _symbol,
                    true,
                    withdrawCallInfo
                )
            )
        );

        address beaconBufferProxy = address(
            new BeaconProxy(
                _beaconBuffer,
                abi.encodeWithSignature(
                    "initialize(address,address,address,address)",
                    _cvgControlTower,
                    beaconSdStakingProxy,
                    _sdAssetGauge,
                    _cvgControlTower.sdt()
                )
            )
        );

        ISdtStakingPositionService(beaconSdStakingProxy).setBuffer(beaconBufferProxy);

        /// @dev setup the receiver of the rewards on the associated buffer
        _cvgControlTower.sdtBlackHole().setGaugeReceiver(_sdAssetGauge, beaconBufferProxy);

        /// @dev register the staking contract & the buffer in the CvgControlTower
        _cvgControlTower.insertNewSdtStaking(beaconSdStakingProxy);

        emit SdtStakingCreated(beaconSdStakingProxy, _sdAssetGauge, beaconBufferProxy, isLp);
    }

    function setBeaconSdStaking(address _beaconSdStaking) external onlyOwner {
        beaconSdStaking = _beaconSdStaking;
    }

    function setBeaconBuffer(address _beaconBuffer) external onlyOwner {
        beaconBuffer = _beaconBuffer;
    }

    /// @notice set withdrawCallInfo
    function setWithdrawCallInfo(WithdrawCallInfo calldata _withdrawCallInfo) external onlyOwner {
        withdrawCallInfo = _withdrawCallInfo;
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        CONVEX
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     * @notice Create a cvxAsset Staking contract and its associated buffer contract through the beacon proxy implementation.
     * @dev This is linking the newly created SdtBuffer to the associated SdtStakingService.
     * @dev The stakerBuffer is then set as the receiver of the rewards from the StakeDao gauge.
     * @param _asset - address of the sdAsset-gauge
     * @param _symbol - string ticker of the stakingAsset
     */
    function createCvxAssetStakingAndBuffer(
        IERC20 _asset,
        IERC20 _cvxAsset,
        ICvxAssetWrapper _cvxAssetWrapper,
        ICrvPoolPlain _stablePool,
        IAssetDepositor _assetDepositor,
        uint256 stakingType,
        string calldata _symbol,
        ICvxAssetStakerBuffer.CvxRewardConfig[] calldata _rewardTokensConfig
    ) external onlyOwner {
        address beaconStakingServiceCvxAssetProxy = address(
            new BeaconProxy(
                beaconStakingServiceCvxAsset,
                abi.encodeWithSignature(
                    "initialize(address,address,address,address,address,string)",
                    _asset,
                    _cvxAsset,
                    _cvxAssetWrapper,
                    _stablePool,
                    _assetDepositor,
                    _symbol
                )
            )
        );
        address beaconStakerBufferProxy = address(
            new BeaconProxy(
                beaconStakerBufferCvxAsset,
                abi.encodeWithSignature(
                    "initialize(address,address,address,uint256,(address,uint48,uint48)[])",
                    _cvxAsset,
                    _cvxAssetWrapper,
                    beaconStakingServiceCvxAssetProxy,
                    stakingType,
                    _rewardTokensConfig
                )
            )
        );

        emit CvxAssetStakingCreated(beaconStakingServiceCvxAssetProxy, address(_cvxAsset), beaconStakerBufferProxy);
    }

    function setBeaconStakingServiceCvxAsset(address _beaconStakingServiceCvxAsset) external onlyOwner {
        beaconStakingServiceCvxAsset = _beaconStakingServiceCvxAsset;
    }

    function setBeaconStakerBufferCvxAsset(address _beaconStakerBufferCvxAsset) external onlyOwner {
        beaconStakerBufferCvxAsset = _beaconStakerBufferCvxAsset;
    }
}
