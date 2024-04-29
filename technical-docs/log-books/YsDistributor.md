# YsDistributor - Log Book

## Set Inflation Ratio

Contract: **YsDistributor**\
Address: [0xf65CA2cc4Ddd0CD85f55b5905f03DfEBcC748d67](https://etherscan.io/address/0xf65CA2cc4Ddd0CD85f55b5905f03DfEBcC748d67#code)\
Function: **depositMultipleToken**

**Parameters**
- Tokens data (array)

**Tokens data parameters**
- **token**: address of the token
- **amount**: deposited amount

**Tokens data parameters example** (one token)
```js
[
    {
        token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        amount: 105_500_000_000_000_000_000n, // 105.5 (to the exponential 10**18)
    }
]
```