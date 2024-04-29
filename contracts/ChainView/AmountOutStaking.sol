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

interface IStaking {
    enum PoolType {
        DEACTIVATED,
        UNIV2,
        UNIV3,
        CURVE
    }
    struct PoolEthInfo {
        uint24 fee; //UNIV3
        uint256 indexEth; //Curve
        ICurvePool poolCurve; //Curve
        PoolType poolType;
        address token;
    }

    function poolEthInfo() external view returns (PoolEthInfo memory);

    function curvePool() external view returns (ICurvePoolPlain);
}
interface ICurvePool {
    function get_dy(uint256 i, uint256 j, uint256 amount) external view returns (uint256);
}
interface ICurvePoolPlain {
    function get_dy(int128 i, int128 j, uint256 amount) external view returns (uint256);
}
interface IUniv2Router {
    function getAmountsOut(uint256 amount, address[] memory path) external view returns (uint256[] memory);
}
interface IUniv3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

struct AmountOutInfo {
    uint256 amountIn;
    uint256 amountOutOne;
    uint256 amountOutTwo;
}

error AmountOutInfoError(AmountOutInfo);

contract AmountOutStaking {
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    IUniv3Quoter constant UNISWAPV3_QUOTER = IUniv3Quoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);
    IUniv2Router constant UNISWAPV2_ROUTER = IUniv2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    constructor(IStaking _staking, uint256 amountInEth) {
        getAmountOutInfo(_staking, amountInEth);
    }

    function getAmountOutInfo(IStaking _staking, uint256 amountInEth) internal {
        IStaking.PoolEthInfo memory _poolEthInfo = _staking.poolEthInfo();
        uint256 amountOutOne;
        if (_poolEthInfo.poolType == IStaking.PoolType.UNIV2) {
            address[] memory path = new address[](2);
            path[0] = WETH;
            path[1] = _poolEthInfo.token;
            uint256[] memory amounts = UNISWAPV2_ROUTER.getAmountsOut(amountInEth, path);
            amountOutOne = amounts[1];
        } else if (_poolEthInfo.poolType == IStaking.PoolType.UNIV3) {
            amountOutOne = UNISWAPV3_QUOTER.quoteExactInputSingle(
                WETH,
                _poolEthInfo.token,
                _poolEthInfo.fee,
                amountInEth,
                0
            );
        } else if (_poolEthInfo.poolType == IStaking.PoolType.CURVE) {
            (uint256 tokenInIndex, uint256 tokenOutIndex) = _poolEthInfo.indexEth == 0 ? (0, 1) : (1, 0);
            amountOutOne = _poolEthInfo.poolCurve.get_dy(tokenInIndex, tokenOutIndex, amountInEth);
        }

        revert AmountOutInfoError(
            AmountOutInfo({
                amountIn: amountInEth,
                amountOutOne: amountOutOne,
                amountOutTwo: _staking.curvePool().get_dy(0, 1, amountOutOne)
            })
        );
    }
}
