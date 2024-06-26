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

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../libs/Base64.sol";
import "../libs/DateTime.sol";
import "../interfaces/ICvgControlTower.sol";

contract BondLogo is Ownable2StepUpgradeable {
    ICvgControlTower internal cvgControlTower;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(ICvgControlTower _cvgControlTower) external initializer {
        cvgControlTower = _cvgControlTower;
        address _treasuryDao = _cvgControlTower.treasuryDao();
        require(_treasuryDao != address(0), "TREASURY_DAO_ZERO");
        _transferOwnership(_treasuryDao);
    }

    /// @dev Inspired by OraclizeAPI's implementation - MIT license
    ///      https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _getLockInfos(
        IBondLogo.LogoInfos memory logoInfos
    )
        internal
        view
        returns (uint256 year, uint256 month, uint256 day, uint256 hoursLock, uint256 cvgPrice, bool isLocked)
    {
        cvgPrice = cvgControlTower.cvgOracle().getPriceUnverified(address(cvgControlTower.cvgToken()));
        if (logoInfos.unlockingTimestamp > block.timestamp) {
            hoursLock = (logoInfos.unlockingTimestamp - block.timestamp) / 3600;
            isLocked = true;
        }
        if (logoInfos.termTimestamp > 0) {
            (year, month, day) = DateTime.timestampToDate(logoInfos.termTimestamp);
        }
    }

    function getLogoInfo(uint256 tokenId) external view returns (IBondLogo.LogoInfosFull memory) {
        IBondLogo.LogoInfos memory _logoInfo = cvgControlTower.bondPositionManager().logoInfo(tokenId);
        (uint256 year, uint256 month, uint256 day, uint256 hoursLock, uint256 cvgPrice, bool isLocked) = _getLockInfos(
            _logoInfo
        );
        return (
            IBondLogo.LogoInfosFull({
                tokenId: _logoInfo.tokenId,
                termTimestamp: _logoInfo.termTimestamp,
                pending: _logoInfo.pending,
                cvgClaimable: _logoInfo.cvgClaimable,
                unlockingTimestamp: _logoInfo.unlockingTimestamp,
                year: year,
                month: month,
                day: day,
                isLocked: isLocked,
                hoursLock: hoursLock,
                cvgPrice: cvgPrice
            })
        );
    }

    function _tokenURI(IBondLogo.LogoInfos memory logoInfos) external view returns (string memory output) {
        (uint256 year, uint256 month, uint256 day, uint256 hoursLock, uint256 cvgPrice, bool isLocked) = _getLockInfos(
            logoInfos
        );
        //BASE
        output = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><path fill="#00f" d="M0 0h800v1000H0z"/><path stroke="#fff" stroke-miterlimit="10" stroke-width="5" d="M26 26h748v948H26z"/><path fill="none" stroke="#fff" stroke-miterlimit="10" stroke-width="5" d="M41 41.3h718V959H41z"/><path fill="#fff" fill-rule="evenodd" d="M717.9 347v43.8L701.7 406H82.1v-59h635.8zm0 203.6v43.8l-16.2 15.2H82.1v-59h635.8zm0 105.5v43.8l-16.2 15.2H82.1v-59h635.8z"/><path fill="#00f" d="m711.1 846.6-27.2 47.5-6.8-11.9 13.6-23.7h-54.3l6.8-11.9h67.9z"/><path fill="#ff0" d="m717.9 858.5-34 59.4-27.1-47.5h13.6l13.5 23.7 27.2-47.5 6.8 11.9z"/><path fill="red" d="m656.8 870.4 27.1 47.5h-13.5l-34-59.4h54.3l-6.8 11.9h-27.1z"/><path fill="none" stroke="#fff" stroke-miterlimit="11.3" stroke-width="2" d="M601 82.4h117.4l-.5 219.6M199 917.9l-116.4.3V766"/><path fill="#fff" fill-rule="evenodd" d="M717.9 448.8v43.8l-16.2 15.2H82.1v-59h635.8z"/><path fill="#fff" d="M117.2 765.9H199v116.5h-81.8z"/><text x="87%" y="22%" text-anchor="end" font-size="60" fill="#fff" font-family="andale mono, monospace">BOND         CVG</text><text transform="translate(98.3 388.1)" font-weight="bold" font-size="35" font-family="andale mono, monospace">ID</text><text transform="translate(98.3 591.8)" font-weight="bold" font-size="35" font-family="andale mono, monospace">Pending</text><text transform="translate(98.3 697.3)" font-weight="bold" font-size="35" font-family="andale mono, monospace">Claimable</text><text transform="translate(98.3 490)" font-weight="bold" font-size="35" font-family="andale mono, monospace">Term</text><path fill="#00f" d="m269.2 99.2-66.5 116.3-16.6-29.1 33.2-58.1H86.4L103 99.2h166.2z"/><path fill="#ff0" d="m285.8 128.3-83.1 145.4-66.4-116.3h33.2l33.2 58.1 66.5-116.3 16.6 29.1z"/><path fill="#fe0000" d="m136.3 157.4 66.4 116.3h-33.2L86.4 128.3h132.9l-16.6 29.1h-66.4z"/>';

        //ID
        output = string(
            abi.encodePacked(
                output,
                '<text x="87%" y="39%" text-anchor="end" font-size="35" font-family="andale mono, monospace">',
                _toString(logoInfos.tokenId),
                "</text>"
            )
        );
        //TERM
        if (logoInfos.termTimestamp > 0) {
            output = string(
                abi.encodePacked(
                    output,
                    '<text x="87%" y="49%" text-anchor="end" font-size="35" font-family="andale mono, monospace">',
                    _toString(month),
                    "/",
                    _toString(day),
                    "/",
                    _toString(year),
                    "</text>"
                )
            );
        } else {
            output = string(
                abi.encodePacked(
                    output,
                    '<text x="87%" y="49%" text-anchor="end" font-size="35" font-family="andale mono, monospace">Fully Vested</text>'
                )
            );
        }

        //PENDING
        output = string(
            abi.encodePacked(
                output,
                '<text x="87%" y="59%" text-anchor="end" font-size="35" font-family="andale mono, monospace">',
                _toString(logoInfos.pending / 10 ** 18),
                " CVG($",
                _toString(((logoInfos.pending) * cvgPrice) / 10 ** 36),
                ")</text>"
            )
        );

        //CLAIMABLE
        output = string(
            abi.encodePacked(
                output,
                '<text x="87%" y="70%" text-anchor="end" font-size="35" font-family="andale mono, monospace">',
                _toString(logoInfos.cvgClaimable / 10 ** 18),
                " CVG($",
                _toString((logoInfos.cvgClaimable * cvgPrice) / 10 ** 36),
                ")</text>"
            )
        );

        //LOCK
        if (isLocked) {
            //PADLOCK CLOSED GREEN
            output = string(
                abi.encodePacked(
                    output,
                    '<path fill="#00FF00" d="M178.18,800.32V790.23h-5V780.14H163.05v-5H153v5H142.86v10.09h-5v10.09h-5v35.32h50.46V800.32ZM163.05,820.5h-2.53v5h-5v-5H153v-7.56h10.1Zm5-20.18H147.91V790.23h5v-5h10.1v5h5Z" />'
                )
            );
            output = string(
                abi.encodePacked(
                    output,
                    '<text x="19.9%" y="87%" text-anchor="middle" font-size="23" font-family="andale mono, monospace">&lt;',
                    _toString(hoursLock + 1),
                    " h</text></svg>"
                )
            );
        } else {
            // PADLOCK OPEN RED
            output = string(
                abi.encodePacked(
                    output,
                    '<path fill="#FF0000" d="M147.92,800.32V790.23h5v-5h10.1v5h10.09V780.14H163.05v-5H153v5H142.87v10.09h-5v10.09h-5.05v35.32h50.44V800.32Zm15.13,20.18h-2.52v5h-5.06v-5H153v-7.56h10.1Z" />'
                )
            );
            output = string(
                abi.encodePacked(
                    output,
                    '<text x="19.9%" y="87%" text-anchor="middle" font-size="23" font-family="andale mono, monospace">-</text></svg>'
                )
            );
        }

        // ATTRIBUTES
        string memory attributes = string(
            abi.encodePacked(
                '{"display_type": "date", "trait_type": "Term", "value": "',
                _toString(logoInfos.termTimestamp),
                '"},{"trait_type": "Claimable", "value": "',
                (logoInfos.cvgClaimable / 10 ** 18 > 0 ? "Yes" : "No"),
                '"},{"trait_type": "Locked", "value": "',
                (isLocked ? "Yes" : "No"),
                '"}'
            )
        );

        // METADATA
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Bond Position #',
                        _toString(logoInfos.tokenId),
                        '","description": "Convergence Bond Position Token"',
                        ',"external_url": "https://app.cvg.finance/positions/bond/',
                        _toString(logoInfos.tokenId),
                        '","image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(output)),
                        '","attributes": [',
                        attributes,
                        "]}"
                    )
                )
            )
        );

        output = string(abi.encodePacked("data:application/json;base64,", json));
    }
}
