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

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../../../interfaces/ICvgControlTowerV2.sol";
import "../../../interfaces/Convex/IConvexVaultCreator.sol";
import "../../../interfaces/Convex/IConvexVault.sol";
import "../../../interfaces/Convex/ICurveLp.sol";
import "../../../interfaces/Convex/IFraxBpStaking.sol";

/// @title Cvg Finance - CvgFraxLpLocker
/// @notice Lock FRAXLP into the vault and extend the lock duration
contract CvgFraxLpLocker is Ownable2StepUpgradeable, ERC20Upgradeable {
    using SafeERC20 for IERC20;

    enum State {
        NOT_ACTIVE,
        ACTIVE
    }

    /// @dev Convergence control tower
    ICvgControlTowerV2 public constant cvgControlTower = ICvgControlTowerV2(0xB0Afc8363b8F36E0ccE5D54251e20720FfaeaeE7);

    /// @dev Convex token
    IERC20 public constant CVX = IERC20(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);

    /// @dev Curve token
    IERC20 public constant CRV = IERC20(0xD533a949740bb3306d119CC777fa900bA034cd52);

    /// @dev FraxShare token
    IERC20 public constant FXS = IERC20(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);

    IConvexVaultCreator public constant convexVaultCreator =
        IConvexVaultCreator(0x2B8b301B90Eb8801f1eEFe73285Eec117D2fFC95);

    uint256 public constant MAX_LOCK = 1 * 1095 * 86400;

    uint256 private constant DENOMINATOR = 100000;

    State public state;

    IConvexVault public cvgConvexVault;

    ICurveLp public curveLp;

    ICurveLp public curveLpUnderlying;

    address public cvxRewardDistributor;

    address public cvxStakingPositionService;

    bytes32 public kek_id;

    uint256 public feesForNonLocker;

    /// @notice Percentage of rewards to be sent to the user who processed the CVX rewards
    uint256 public processorRewardsPercentage;

    IERC20[2] public coins;
    IERC20[2] public coinsUnderlying;

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        CONSTRUCTOR & INIT
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initialize function
    function initialize(
        uint256 _pid,
        ICurveLp _curveLp,
        string memory _name,
        string memory _symbol,
        IERC20[2] memory _coins,
        IERC20[2] memory _coinsUnderlying,
        ICurveLp _curveLpUnderlying,
        address _cvxRewardDistributor
    ) external initializer {
        __ERC20_init(_name, _symbol);

        curveLp = _curveLp;
        curveLpUnderlying = _curveLpUnderlying;
        cvxRewardDistributor = _cvxRewardDistributor;

        //check if coins are not cvx/crv/fxs
        require(
            _coins[0] != CVX && _coins[1] != CVX && _coinsUnderlying[0] != CVX && _coinsUnderlying[1] != CVX,
            "COIN_IS_CVX"
        );
        require(
            _coins[0] != CRV && _coins[1] != CRV && _coinsUnderlying[0] != CRV && _coinsUnderlying[1] != CRV,
            "COIN_IS_CRV"
        );
        require(
            _coins[0] != FXS && _coins[1] != FXS && _coinsUnderlying[0] != FXS && _coinsUnderlying[1] != FXS,
            "COIN_IS_FXS"
        );

        //lp assets
        coins[0] = _coins[0]; //eUSD
        coins[1] = _coins[1]; //FRAXLP

        //lp asset underlying
        coinsUnderlying[0] = _coinsUnderlying[0]; //always FRAX
        coinsUnderlying[1] = _coinsUnderlying[1]; //USDC or PYUSD

        cvgConvexVault = IConvexVault(convexVaultCreator.createVault(_pid));

        /// @dev approvals assets LP
        _coins[0].approve(address(cvgConvexVault), type(uint256).max);
        _coins[1].approve(address(cvgConvexVault), type(uint256).max);
        _coins[0].approve(address(_curveLp), type(uint256).max);
        _coins[1].approve(address(_curveLp), type(uint256).max);

        /// @dev approvals assets underlying LP
        _coinsUnderlying[0].approve(address(_curveLpUnderlying), type(uint256).max);
        _coinsUnderlying[1].approve(address(_curveLpUnderlying), type(uint256).max);

        /// @dev approval curve LP
        _curveLp.approve(address(cvgConvexVault), type(uint256).max);

        feesForNonLocker = 1000; //1%

        /// @dev corresponds to 1%
        processorRewardsPercentage = 1000;

        _transferOwnership(cvgControlTower.treasuryDao());
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        EXTERNAL
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     * @notice Deposit LP directly (for example eUSD/FRAXBP : deposit with eUSD/FRAXBP token).
     * @param amountLp of the LP to deposit
     * @param isLock lock directly into the cvgConvexVault, if false some fees are taken
     * @param receiver address
     */
    function depositLp(uint256 amountLp, bool isLock, address receiver) external returns (uint256) {
        (address operator, address _receiver) = _compliance(receiver);
        //transferFrom curveLp to here
        curveLp.transferFrom(operator, address(this), amountLp);
        //deposit CurveLp and Mint cvgFraxLp to receiver
        _depositLpAndMint(amountLp, isLock, _receiver);

        return amountLp;
    }

    /**
     * @notice Deposit only the assets of the LP (for example eUSD/FRAXBP : deposit with eUSD+FRAXBP)
     * @param amounts of the LP assets to deposit
     * @param minLpAmount minimum LP to deposit with the add liquidity
     * @param isLock lock directly into the cvgConvexVault, if false some fees are taken
     * @param receiver address
     */
    function depositLpAssets(
        uint256[2] memory amounts,
        uint256 minLpAmount,
        bool isLock,
        address receiver
    ) external returns (uint256) {
        (address operator, address _receiver) = _compliance(receiver);
        IERC20[2] memory _coins = coins;
        //transferFrom assets to here
        for (uint256 i; i < amounts.length; ) {
            if (amounts[i] != 0) {
                _coins[i].transferFrom(operator, address(this), amounts[i]);
            }
            if (!isLock) {
                amounts[i] -= (amounts[i] * feesForNonLocker) / DENOMINATOR;
            }
            unchecked {
                ++i;
            }
        }
        //add liq in CurveLp
        uint256 amountLp = curveLp.add_liquidity(amounts, minLpAmount, address(this));

        //deposit CurveLp and Mint cvgFraxLp to receiver
        _depositLpAndMint(amountLp, isLock, _receiver);

        return amountLp;
    }

    /**
     * @notice Deposit only the underlying of the LP (for example eUSD/FRAXBP : deposit with eUSD+FRAX+USDC)
     * @param amounts of the underlying LP assets to deposit
     * @param minLpUnderlyingAmount minimum LP underlying to deposit with the add liquidity
     * @param minLpAmount minimum LP to deposit with the add liquidity
     * @param isLock lock directly into the cvgConvexVault, if false some fees are taken
     * @param receiver address
     */
    function depositLpAssetUnderlying(
        uint256[3] memory amounts, //ex: [0] => eUSD / [1] => FRAX / [2] => USDC
        uint256 minLpUnderlyingAmount,
        uint256 minLpAmount,
        bool isLock,
        address receiver
    ) external returns (uint256) {
        (address operator, address _receiver) = _compliance(receiver);
        //transferFrom assets to here
        if (amounts[0] != 0) {
            coins[0].transferFrom(operator, address(this), amounts[0]);
        }
        if (amounts[1] != 0) {
            coinsUnderlying[0].transferFrom(operator, address(this), amounts[1]);
        }
        if (amounts[2] != 0) {
            coinsUnderlying[1].transferFrom(operator, address(this), amounts[2]);
        }
        if (!isLock) {
            amounts[0] -= (amounts[0] * feesForNonLocker) / DENOMINATOR;
            amounts[1] -= (amounts[1] * feesForNonLocker) / DENOMINATOR;
            amounts[2] -= (amounts[2] * feesForNonLocker) / DENOMINATOR;
        }
        //add liq frax/usdc in Curve FRAXBP
        uint256 amountLpUnderlying = curveLpUnderlying.add_liquidity([amounts[1], amounts[2]], minLpUnderlyingAmount);

        //add liq in CurveLp
        uint256 amountLp = curveLp.add_liquidity([amounts[0], amountLpUnderlying], minLpAmount, address(this));

        //deposit CurveLp and Mint cvgFraxLp to receiver
        _depositLpAndMint(amountLp, isLock, _receiver);

        return amountLp;
    }

    /// @notice Increase the lock with pending LPs & extend to max lock, processor will be rewarded by the accumulated deposit fees
    function increaseLock() external {
        uint256 amountLp = curveLp.balanceOf(address(this));
        require(amountLp != 0, "NO_PENDING_LP");

        //increase lock amount and extend time for the staking position
        cvgConvexVault.lockAdditionalCurveLp(kek_id, amountLp);
        cvgConvexVault.lockLonger(kek_id, MAX_LOCK + block.timestamp);

        //send fees rewards to the processor user
        IERC20[2] memory _coins = coins;
        for (uint256 i; i < _coins.length; ) {
            uint256 balance = _coins[i].balanceOf(address(this));
            if (balance != 0) {
                _coins[i].transfer(msg.sender, balance);
            }
            unchecked {
                ++i;
            }
        }

        IERC20[2] memory _coinsUnderlying = coinsUnderlying;
        for (uint256 i; i < _coinsUnderlying.length; ) {
            uint256 balance = _coinsUnderlying[i].balanceOf(address(this));
            if (balance != 0) {
                _coinsUnderlying[i].transfer(msg.sender, balance);
            }
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Claim rewards in the cvgConvexVault and distribute it on the staking contract, only callable by staking itself
    function pullRewards(address processor) external returns (ICommonStruct.TokenAmount[] memory) {
        require(msg.sender == address(cvxStakingPositionService), "NOT_CVX_REWARD_DISTRIBUTOR");

        address _cvxRewardDistributor = cvxRewardDistributor;

        //claim rewards
        cvgConvexVault.getReward();

        //balance of rewards
        IERC20 _cvx = CVX;
        IERC20 _crv = CRV;
        IERC20 _fxs = FXS;
        uint256 cvxAmount = _cvx.balanceOf(address(this));
        uint256 crvAmount = _crv.balanceOf(address(this));
        uint256 fxsAmount = _fxs.balanceOf(address(this));

        /// @dev TokenAmount array struct returned
        ICommonStruct.TokenAmount[] memory cvxRewardAssets = new ICommonStruct.TokenAmount[](3);
        uint256 counter;

        //processor fees
        uint256 _processorRewardsPercentage = processorRewardsPercentage;
        address _processor = processor;

        if (cvxAmount != 0) {
            /// @dev send rewards to claimer
            uint256 processorRewards = (cvxAmount * _processorRewardsPercentage) / DENOMINATOR;
            if (processorRewards != 0) {
                _cvx.transfer(_processor, processorRewards);
                cvxAmount -= processorRewards;
            }

            cvxRewardAssets[counter++] = ICommonStruct.TokenAmount({token: _cvx, amount: cvxAmount});

            _cvx.transfer(_cvxRewardDistributor, cvxAmount);
        }
        if (crvAmount != 0) {
            /// @dev send rewards to claimer
            uint256 processorRewards = (crvAmount * _processorRewardsPercentage) / DENOMINATOR;
            if (processorRewards != 0) {
                _crv.transfer(_processor, processorRewards);
                crvAmount -= processorRewards;
            }

            cvxRewardAssets[counter++] = ICommonStruct.TokenAmount({token: _crv, amount: crvAmount});

            _crv.transfer(_cvxRewardDistributor, crvAmount);
        }

        if (fxsAmount != 0) {
            uint256 processorRewards = (fxsAmount * _processorRewardsPercentage) / DENOMINATOR;
            if (processorRewards != 0) {
                _fxs.transfer(_processor, processorRewards);
                fxsAmount -= processorRewards;
            }

            cvxRewardAssets[counter++] = ICommonStruct.TokenAmount({token: _fxs, amount: fxsAmount});

            _fxs.transfer(_cvxRewardDistributor, fxsAmount);
        }

        /// @dev reduces the length of the array to not return some useless 0 TokenAmount structs
        // solhint-disable-next-line no-inline-assembly
        assembly {
            mstore(cvxRewardAssets, sub(mload(cvxRewardAssets), sub(3, counter)))
        }

        return cvxRewardAssets;
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        INTERNAL
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    function _compliance(address receiver) internal returns (address, address) {
        address operator;
        address _staking = cvxStakingPositionService;
        if (msg.sender == _staking) {
            operator = receiver;
            receiver = _staking;
        } else {
            operator = msg.sender;
        }
        return (operator, receiver);
    }

    function _depositLpAndMint(uint256 _amountLp, bool _isLock, address _receiver) internal {
        //lock if necessary the CurveLp into the cvgConvexVault
        if (_isLock) {
            cvgConvexVault.lockAdditionalCurveLp(kek_id, _amountLp);
        }
        //mint cvgFraxLp to receiver
        _mint(_receiver, _amountLp);
    }
    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        SIMULATION
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    /// @notice Function only used to call a simulation of rewards
    function getReward() external onlyOwner returns (uint256, uint256, uint256) {
        //claim rewards
        cvgConvexVault.getReward();

        return (CVX.balanceOf(address(this)), CRV.balanceOf(address(this)), FXS.balanceOf(address(this)));
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        SETTERS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /// @notice Initiate the cvgConvexVault by locking at least 1 wei of the curveLP & set the address of staking
    function setupLocker(address _cvxStakingPositionService) external onlyOwner {
        require(state == State.NOT_ACTIVE, "LOCKER_ALREADY_SET");
        cvxStakingPositionService = _cvxStakingPositionService;
        uint256 balCurveLp = curveLp.balanceOf(address(this));
        require(balCurveLp != 0, "NO_CURVE_LP");
        kek_id = cvgConvexVault.stakeLockedCurveLp(balCurveLp, MAX_LOCK);
        state = State.ACTIVE;
    }

    /**
     * @notice Set the percentage of rewards to be sent to the user processing the CVX rewards.
     * @param _percentage rewards percentage value
     */
    function setProcessorRewardsPercentage(uint256 _percentage) external onlyOwner {
        /// @dev it must never exceed 3%
        require(_percentage <= 3000, "PERCENTAGE_TOO_HIGH");
        processorRewardsPercentage = _percentage;
    }
}
