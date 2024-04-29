// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFraxBpStaking {
    // Struct for the stake
    struct LockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 liquidity;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
    }

    function lockedStakesOf(address account) external view returns (LockedStake[] memory);
}
