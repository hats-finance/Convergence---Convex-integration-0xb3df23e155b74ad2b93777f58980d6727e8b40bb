// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./../ICommonStruct.sol";

interface ICvxAssetStakerBuffer {
    struct CvxRewardConfig {
        IERC20 token;
        uint48 processorFees;
        uint48 podFees;
    }

    function pullRewards(address _processor) external returns (ICommonStruct.TokenAmount[] memory);
    function withdraw(address withdrawer, uint256 amount, bool isStakedAsset) external;
    function stakeAllCvxAsset() external;
}
