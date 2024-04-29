// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../ICvgControlTowerV2.sol";

import "../ICommonStruct.sol";

interface IUnderlayingBuffer {
    function pullRewards(address _processor) external returns (ICommonStruct.TokenAmount[] memory);

    function processorRewardsPercentage() external view returns (uint256);
}
