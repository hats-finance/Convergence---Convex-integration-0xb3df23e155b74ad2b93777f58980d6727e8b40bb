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

struct Notification {
    uint256[] checkInNeeded;
}

error NotificationError(Notification infos);

contract NotificationChainview {
    ILockingPositionService constant lockingService =
        ILockingPositionService(0xc8a6480ed7C7B1C401061f8d96bE7De6f94D3E60);

    ILockingPositionManager constant lockingManager =
        ILockingPositionManager(0x0EDB88Aa3aa665782121fA2509b382f414A0C0cE);

    IYsStreamer constant ysStreamer = IYsStreamer(0x660A45986E9b8F60C41AadeBD2941724200FBCF8);
    constructor(address _wallet) {
        getNotificationInfos(_wallet);
    }

    function getNotificationInfos(address _wallet) internal {
        uint256[] memory tokenIds = lockingManager.getTokenIdsForWallet(_wallet);
        uint256 positionAmount = tokenIds.length;
        uint256[] memory checkInNeeded = new uint256[](positionAmount);
        uint256 counter;
        for (uint256 i; i < positionAmount; ) {
            uint256 tokenId = tokenIds[i];
            try ysStreamer.checkIn(tokenId) {
                checkInNeeded[counter] = tokenId;
                counter++;
            } catch {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    /// @dev this reduces the length of the _rewardsClaimable array not to return some useless 0 at the end
                    mstore(checkInNeeded, sub(mload(checkInNeeded), 1))
                }
            }

            unchecked {
                ++i;
            }
        }

        revert NotificationError(Notification({checkInNeeded: checkInNeeded}));
    }
}
