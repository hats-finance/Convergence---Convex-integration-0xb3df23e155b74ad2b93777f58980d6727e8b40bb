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
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "../../../interfaces/ICvgControlTowerV2.sol";
import "../../../interfaces/Convex/ICvxLocker.sol";
import "../../../interfaces/Convex/IDelegateRegistry.sol";

interface ICvx1 {
    function stake() external;
}

/// @title Cvg Finance - CvxConvergenceLocker
/// @notice Acts as an ERC20 for cvgCVX, Locker and Buffer
contract CvxConvergenceLocker is ERC20Upgradeable, Ownable2StepUpgradeable {
    using SafeERC20 for IERC20;

    /// @dev Convergence control tower
    ICvgControlTowerV2 public constant cvgControlTower = ICvgControlTowerV2(0xB0Afc8363b8F36E0ccE5D54251e20720FfaeaeE7);

    /// @dev Convex token
    IERC20 public constant CVX = IERC20(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);

    /// @dev Curve token
    IERC20 public constant CRV = IERC20(0xD533a949740bb3306d119CC777fa900bA034cd52);

    /// @dev FraxShare token
    IERC20 public constant FXS = IERC20(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);

    /// @dev Convex locker contract
    ICvxLocker public constant CVX_LOCKER = ICvxLocker(0x72a19342e8F1838460eBFCCEf09F6585e32db86E);

    uint256 private constant DENOMINATOR = 100000;

    /// @dev Convex delegate registry contract
    IDelegateRegistry public cvxDelegateRegistry;

    /// @dev CVX1 token
    ICvx1 public cvx1;

    /// @dev Staking contract address
    address public cvxStakingPositionService;

    /// @dev Amount of CVX pending to be locked
    uint256 public cvxToLock;

    /// @dev Represents the fees taken when minting cvgCVX without locking
    uint256 public mintFees;

    /// @notice Percentage of rewards to be sent to the user who processed the CVX rewards
    uint256 public processorRewardsPercentage;

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        CONSTRUCTOR & INIT
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initialize function
    function initialize(
        string memory _name,
        string memory _symbol,
        IDelegateRegistry _cvxDelegateRegistry,
        ICvx1 _cvx1
    ) external initializer {
        __ERC20_init(_name, _symbol);

        mintFees = 100; // 1%
        processorRewardsPercentage = 1000; // 1%

        cvxDelegateRegistry = _cvxDelegateRegistry;
        cvx1 = _cvx1;

        CVX.approve(address(CVX_LOCKER), type(uint256).max);

        _transferOwnership(cvgControlTower.treasuryDao());
    }

    /**
     * @notice Locks all balance of CVX received during the conversion of cvgCVX in vlCVX.
     * @dev Callable by anyone.
     **/
    function lockCvx() public {
        CVX_LOCKER.lock(address(this), cvxToLock, 0);
        cvxToLock = 0;
    }

    /**
     * @notice Only callable by the cvgCVX staking contract during the processCvxRewards, transfers ERC20 tokens to the reward distributor.
     *         This process is incentivized so that the user who initiated it receives a percentage of each reward token.
     * @param processor address of the processor
     * @return Array of TokenAmount, Values of this array are registered in the Staking contract and linked to the processed cycle
     */
    function pullRewards(address processor) external returns (ICommonStruct.TokenAmount[] memory) {
        require(msg.sender == cvxStakingPositionService, "NOT_CVG_CVX_STAKING");

        /// @dev claim rewards
        CVX_LOCKER.getReward(address(this));

        // balance of rewards
        uint256 cvxAmount = CVX.balanceOf(address(this)) - cvxToLock;
        uint256 crvAmount = CRV.balanceOf(address(this));
        uint256 fxsAmount = FXS.balanceOf(address(this));
        uint256 cvgCvxAmount = balanceOf(address(this));

        /// @dev TokenAmount array struct returned
        ICommonStruct.TokenAmount[] memory cvxRewardAssets = new ICommonStruct.TokenAmount[](4);
        uint256 counter;

        // processor fees
        uint256 _processorRewardsPercentage = processorRewardsPercentage;
        address cvxRewardDistributor = address(cvgControlTower.cvxRewardDistributor());

        if (cvxAmount != 0) {
            /// @dev send rewards to claimer
            uint256 processorRewards = (cvxAmount * _processorRewardsPercentage) / DENOMINATOR;
            if (processorRewards != 0) {
                CVX.transfer(processor, processorRewards);
                cvxAmount -= processorRewards;
            }

            cvxRewardAssets[counter++] = ICommonStruct.TokenAmount({token: CVX, amount: cvxAmount});

            CVX.transfer(cvxRewardDistributor, cvxAmount);
        }

        if (crvAmount != 0) {
            /// @dev send rewards to claimer
            uint256 processorRewards = (crvAmount * _processorRewardsPercentage) / DENOMINATOR;
            if (processorRewards != 0) {
                CRV.transfer(processor, processorRewards);
                crvAmount -= processorRewards;
            }

            cvxRewardAssets[counter++] = ICommonStruct.TokenAmount({token: CRV, amount: crvAmount});

            CRV.transfer(cvxRewardDistributor, crvAmount);
        }

        if (fxsAmount != 0) {
            uint256 processorRewards = (fxsAmount * _processorRewardsPercentage) / DENOMINATOR;
            if (processorRewards != 0) {
                FXS.transfer(processor, processorRewards);
                fxsAmount -= processorRewards;
            }

            cvxRewardAssets[counter++] = ICommonStruct.TokenAmount({token: FXS, amount: fxsAmount});

            FXS.transfer(cvxRewardDistributor, fxsAmount);
        }

        /// @dev distributes if the balance is different from 0
        if (cvgCvxAmount != 0) {
            /// @dev send rewards to claimer
            uint256 processorRewards = (cvgCvxAmount * _processorRewardsPercentage) / DENOMINATOR;
            if (processorRewards != 0) {
                transfer(processor, processorRewards);
                cvgCvxAmount -= processorRewards;
            }

            cvxRewardAssets[counter++] = ICommonStruct.TokenAmount({
                token: IERC20(address(this)),
                amount: cvgCvxAmount
            });

            /// @dev transfers all cvgCVX to the cvxRewardDistributor
            transfer(cvxRewardDistributor, cvgCvxAmount);
        }

        // solhint-disable-next-line no-inline-assembly
        assembly {
            mstore(cvxRewardAssets, sub(mload(cvxRewardAssets), sub(4, counter)))
        }

        /// @dev stake all CVX on the CVX1 contract
        cvx1.stake();

        return cvxRewardAssets;
    }

    /**
     * @notice Delegates vlCVX voting power to another address.
     * @param id Snapshot ID (cvx.eth)
     * @param account address of the delegatee
     **/
    function delegate(bytes32 id, address account) external onlyOwner {
        cvxDelegateRegistry.setDelegate(id, account);
    }

    /**
     * @notice Clear voting power delegation
     * @param id Snapshot ID (cvx.eth)
     **/
    function clearDelegate(bytes32 id) external onlyOwner {
        cvxDelegateRegistry.clearDelegate(id);
    }

    /**
     *   @notice Mint an amount of cvgCVX to the account in exchange of the same amount in CVX.
     *           All CVX will be locked into vlCVX.
     *   @param account receiver of the minted cvgCVX
     *   @param amount to mint to the receiver, is also the amount of CVX that will be taken from the msg.sender
     *   @param isLock determines if received CVX will be automatically locked or not
     **/
    function mint(address account, uint256 amount, bool isLock) external {
        if (!isLock) {
            /// @dev Compute fees when not choosing to lock
            uint256 feesAmount = (amount * mintFees) / 10_000;
            amount -= feesAmount;

            /// @dev Take fees for relocking
            CVX.transferFrom(msg.sender, cvgControlTower.treasuryPod(), feesAmount);
        }

        /// @dev Transfer CVX from user to this contract
        CVX.transferFrom(msg.sender, address(this), amount);

        /// @dev Update CVX lock data
        cvxToLock += amount;
        if (isLock) {
            lockCvx();
        }

        _mint(account, amount);
    }

    /**
     * @notice Burns an amount of cvgCVX to the caller of this function.
     * @param amount to burn to the msg.sender
     **/
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @notice Method used to transfer tokens received on this contract.
     * @dev Callable by the owner only.
     * @param tokens Address of each token
     * @param amounts Amounts of each token to transfer
     * @param receiver Address of the receiver
     **/
    function sendTokens(IERC20[] calldata tokens, uint256[] calldata amounts, address receiver) external onlyOwner {
        require(tokens.length == amounts.length, "LENGTH_MISMATCH");

        for (uint256 i; i < tokens.length; ) {
            /// @dev Ensure token is not one from the below list (CVX, CRV, FXS, cvgCVX) as these are reward tokens
            require(address(tokens[i]) != address(CVX), "CVX_CANNOT_BE_TRANSFERRED");
            require(address(tokens[i]) != address(CRV), "CRV_CANNOT_BE_TRANSFERRED");
            require(address(tokens[i]) != address(FXS), "FXS_CANNOT_BE_TRANSFERRED");
            require(address(tokens[i]) != address(this), "CVGCVX_CANNOT_BE_TRANSFERRED");

            tokens[i].transfer(receiver, amounts[i]);
            unchecked {
                ++i;
            }
        }
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        SETTERS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    function setCvxDelegateRegistry(IDelegateRegistry delegateRegistry) external onlyOwner {
        cvxDelegateRegistry = delegateRegistry;
    }

    function setCvxStakingPositionService(address _cvxStakingPositionService) external onlyOwner {
        cvxStakingPositionService = _cvxStakingPositionService;
    }

    /**
     * @notice Update mint fees that are taken when deposited CVX won't be directly locked.
     * @param _fees amount of fees to send to treasury POD
     **/
    function setMintFees(uint256 _fees) external onlyOwner {
        /// @dev maximum allowed: 2%
        require(_fees <= 200, "FEES_TOO_BIG");
        mintFees = _fees;
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
