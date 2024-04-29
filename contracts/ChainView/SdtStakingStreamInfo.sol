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

import "../interfaces/ICvgControlTower.sol";
/**
 * @dev Structure for each staking rows.
 **/
    struct SdtStreamInfo {
        address stakingContract;
        string stakingName;
        uint256 streamFinish;
        bool isSdtProcessed;
    }

    error SdtStakingStreamInfoErr(SdtStreamInfo[] info);


contract SdtStakingStreamInfo {

    /// @dev Convergence ecosystem address
    ICvgControlTower constant cvgControlTower = ICvgControlTower(0xB0Afc8363b8F36E0ccE5D54251e20720FfaeaeE7);
    // @dev  Specific token by staking
    mapping(address => address) private streamRewards;
    // @dev TOKEN_ADDR_CRV
    address defaultReward = 0xD533a949740bb3306d119CC777fa900bA034cd52;

    constructor(ISdtStakingPositionService[] memory sdtStakings) {
        // @dev  ANGLE_STAKING =>TOKEN_ADDR_ANGLE
        streamRewards[0x097EcA928C08DfE0F89B18A22E20EBF85Df2Cb01] = 0x31429d1856aD1377A8A0079410B297e1a9e214c2;
        // @dev  FXN_STAKING =>TOKEN_ADDR_wstETH
        streamRewards[0x35e30Bc815935Bb5EC1743f772331864D780cc26] = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
        // @dev  FXS_STAKING => TOKEN_ADDR_FXS
        streamRewards[0x3C1729DdbF9d83eF2a3bfAb5aE31e046972879FD] = 0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0;
        // @dev  PENDLE_STAKING =>TOKEN_ADDR_WETH
        streamRewards[0x508f0E1b565b40AeB94671BeD228083203330882] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
        // @dev  BAL_STAKING =>TOKEN_ADDR_BAL
        streamRewards[0xAf5b3f4A0b4dc334dB7137E5584E0e971E5e4962] = 0xba100000625a3754423978a60c9317c58a424e3D;
        // @dev  YFI_STAKING =>TOKEN_ADDR_YFI
         //streamRewards[0xd59DbaEC7CB197364E2d8E94A828a3e25276A236] =0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e ;
        // @dev  APW_STAKING =>TOKEN_ADDR_APW
        //streamRewards[0x5602145583518421326ec8b9278C5ac188a58071] =0x4104b135DBC9609Fc1A9490E61369036497660c8 ;
        processInfo(sdtStakings);
    }

    function processInfo(ISdtStakingPositionService[] memory sdtStakings) internal view {
        uint256 lastCycleId = cvgControlTower.cvgCycle() - 1;

        SdtStreamInfo[] memory data = new SdtStreamInfo[](sdtStakings.length);

        /// @dev iterates on each staking contract
        for (uint256 i; i < sdtStakings.length;) {
            ISdtStakingPositionService stakingService = sdtStakings[i];
            ISdAssetGauge gaugeContract = stakingService.stakingAsset();

            address rewardToken = streamRewards[address(stakingService)];
            if (rewardToken == address(0))
                rewardToken = defaultReward;

            data[i] = SdtStreamInfo({
                stakingContract: address(stakingService),
                stakingName: gaugeContract.name(),
                isSdtProcessed: stakingService.cycleInfo(lastCycleId).isSdtProcessed,
                streamFinish: gaugeContract.reward_data(rewardToken).period_finish
            });
            unchecked {
                ++i;
            }
        }
        revert SdtStakingStreamInfoErr(data);
    }
}