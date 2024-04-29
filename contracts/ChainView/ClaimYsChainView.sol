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

struct ClaimYsInfos {
    uint256 tdeId;
    uint256 totalYsCheckedIn;
    ICommonStruct.TokenAmount[] totalRewardForDuration;
    ClaimYsPerToken[] claimYsTokenInfos;
}

struct ClaimYsPerToken {
    uint256 tokenId;
    uint256 ysCheckedIn;
    ICommonStruct.TokenAmount[] claimableTokens;
}

error ClaimYsInfosError(ClaimYsInfos[] infos);

contract ClaimYsChainView {
    ILockingPositionService constant lockingService =
        ILockingPositionService(0xc8a6480ed7C7B1C401061f8d96bE7De6f94D3E60);
    ILockingPositionManager constant lockingManager =
        ILockingPositionManager(0x0EDB88Aa3aa665782121fA2509b382f414A0C0cE);
    IYsStreamer constant ysStreamer = IYsStreamer(0x660A45986E9b8F60C41AadeBD2941724200FBCF8);
    constructor(uint256[] memory _tdeIds, address _wallet) {
        getInfos(_tdeIds, _wallet);
    }

    function getInfos(uint256[] memory _tdeIds, address _wallet) internal view {
        uint256[] memory tokenIds = lockingManager.getTokenIdsForWallet(_wallet);
        uint256 tdeAmount = _tdeIds.length;
        uint256 positionAmount = tokenIds.length;
        ClaimYsInfos[] memory ysClaimInfos = new ClaimYsInfos[](tdeAmount);
        for (uint256 i; i < tdeAmount; ) {
            uint256 tdeId = _tdeIds[i];
            ysClaimInfos[i].tdeId = tdeId;
            ysClaimInfos[i].totalYsCheckedIn = ysStreamer.totalSupplyCheckedIn(tdeId);
            ysClaimInfos[i].totalRewardForDuration = ysStreamer.getRewardsForDuration(tdeId);

            ClaimYsPerToken[] memory ysTokenInfos = new ClaimYsPerToken[](positionAmount);

            for (uint256 j; j < positionAmount; ) {
                uint256 tokenId = tokenIds[j];

                ysTokenInfos[j] = ClaimYsPerToken({
                    tokenId: tokenId,
                    ysCheckedIn: ysStreamer.balanceCheckedIn(tdeId, tokenId),
                    claimableTokens: ysStreamer.claimableRewards(tdeId, tokenId)
                });
                unchecked {
                    ++j;
                }
            }
            ysClaimInfos[i].claimYsTokenInfos = ysTokenInfos;

            unchecked {
                ++i;
            }
        }

        revert ClaimYsInfosError(ysClaimInfos);
    }
}
