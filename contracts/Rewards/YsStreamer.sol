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

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../interfaces/ICvgControlTowerV2.sol";
import "../interfaces/IYsStreamer.sol";

contract YsStreamer is Ownable2StepUpgradeable {
    using SafeERC20 for IERC20;

    /// @dev Convergence control tower
    ICvgControlTowerV2 public constant cvgControlTower = ICvgControlTowerV2(0xB0Afc8363b8F36E0ccE5D54251e20720FfaeaeE7);

    /// @dev Locking Position Service
    ILockingPositionService public constant lockingService =
        ILockingPositionService(0xc8a6480ed7C7B1C401061f8d96bE7De6f94D3E60);

    /// @dev Locking Position Manager
    ILockingPositionManager public constant lockingManager =
        ILockingPositionManager(0x0EDB88Aa3aa665782121fA2509b382f414A0C0cE);

    /// @dev Cvg Rewards
    ICvgRewards public constant cvgRewards = ICvgRewards(0xa044fd2E8254eC5DE93B15b8B27d005899579109);

    /// @dev Duration that rewards are streamed over. 25.6 days = 11 cycle * 7 days / 3 distributions. Allows us to do 3 distrib on one TDE.
    uint256 public constant REWARDS_DURATION = 8640 * 256;

    /// @dev Addresses listed as a reward token, protected from recovery
    mapping(IERC20 => bool) public isRewardToken;

    /// @dev Addresses approved to notify reward amount
    mapping(IERC20 => mapping(address => bool)) public rewardDistributors; // reward token => distributor => is approved to add rewards

    /// @dev Balance checked in per TDE & locking position ID
    mapping(uint256 => mapping(uint256 => uint256)) public balanceCheckedIn; // tdeId => tokenId => balanceCheckedIn

    /// @dev Total supply checked in per TDE
    mapping(uint256 => uint256) public totalSupplyCheckedIn; // tdeId => total CheckedIn

    /// @dev List of reward tokens per TDE
    mapping(uint256 => IERC20[]) public rewardTokens; // tdeId => list of tokens

    /// @dev Reward data associated to a reward token per TDE ID
    mapping(uint256 => mapping(IERC20 => IYsStreamer.Reward)) public rewardData; // tdeId => token => reward data

    /// @dev Reward amount already sent to an user for a reward token per TDE
    mapping(uint256 => mapping(uint256 => mapping(IERC20 => uint256))) public userRewardPerTokenPaid; // tdeId => tokenId => reward token => amount

    /// @dev Reward amount for a reward token for a user per TDE
    mapping(uint256 => mapping(uint256 => mapping(IERC20 => uint256))) public rewards; // tdeId => tokenId => reward token => amount

    event RewardNotified(ICommonStruct.TokenAmount[] rewardsDistributed);
    event CheckIn(uint256 indexed tokenId, uint256 _amount);
    event Withdrawn(address indexed _user, uint256 _amount);
    event RewardPaid(address indexed _user, IERC20 indexed _rewardToken, uint256 _reward);
    event Recovered(IERC20 _token, uint256 _amount);
    event RewardAdded(IYsStreamer.AddTokenRewardInput[] _rewardTokens);
    event RewardDistributorApproved(IERC20 indexed _reward, address indexed _distributor, bool _state);

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        CONSTRUCTOR & INIT
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initialize function
    function initialize() external initializer {
        _transferOwnership(cvgControlTower.treasuryDao());
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        MODIFIERS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    modifier updateReward(uint256 tdeId, uint256 tokenId) {
        _updateReward(tdeId, tokenId);
        _;
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        CHECK IN
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     * @notice Check in a Locking Position of CVG embedding some ys on the actual TDE.
     * @param tokenId     Token ID of the locking position to check in
     * @param actualCycle Actual cvgCycle
     */
    function checkInFromLocking(uint256 tokenId, uint256 actualCycle) external {
        require(msg.sender == address(lockingService), "NOT_LOCKING_SERVICE");
        /// @dev Here, we don't use the getActualTde function because of 12 multiple cycle.
        /// @dev In this case, we need to take the next TDE because adding ysCVG on a 12 multiple cycle only adds ysCVG for the TDE N+1.
        _checkIn(1 + actualCycle / 12, tokenId);
    }

    /**
     * @notice Checks in ysCVG for enabling rewards streaming on a locking position.
     * @param tokenId Token ID of the locking position to check in
     */
    function checkIn(uint256 tokenId) external {
        uint256 actualTde = getActualTde();

        _checkIn(actualTde, tokenId);
    }

    /**
     * @notice Checks in ysCVG for enabling rewards streaming on several positions
     * @param tokenIds Token IDs of the locking position to check in
     */
    function checkInMultiple(uint256[] calldata tokenIds) external {
        uint256 actualTde = getActualTde();

        for (uint256 i; i < tokenIds.length; ) {
            _checkIn(actualTde, tokenIds[i]);
            unchecked {
                ++i;
            }
        }
    }
    /**
     * @notice Checks in ysCVG for enabling rewards streaming on a locking position
     * @param tokenId Token ID of the NFT to check in
     */
    function _checkIn(uint256 actualTde, uint256 tokenId) internal {
        _updateReward(actualTde, tokenId);

        uint256 alreadyCheckedIn = balanceCheckedIn[actualTde][tokenId];

        uint256 delta = lockingService.balanceOfYsCvgAt(tokenId, actualTde * 12) - alreadyCheckedIn;

        require(delta != 0, "NO_YS_TO_CHECKIN");
        balanceCheckedIn[actualTde][tokenId] = alreadyCheckedIn + delta;
        totalSupplyCheckedIn[actualTde] += delta;

        emit CheckIn(tokenId, delta);
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        REWARD MANAGEMENT
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     * @notice Add new reward tokens to be distributed to users and link them to a distributor
     * @param _addRewards Array of ERC20 token & distributor
     */
    function addReward(IYsStreamer.AddTokenRewardInput[] calldata _addRewards) external onlyOwner {
        uint256 actualTde = getActualTde();
        for (uint256 i; i < _addRewards.length; ) {
            IERC20 token = _addRewards[i].token;

            require(rewardData[actualTde][token].lastUpdateTime == 0, "REWARD_TOKEN_ALREADY_EXISTS");

            rewardTokens[actualTde].push(token);
            rewardData[actualTde][token].lastUpdateTime = uint128(block.timestamp);
            rewardData[actualTde][token].periodFinish = uint128(block.timestamp);
            rewardDistributors[token][_addRewards[i].distributor] = true;
            isRewardToken[token] = true;

            unchecked {
                ++i;
            }
        }

        emit RewardAdded(_addRewards);
    }

    struct RewardDistributorStruct {
        IERC20 rewardToken;
        address distributor;
        bool approved;
    }
    /**
     * @notice Approve as distributor addresses for an ERC20 token
     * @param _rewardDistributors Struct Array of RewardDistributorStruct
     */
    function approveRewardDistributor(RewardDistributorStruct[] calldata _rewardDistributors) external onlyOwner {
        for (uint256 i; i < _rewardDistributors.length; ) {
            rewardDistributors[_rewardDistributors[i].rewardToken][
                _rewardDistributors[i].distributor
            ] = _rewardDistributors[i].approved;

            emit RewardDistributorApproved(
                _rewardDistributors[i].rewardToken,
                _rewardDistributors[i].distributor,
                _rewardDistributors[i].approved
            );
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Notify reward amount for several ERC20 tokens. Streams rewards for the actual TDE.
     * @param _rewardTokens Array of Token & Amount
     */
    function notifyRewardAmount(ICommonStruct.TokenAmount[] calldata _rewardTokens) external {
        uint256 actualTde = getActualTde();
        _updateReward(actualTde, 0);
        for (uint256 i; i < _rewardTokens.length; ) {
            require(rewardDistributors[_rewardTokens[i].token][msg.sender], "NOT_DISTRIBUTOR_FOR_TOKEN");
            IERC20 token = _rewardTokens[i].token;
            uint256 amount = _rewardTokens[i].amount;
            require(rewardData[actualTde][token].lastUpdateTime != 0, "REWARD_TOKEN_DONT_EXIST");
            require(amount > 0, "INCORRECT_VALUE");

            _notifyReward(actualTde, token, amount);

            /// @dev Handle the transfer of reward tokens via `transferFrom` to reduce the number
            /// @dev of transactions required and ensure correctness of the _reward amount
            token.safeTransferFrom(msg.sender, address(this), amount);

            unchecked {
                ++i;
            }
        }

        emit RewardNotified(_rewardTokens);
    }

    /**
     * @notice Update reward data for the specified reward token
     * @param _rewardToken Address of the reward token
     * @param _reward Reward amount
     */
    function _notifyReward(uint256 tdeId, IERC20 _rewardToken, uint256 _reward) internal {
        IYsStreamer.Reward storage rData = rewardData[tdeId][_rewardToken];

        if (block.timestamp >= rData.periodFinish) {
            rData.rewardRate = _reward / REWARDS_DURATION;
        } else {
            uint256 remaining = rData.periodFinish - block.timestamp;
            uint256 leftover = remaining * rData.rewardRate;
            rData.rewardRate = (_reward + leftover) / REWARDS_DURATION;
        }

        rData.lastUpdateTime = uint128(block.timestamp);
        rData.periodFinish = uint128(block.timestamp + REWARDS_DURATION);
    }

    /**
     * @notice Transfer ERC20 tokens on this contract to the treasury POD
     * @param _tokenAddress Address of the token
     * @param _tokenAmount Amount to transfer
     */
    function recoverToken(IERC20 _tokenAddress, uint256 _tokenAmount) external onlyOwner {
        require(!isRewardToken[_tokenAddress], "CANNOT_WITHDRAW_REWARD");
        _tokenAddress.safeTransfer(cvgControlTower.treasuryPod(), _tokenAmount);
        emit Recovered(_tokenAddress, _tokenAmount);
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        CLAIM REWARDS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     * @notice Claims all pending rewards for a locking position for a TDE
     * @dev   Anyone can call this function for any position and TDE
     * @param tdeId   TDE ID where to claim the reward
     * @param tokenId Token ID of the position to claim rewards for
     */
    function getReward(uint256 tdeId, uint256 tokenId) external {
        require(lockingManager.unlockingTimestampPerToken(tokenId) < block.timestamp, "TOKEN_TIMELOCKED");
        _getReward(tdeId, tokenId);
    }

    /**
     * @notice Claim all pending rewards for several positions on the same or different TDE
     * @dev Anyone can call this function for a position
     * @param _getRewardsInput List of tokenIds sorted by TDE
     */
    function getRewardMultiple(IYsStreamer.GetRewardInput[] calldata _getRewardsInput) external {
        for (uint256 i; i < _getRewardsInput.length; ) {
            for (uint256 j; j < _getRewardsInput[i].tokenIds.length; ) {
                require(
                    lockingManager.unlockingTimestampPerToken(_getRewardsInput[i].tokenIds[j]) < block.timestamp,
                    "TOKEN_TIMELOCKED"
                );
                _getReward(_getRewardsInput[i].tdeId, _getRewardsInput[i].tokenIds[j]);
                unchecked {
                    ++j;
                }
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Claim all pending rewards for a locking position on a specific TDE
     * @dev Anyone can call this function for any position
     * @param tdeId   TDE ID to claim the rewards for
     * @param tokenId Token ID to claim the rewards for
     */
    function _getReward(uint256 tdeId, uint256 tokenId) internal updateReward(tdeId, tokenId) {
        address tokenOwner = lockingManager.ownerOf(tokenId);
        bool isReward = false;
        for (uint256 i; i < rewardTokens[tdeId].length; ) {
            IERC20 _rewardToken = rewardTokens[tdeId][i];
            uint256 reward = rewards[tdeId][tokenId][_rewardToken];

            if (reward > 0) {
                isReward = true;
                rewards[tdeId][tokenId][_rewardToken] = 0;
                _rewardToken.safeTransfer(tokenOwner, reward);
            }

            unchecked {
                ++i;
            }
        }
        require(isReward, "NO_REWARD_TO_CLAIM");
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                    INTERNALS & VIEW 
   =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     * @notice Fetch the reward amount of a token based on the period
     * @param tdeId        ID of the TDE
     * @param rewardToken Address of the reward token
     * @return Total reward amount of the token
     */
    function _rewardPerToken(uint256 tdeId, IERC20 rewardToken) internal view returns (uint256) {
        uint256 totalSupply = totalSupplyCheckedIn[tdeId];
        if (totalSupply == 0) return rewardData[tdeId][rewardToken].rewardPerTokenStored;

        return
            rewardData[tdeId][rewardToken].rewardPerTokenStored +
            (((_lastTimeRewardApplicable(rewardData[tdeId][rewardToken].periodFinish) -
                rewardData[tdeId][rewardToken].lastUpdateTime) *
                rewardData[tdeId][rewardToken].rewardRate *
                1e18) / totalSupply);
    }

    /**
     * @notice Fetch the amount earned for a position on a TDE
     * @param tdeId        Treasury Distribution Event ID
     * @param tokenId      Token ID of the position
     * @param rewardToken  Address of the reward token
     * @param ysBalance    Amount of ysCvgChecked in for the TDE
     * @return Reward amount to claim for the user
     */
    function _earned(
        uint256 tdeId,
        uint256 tokenId,
        IERC20 rewardToken,
        uint256 ysBalance
    ) internal view returns (uint256) {
        return
            (ysBalance * (_rewardPerToken(tdeId, rewardToken) - userRewardPerTokenPaid[tdeId][tokenId][rewardToken])) /
            1e18 +
            rewards[tdeId][tokenId][rewardToken];
    }

    function _lastTimeRewardApplicable(uint128 _finishTime) internal view returns (uint128) {
        return block.timestamp < _finishTime ? uint128(block.timestamp) : uint128(_finishTime);
    }

    /**
     * @notice Update reward data for every reward tokens for a position
     * @param tdeId   Tde ID
     * @param tokenId Token ID of the position to update
     */
    function _updateReward(uint256 tdeId, uint256 tokenId) internal {
        uint256 userBal = balanceCheckedIn[tdeId][tokenId];
        for (uint256 i; i < rewardTokens[tdeId].length; ) {
            IERC20 token = rewardTokens[tdeId][i];
            rewardData[tdeId][token].rewardPerTokenStored = _rewardPerToken(tdeId, token);
            rewardData[tdeId][token].lastUpdateTime = _lastTimeRewardApplicable(rewardData[tdeId][token].periodFinish);

            if (tokenId != 0) {
                rewards[tdeId][tokenId][token] = _earned(tdeId, tokenId, token, userBal);
                userRewardPerTokenPaid[tdeId][tokenId][token] = rewardData[tdeId][token].rewardPerTokenStored;
            }

            unchecked {
                ++i;
            }
        }
    }

    function lastTimeRewardApplicable(uint256 tdeId, IERC20 _rewardToken) external view returns (uint256) {
        return _lastTimeRewardApplicable(rewardData[tdeId][_rewardToken].periodFinish);
    }

    function rewardPerToken(uint256 tdeId, IERC20 _rewardToken) external view returns (uint256) {
        return _rewardPerToken(tdeId, _rewardToken);
    }

    function getRewardsForDuration(
        uint256 tdeId
    ) external view returns (ICommonStruct.TokenAmount[] memory totalRewards) {
        uint256 length = rewardTokens[tdeId].length;

        totalRewards = new ICommonStruct.TokenAmount[](rewardTokens[tdeId].length);

        for (uint256 i; i < length; ) {
            IERC20 token = rewardTokens[tdeId][i];

            totalRewards[i].token = token;
            totalRewards[i].amount = rewardData[tdeId][token].rewardRate * REWARDS_DURATION;
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Get the claimable amount of all reward tokens for the given position ID and a TDE
     * @param tdeId   TDE ID to retrieve rewards on
     * @param tokenId Token ID of the position to retrieve rewards
     * @return userRewards Array of rewards
     */
    function claimableRewards(
        uint256 tdeId,
        uint256 tokenId
    ) external view returns (ICommonStruct.TokenAmount[] memory userRewards) {
        uint256 userBal = balanceCheckedIn[tdeId][tokenId];

        userRewards = new ICommonStruct.TokenAmount[](rewardTokens[tdeId].length);

        for (uint256 i; i < userRewards.length; ) {
            IERC20 token = rewardTokens[tdeId][i];
            userRewards[i].token = token;
            userRewards[i].amount = _earned(tdeId, tokenId, token, userBal);

            unchecked {
                ++i;
            }
        }

        return userRewards;
    }

    function getActualTde() public view returns (uint256) {
        return 1 + ((cvgRewards.getCycleLocking(block.timestamp) - 1) / 12);
    }
}
