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
import "../interfaces/IYsStreamer.sol";

struct YsAprInfos {
    uint256 totalYsCheckedIn;
    ICommonStruct.TokenAmount[] totalRewardForDuration;
}

error YsAprError(YsAprInfos infos);

contract AprYsCvgChainview {
    ILockingPositionService constant lockingService =
        ILockingPositionService(0xc8a6480ed7C7B1C401061f8d96bE7De6f94D3E60);
    ILockingPositionManager constant lockingManager =
        ILockingPositionManager(0x0EDB88Aa3aa665782121fA2509b382f414A0C0cE);
    IYsStreamer constant ysStreamer = IYsStreamer(0x660A45986E9b8F60C41AadeBD2941724200FBCF8);
    ICvgRewards constant cvgRewards = ICvgRewards(0xa044fd2E8254eC5DE93B15b8B27d005899579109);
    constructor() {
        getInfos();
    }

    function getInfos() internal view {
        uint256 actualCycle = cvgRewards.getCycleLocking(block.timestamp);
        uint256 tdeId = (1 + (actualCycle - 1) / 12);

        revert YsAprError(
            YsAprInfos({
                totalYsCheckedIn: ysStreamer.totalSupplyCheckedIn(tdeId),
                totalRewardForDuration: ysStreamer.getRewardsForDuration(tdeId)
            })
        );
    }
}
