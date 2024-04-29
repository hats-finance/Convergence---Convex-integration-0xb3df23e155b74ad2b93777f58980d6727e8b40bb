// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./ICommonStruct.sol";

interface IYsStreamer is IERC20Metadata {
    struct Reward {
        uint128 lastUpdateTime;
        uint128 periodFinish;
        uint256 rewardRate;
        uint256 rewardPerTokenStored;
    }

    struct AddTokenRewardInput {
        IERC20 token;
        address distributor;
    }

    struct GetRewardInput {
        uint256 tdeId;
        uint256[] tokenIds;
    }

    struct EarnedData {
        IERC20 token;
        uint256 amount;
    }

    struct ClaimableData {
        IERC20 token;
        uint256 claimable;
        uint256 rewardsForPeriod;
    }

    function rewardTokens(uint256 index) external view returns (IERC20);

    function userRewardPerTokenPaid(address account, IERC20 reward) external view returns (uint256);

    function claimableRewards(
        uint256 tdeId,
        uint256 tokenId
    ) external view returns (ICommonStruct.TokenAmount[] memory userRewards);

    function getRewardsForDuration(
        uint256 tdeId
    ) external view returns (ICommonStruct.TokenAmount[] memory totalRewards);

    function balanceCheckedIn(uint256 tdeId, uint256 tokenId) external view returns (uint256);

    function totalSupplyCheckedIn(uint256 tdeId) external view returns (uint256);
    function checkIn(uint256 tokenId) external;

    function checkInFromLocking(uint256 tokenId, uint256 actualCycle) external;
}
