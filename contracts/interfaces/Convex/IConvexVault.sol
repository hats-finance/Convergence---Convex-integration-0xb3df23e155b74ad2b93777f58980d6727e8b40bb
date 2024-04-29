// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IConvexVault {
    function lockAdditionalConvexToken(bytes32 _kek_id, uint256 _addl_liq) external;

    function lockAdditionalCurveLp(bytes32 _kek_id, uint256 _addl_liq) external;

    function lockAdditional(bytes32 _kek_id, uint256 _addl_liq) external;

    function lockLonger(bytes32 _kek_id, uint256 new_ending_ts) external;

    function getReward() external;

    function getReward(bool _claim) external;

    function stakeLockedCurveLp(uint256 _liquidity, uint256 _secs) external returns (bytes32 kek_id);

    function stakingAddress() external view returns (address);

    function stakingToken() external view returns (address);
}
