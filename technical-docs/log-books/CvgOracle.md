# Oracle - Log Book

## Define Pool Type For Token

Contract: **CvgOracle**
Address: [0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c](https://etherscan.io/address/0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c#code)\
Function: **setPoolTypeForToken**

**Parameters**
- Token address
- Pool type
  - 0 = Not initialized
  - 1 = Stable
  - 2 = Curve Duo
  - 3 = Curve Tri
  - 4 = Uni V3
  - 5 = Uni V2

## Set Stable Pool Params

Contract: **CvgOracle**
Address: [0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c](https://etherscan.io/address/0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c#code)\
Function: **setStableParams**

**Parameters**
- Token address
- Stable Parameters

**Stable Parameters**
- **aggregatorOracle**: address of the oracle aggregator for this pool
- **deltaLimitOracle**: delta, must always be lower or equal to 100%
  - 10_000 = 100%
- **maxLastUpdate**: maximum number of seconds since the last price update for the price to be considered as valid
- **minPrice**: minimum price allowed for the price to be considered as valid
- **maxPrice**: maximum price allowed for the price to be considered as valid

## Set Curve Duo Params

Contract: **CvgOracle**
Address: [0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c](https://etherscan.io/address/0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c#code)\
Function: **setCurveDuoParams**

**Parameters**
- Token address
- Curve Duo Parameters

**Curve Duo Parameters**
- **isReversed**: determines if the price is reversed or not
- **isEthPriceRelated**: determines if the price is related to ETH price (i.e. CRV/ETH)
- **poolAddress**: address of the targeted pool
- **deltaLimitOracle**: delta, must always be lower or equal to 100%
    - 10_000 = 100%
- **maxLastUpdate**: maximum number of seconds since the last price update for the price to be considered as valid
- **minPrice**: minimum price allowed for the price to be considered as valid
- **maxPrice**: maximum price allowed for the price to be considered as valid
- **stablesToCheck**: array of stable address to check the price of

**Curve Duo Parameters Example**
```js
{
    isReversed: false, // not reversed
    isEthPriceRelated: true, // pool price is based on ETH price
    poolAddress: '0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4', // Curve CVX-ETH (crvCVXETH)
    deltaLimitOracle: 200, // 2%
    maxLastUpdate: 86_400_000,
    minPrice: 1_000_000_000_000_000_000n, // 1 ether (1$)
    maxPrice: 10_000_000_000_000_000_000n, // 10 ether (10$)
    stablesToCheck: [] // no stables
}
```

## Set Curve TriPool Params

Contract: **CvgOracle**
Address: [0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c](https://etherscan.io/address/0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c#code)\
Function: **setCurveTriParams**

**Parameters**
- Token address
- Curve Tri Parameters

**Curve Tri Parameters**
- **isReversed**: determines if the price is reversed or not
- **isEthPriceRelated**: determines if the price is related to ETH price (i.e. CRV/ETH)
- **poolAddress**: address of the targeted pool
- **deltaLimitOracle**: delta, must always be lower or equal to 100%
    - 10_000 = 100%
- **maxLastUpdate**: maximum number of seconds since the last price update for the price to be considered as valid
- **k**: index of the price to fetch
  - Must be either 0 or 1
- **minPrice**: minimum price allowed for the price to be considered as valid
- **maxPrice**: maximum price allowed for the price to be considered as valid
- **stablesToCheck**: array of stable address to check the price of

**Curve Tri Parameters Example**
```js
{
    isReversed: false, // not reversed
    isEthPriceRelated: false, // pool price is NOT based on ETH price
    poolAddress: '0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4', // TriCRV (crvUSDETHCRV)
    deltaLimitOracle: 200, // 2%
    maxLastUpdate: 86_400_000,
    k: 1,
    minPrice: 1_000_000_000_000_000_000n, // 1 ether (1$)
    maxPrice: 10_000_000_000_000_000_000n, // 10 ether (10$)
    stablesToCheck: ['0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E'] // crvUSD
}
```

## Set Uniswap V3 Pool Params

Contract: **CvgOracle**
Address: [0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c](https://etherscan.io/address/0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c#code)\
Function: **setUniV3Params**

**Parameters**
- Token address
- Uniswap V3 Parameters

**Uniswap V3 Parameters**
- **isReversed**: determines if the price is reversed or not
- **isEthPriceRelated**: determines if the price is related to ETH price (i.e. CRV/ETH)
- **poolAddress**: address of the targeted pool
- **deltaLimitOracle**: delta, must always be lower or equal to 100%
    - 10_000 = 100%
- **maxLastUpdate**: maximum number of seconds since the last price update for the price to be considered as valid
- **twap**: timestamp from which the time weighted average price mus be computed from
- **aggregatorOracle**: address of the oracle aggregator for this pool
- **minPrice**: minimum price allowed for the price to be considered as valid
- **maxPrice**: maximum price allowed for the price to be considered as valid
- **stablesToCheck**: array of stable address to check the price of

**Uniswap V3 Parameters Example**
```js
{
    isReversed: true, // is reversed
    isEthPriceRelated: false, // pool price is NOT based on ETH price
    poolAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640', // ETH/USDC
    deltaLimitOracle: 1_200, // 12%
    maxLastUpdate: 86_400_000,
    twap: 30,
    aggregatorOracle: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419', // Chainlink ETH/USD
    minPrice: 1_000_000_000_000_000_000n, // 1 ether (1$)
    maxPrice: 10_000_000_000_000_000_000n, // 10 ether (10$)
    stablesToCheck: [] // no stables
}
```

## Set Uniswap V2 Pool Params

Contract: **CvgOracle**
Address: [0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c](https://etherscan.io/address/0x451EA5A1754a2C60FceAeF39518D9E096EB6d16c#code)\
Function: **setUniV2Params**

**Parameters**
- Token address
- Uniswap V2 Parameters

**Uniswap V2 Parameters**
- **isReversed**: determines if the price is reversed or not
- **isEthPriceRelated**: determines if the price is related to ETH price (i.e. CRV/ETH)
- **poolAddress**: address of the targeted pool
- **deltaLimitOracle**: delta, must always be lower or equal to 100%
    - 10_000 = 100%
- **maxLastUpdate**: maximum number of seconds since the last price update for the price to be considered as valid
- **aggregatorOracle**: address of the oracle aggregator for this pool
- **minPrice**: minimum price allowed for the price to be considered as valid
- **maxPrice**: maximum price allowed for the price to be considered as valid
- **stablesToCheck**: array of stable address to check the price of

**Uniswap V2 Parameters Example**
```js
{
    isReversed: true, // is reversed
    isEthPriceRelated: false, // pool price is NOT based on ETH price
    poolAddress: '0x03B59Bd1c8B9F6C265bA0c3421923B93f15036Fa', // FXS/FRAX
    deltaLimitOracle: 1_000, // 10%
    maxLastUpdate: 86_400_000,
    aggregatorOracle: '0x6ebc52c8c1089be9eb3945c4350b68b8e4c2233f', // Chainlink FXS/USD
    minPrice: 1_000_000_000_000_000_000n, // 1 ether (1$)
    maxPrice: 10_000_000_000_000_000_000n, // 10 ether (10$)
    stablesToCheck: [] // no stables
}
```