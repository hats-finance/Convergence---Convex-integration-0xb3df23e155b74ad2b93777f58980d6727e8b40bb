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

/// @title Cvg-Finance - CvxStakingPositionService
/// @notice Staking contract of Convex integration.
///         Allow to Stake, Unstake and Claim rewards.
///         Cvg Rewards are distributed by CvgCycle, each week.
///         After each Cvg cycle, rewards from CVX can be claimed and distributed to Stakers.
/// @dev    Tracks staking shares per CvgCycle even for a cycle in the past.
pragma solidity ^0.8.0;

import "../StakingServiceBase.sol";
import "../../../interfaces/ICrvPoolPlain.sol";

contract CvgFraxLpStakingService is StakingServiceBase {
    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                            CONSTANTS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /// @dev Convex token
    IERC20 public constant CVX = IERC20(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);

    /// @dev internal constant used for divisions
    uint256 internal constant HUNDRED = 1_000;

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                            STORAGE
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /// @notice Address of Convergence locker
    ICvxConvergenceLocker public cvxConvergenceLocker;

    /// @dev Corresponds to the % of depeg from which we need to start swapping the CVX.
    uint256 public depegPercentage;

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                      CONSTRUCTOR & INIT
  =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize function of the staking contract, can only be called once
     * @param _cvxConvergenceLocker Convergence Locker
     * @param _symbol Symbol of the NFT
     */
    function initialize(ICvxConvergenceLocker _cvxConvergenceLocker, string memory _symbol) external initializer {
        require(address(_cvxConvergenceLocker) != address(0), "CVG_LOCKER_ZERO");

        symbol = _symbol;
        cvxConvergenceLocker = _cvxConvergenceLocker;
        buffer = IUnderlayingBuffer(address(_cvxConvergenceLocker));
        depegPercentage = 1_025; // 1.025%

        /// @dev Initialize internal cycle with the cycle from the control tower
        stakingCycle = cvgControlTower.cvgCycle();

        /// @dev To prevent the claim of CVX on the first Cycle of deployment.
        ///      Staked asset must be staked during a FULL cycle to be eligible to rewards
        _cycleInfo[stakingCycle].isCvxProcessed = true;

        ICvxRewardDistributor _cvxRewardDistributor = ICvxRewardDistributor(cvgControlTower.cvxRewardDistributor());
        require(address(_cvxRewardDistributor) != address(0), "CVX_REWARD_RECEIVER_ZERO");
        cvxRewardDistributor = _cvxRewardDistributor;

        ICvxStakingPositionManager _cvxStakingPositionManager = cvgControlTower.cvxStakingPositionManager();
        require(address(_cvxStakingPositionManager) != address(0), "CVX_STAKING_MANAGER_ZERO");
        stakingPositionManager = _cvxStakingPositionManager;

        address _treasuryDao = cvgControlTower.treasuryDao();
        require(_treasuryDao != address(0), "TREASURY_DAO_ZERO");
        _transferOwnership(_treasuryDao);
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        USER EXTERNAL
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    /**
     * @notice Deposit only the underlying of the LP (for example eUSD/FRAXBP : deposit with eUSD+FRAX+USDC)
     *         Mints a Staking position (tokenId == 0) or increase one owned.
     *         Staking rewards are claimable after being staked for one full cycle.
     * @param tokenId of the staking position
     * @param amounts of the underlying LP assets to deposit
     * @param minLpUnderlyingAmount minimum LP underlying to deposit with the add liquidity
     * @param minLpAmount minimum LP to deposit with the add liquidity
     * @param isLock lock directly into the cvgConvexVault, if false some fees are taken
     */
    function depositLpAssetUnderlying(
        uint256 tokenId,
        uint256[3] memory amounts,
        uint256 minLpUnderlyingAmount,
        uint256 minLpAmount,
        bool isLock
    ) external {
        _deposit(
            tokenId,
            cvxConvergenceLocker.depositLpAssetUnderlying(
                amounts,
                minLpUnderlyingAmount,
                minLpAmount,
                isLock,
                msg.sender
            )
        );
    }
    /**
     * @notice Deposit LP directly (for example eUSD/FRAXBP : deposit with eUSD/FRAXBP token).
     *         Mints a Staking position (tokenId == 0) or increase one owned.
     *         Staking rewards are claimable after being staked for one full cycle.
     * @param tokenId of the staking position
     * @param amountLp of the LP to deposit
     * @param isLock lock directly into the cvgConvexVault, if false some fees are taken
     */
    function depositLp(uint256 tokenId, uint256 amountLp, bool isLock) external {
        _deposit(tokenId, cvxConvergenceLocker.depositLp(amountLp, isLock, msg.sender));
    }

    /**
     * @notice Deposit only the assets of the LP (for example eUSD/FRAXBP : deposit with eUSD+FRAXBP)
     *         Mints a Staking position (tokenId == 0) or increase one owned.
     *         Staking rewards are claimable after being staked for one full cycle.
     * @param tokenId of the staking position
     * @param amounts of the LP assets to deposit
     * @param minLpAmount minimum LP to deposit with the add liquidity
     * @param isLock lock directly into the cvgConvexVault, if false some fees are taken
     */
    function depositLpAssets(uint256 tokenId, uint256[2] memory amounts, uint256 minLpAmount, bool isLock) external {
        _deposit(tokenId, cvxConvergenceLocker.depositLpAssets(amounts, minLpAmount, isLock, msg.sender));
    }

    /**
     * @notice Deposit an amount of cvgFraxLp into the vault contract.
     *         Mints a Staking position (tokenId == 0) or increase one owned.
     *         Staking rewards are claimable after being staked for one full cycle.
     * @dev Staking at cycle N implies that first rewards will be claimable at the beginning of cycle N+2, then every cycle.
     * @param tokenId of the staking position
     * @param amount of cvgFraxLp to deposit
     */
    function deposit(uint256 tokenId, uint256 amount) external {
        _deposit(tokenId, amount);
        /// @dev transfers cvgFraxLp tokens from caller to this contract
        cvxConvergenceLocker.transferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Withdraw cvgFraxLp from the vault to the Staking Position owner.
     *         Removing rewards before the end of a cycle leads to the loss of all accumulated rewards during this cycle.
     * @dev Withdrawing always removes first from the staked amount not yet eligible to rewards.
     * @param tokenId Staking Position to withdraw token from
     * @param amount Amount of cvgFraxLp to withdraw
     */
    function withdraw(uint256 tokenId, uint256 amount) external checkCompliance(tokenId) {
        require(amount != 0, "WITHDRAW_LTE_0");

        uint256 _cvgStakingCycle = stakingCycle;

        /// @dev Update the CycleInfo & the TokenInfo for the current & next cycle
        _updateAmountStakedWithdraw(tokenId, amount, _cvgStakingCycle);

        /// @dev Transfers staked asset back to user
        cvxConvergenceLocker.transfer(msg.sender, amount);

        emit Withdraw(tokenId, msg.sender, _cvgStakingCycle, amount);
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        USER INTERNAL
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    function _deposit(uint256 tokenId, uint256 amount) internal {
        /// @dev Verify if deposits are paused
        require(!depositPaused, "DEPOSIT_PAUSED");
        /// @dev Verify if the staked amount is > 0
        require(amount != 0, "DEPOSIT_LTE_0");

        /// @dev Memorize storage data
        ICvxStakingPositionManager _cvxStakingPositionManager = stakingPositionManager;
        uint256 _cvgStakingCycle = stakingCycle;

        uint256 _tokenId;
        /// @dev If tokenId != 0, user deposits for an already existing position, we have so to check ownership
        if (tokenId != 0) {
            /// @dev Fetches, for the tokenId, the owner, the StakingPositionService linked to and the timestamp of unlocking
            _cvxStakingPositionManager.checkIncreaseDepositCompliance(tokenId, msg.sender);
            _tokenId = tokenId;
        }
        /// @dev Else, we increment the nextId to get the new tokenId
        else {
            _tokenId = _cvxStakingPositionManager.mint(msg.sender);
        }

        /// @dev Update the CycleInfo & the TokenInfo for the next cycle
        _updateAmountStakedDeposit(_tokenId, amount, _cvgStakingCycle + 1);

        emit Deposit(_tokenId, msg.sender, _cvgStakingCycle, amount);
    }
}
