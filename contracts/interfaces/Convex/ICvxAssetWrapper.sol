// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
interface ICvxAssetWrapper is IERC20 {
    function stake(uint256 amount, address to) external;

    function stake(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function setRewardWeight(uint256 weight) external;

    function getReward(address account) external;
}
