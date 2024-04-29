// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStkCvxCrvZaps {
    function depositFromCrv(uint256 amount, uint256 minAmountOut, address account) external;
}
