// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface ICurveLp is IERC20Metadata {
    function add_liquidity(uint256[2] memory _amounts, uint256 _min_mint_amount) external returns (uint256);

    function add_liquidity(
        uint256[2] memory _amounts,
        uint256 _min_mint_amount,
        address _receiver
    ) external returns (uint256);

    function N_COINS() external view returns (int128);

    function coins(uint256 index) external view returns (address);

    function calc_token_amount(uint256[2] memory _amounts, bool _is_deposit) external view returns (uint256);

    function get_dy_underlying(int128 i, int128 j, uint256 dx) external view returns (uint256);

    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}
