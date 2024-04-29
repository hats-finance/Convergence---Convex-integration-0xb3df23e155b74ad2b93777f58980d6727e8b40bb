// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ICommonStruct.sol";

contract TestStaking {
    /// @dev defines the information about a CVG cycle
    struct CycleInfo {
        uint256 cvgRewardsAmount;
        uint256 totalStaked;
        bool isCvgProcessed;
        bool isSdtProcessed;
    }

    mapping(uint256 => CycleInfo) public cycleInfo;

    uint256 public stakingCycle = 1;

    function processStakersRewards(uint256 amount) external {
        /// @dev increment cvg cycle
        uint256 _stakingCycle = stakingCycle++;

        /// @dev set next CVG cycle info
        cycleInfo[_stakingCycle].cvgRewardsAmount = amount;
        cycleInfo[_stakingCycle].isCvgProcessed = true;
    }
}
