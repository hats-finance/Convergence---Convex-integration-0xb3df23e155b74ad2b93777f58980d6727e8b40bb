// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IConvexStaking {
    function getReward(address destination_address) external view returns (uint256[] memory);
}
