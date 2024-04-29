# assets to swap from ETH:

## CvgCvxStaking

TOKEN_ADDR_CVX = "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b";
POOL(CVX/ETH curve):0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4 => 11M$ (uint,uint,uint)
POOL(CVX/ETH sushi):0x05767d9EF41dC40689678fFca0608878fb3dE906 => 580k$
TKN:0x3a283d9c08e8b55966afb64c515f5143cf907611

=> CVX => 1 amountOutSwap

## CvgFraxLpStaking(eUSD/FRAXBP)

TOKEN_ADDR_eUSD = "0xA0d69E286B938e21CBf7E51D71F6A4c8918f482F";
POOL(eUSD/USDC v3):0xa32Dd852cB08e75b53B3e0de87c70B92a49F02B7

TOKEN_ADDR_FRAX = "0x853d955aCEf822Db058eb8505911ED77F175b99e";
POOL(FRAX/USDC v3): 0x853d955aCEf822Db058eb8505911ED77F175b99e

TOKEN_ADDR_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
POOL(USDC/WETH v3):0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640

- swap all ETH into USDC
- swap 1/3 USDC into FRAX
- swap 1/3 USDC into eUSD

=> 3 amountOutSwap + 2 amountOutLp for eUSD + frax + udsc

POOL:

=> 2 amountOutSwap + 1 amountOutLp for eUSD + fraxbp

## CvxCrvStaking

TOKEN_ADDR_CRV = "0xD533a949740bb3306d119CC777fa900bA034cd52";
POOL(triCRV curve):0x4ebdf703948ddcea3b11f675b4d1fba9d2414a14 (uint,uint,uint)
POOL(CRV/WETH v3):0x919Fa96e88d67499339577Fa202345436bcDaf79 1.9M$

=> Crv => 1 amountOutSwap

## CvxFpis

TOKEN_ADDR_FPIS = "0xc2544A32872A91F4A553b404C6950e89De901fdb";
POOL(FPIS/WETH v3): 0xb2db69D6986FBF38de781ba606923F8aE8D7f437 907k$

=> CvxFpis => 1 amountOutSwap

## CvxFxn

TOKEN_ADDR_FXN = "0x365AccFCa291e7D3914637ABf1F7635dB165Bb09";
POOL(FXN/ETH curve):0xc15f285679a1ef2d25f53d4cbd0265e1d02f2a92 4.74M$ (uint,uint,uint)
TKN:0xe06a65e09ae18096b99770a809ba175fa05960e2

=> CvxFxn => 1 amountOutSwap

## CvxFxs

TOKEN_ADDR_FXS = "0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0";
POOL(FXS/ETH Curve): 0xCD8286b48936cDAC20518247dBD310ab681A9fBf (???)
POOL(FXS/ETH v3):0xCD8286b48936cDAC20518247dBD310ab681A9fBf 1.1M$

=> CvxFxs => 1 amountOutSwap

## CvxPrisma

TOKEN_ADDR_PRISMA = "0xda47862a83dac0c112ba89c6abc2159b95afd71c";
POOL(PRISMA/ETH curve):0x322135dd9cbae8afa84727d9ae1434b5b3eba44b (uint,uint,uint)

=> CvxPrisma => 1 amountOutSwap

# Function swap

## Univ2

export const UNISWAPV2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

```
const amount = parseEther("1");
const amountOut = await univ2Router.getAmountsOut(amount, [WETH_ADDRESS, PEPE_ADDRESS]);
// console.log("out", amountOut);
const tx = await univ2Router.swapExactETHForTokens(
    amountOut[1],
    [WETH_ADDRESS, PEPE_ADDRESS],
    await owner.getAddress(),
    (await time.latest()) + 10000,
    {value: amount}
); // 127_935 gas
```

## Univ3

export const UNISWAPV3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
export const QUOTER_CONTRACT_ADDRESS = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

```
const amount = parseEther("1");
const amountOut = await univ3Quoter.quoteExactInputSingle.staticCall(WETH_ADDRESS, GPT_ADDRESS, 10000, amount, 0);
const params = {
    tokenIn: WETH_ADDRESS,
    tokenOut: GPT_ADDRESS,
    fee: 10000,
    recipient: await owner.getAddress(),
    deadline: (await time.latest()) + 10000,
    amountIn: amount,
    amountOutMinimum: amountOut,
    sqrtPriceLimitX96: 0,
};
const tx = await univ3Router.exactInputSingle(params, {value: amount}); //130_000 gas
```

## Curve

export const ADDRESS_POOL:
const amount = parseEther("1");
def exchange(i: uint256, j: uint256, dx: uint256, min_dy: uint256, use_eth: bool = False) -> uint256:

const tokenInIndex = WETH (i)
const tokenOutIndex = TOKEN (j)
const amountIn = amount (dx)
const amountOut = amountOut (min_dy)

const amountOut = await ADDRESS_POOL.get_dy(tokenInIndex,tokenOutIndex,amountIn)
const tx = await ADDRESS_POOL.exchange(tokenInIndex,tokenOutIndex,amountIn,amountOut,true,{value:amountIn});
