# Bond - Log Book

## Create Several Bond Orders

Contract: **BondDepository**\
Address: [0xEa3C304fAb04AA459a5E4712e06Eb22Ef3624420](https://etherscan.io/address/0xEa3C304fAb04AA459a5E4712e06Eb22Ef3624420#code)\
Function: **createBond**

**Parameters**
- Bond Parameters (array)

**Bond Parameters**
- **composedFunction**: Type of mathematical function to compute the bond ROI
  - 0 = Square Root
  - 1 = ln
  - 2 = Square
  - 3 = Linear
- **token**: address of the underlying token
- **gamma**: value dividing the ratio between the amount already sold and the theoretical one
  - 250_000 = 0.25 (25%)
- **bondDuration**: total duration of the bond, in seconds
- **isPaused**: determines if a bond is paused (usually must be put on false)
- **scale**: determines the stepping of the bond ROI
  - 5_000 = 0.5%
- **minRoi**: minimum ROI for the bond, discount cannot be less than this value
  - 100_000 = 10%
- **maxRoi**: maximum ROI for the bond, discount cannot be more than this value
  - 100_000 = 10%
- **percentageOneTx**: maximum percentage of CVG that a user can buy in one deposit (transaction)
  - 200 = 20%
- **vestingTerm**: duration of the vesting, in seconds
- **cvgToSell**: maximum amount of CVG that can be bought through this bond
  - Maximum value allowed: 1_200_000 (to the exponential 10**18)
- **startBondTimestamp**: timestamp from which the bond will start, must be in the future

**Parameters Example** (one bond)
```js
[
    {
        composedFunction: 1, // ln
        token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        gamma: 200_000, // 0.20%
        bondDuration: 86_400, // 1 day in seconds
        isPaused: false,
        scale: 5_000, // 0.5%
        minRoi: 25_000, // 2.5%
        maxRoi: 75_000, // 7.5%
        percentageOneTx: 30, // 3%
        vestingTerm: 7_200, // 2 hours in seconds
        cvgToSell: 800_000_000_000_000_000_000_000n, // 800 000 (10**18)
        startBondTimestamp: 1738364400 // (1 February 2025, Midnight)
    },
]
```

## Update Bond Parameters

Contract: **BondDepository**\
Address: [0xEa3C304fAb04AA459a5E4712e06Eb22Ef3624420](https://etherscan.io/address/0xEa3C304fAb04AA459a5E4712e06Eb22Ef3624420#code)\
Function: **updateBondParams**

**Parameters**
- Bond Update Parameters (array)

**Bond Update Parameters**
- **bondId**: ID of the targeted bond to update
- **composedFunction**: Type of mathematical function to compute the bond ROI
  - 0 = Square Root
  - 1 = ln
  - 2 = Square
  - 3 = Linear
- **percentageOneTx**: maximum percentage of CVG that a user can buy in one deposit (transaction)
  - 200 = 20%
- **minRoi**: minimum ROI for the bond, discount cannot be less than this value
  - 100_000 = 10%
- **maxRoi**: maximum ROI for the bond, discount cannot be more than this value
  - 100_000 = 10%

**Update Parameters Example** (one bond update)
```js
[
    {
        bondId: 1,
        composedFunction: 2, // square
        percentageOneTx: 50, // 5%
        minRoi: 30_000, // 3.0%
        maxRoi: 70_000, // 7.0%
    },
]
```

## Toggle Bond Pause

Contract: **BondDepository**\
Address: [0xEa3C304fAb04AA459a5E4712e06Eb22Ef3624420](https://etherscan.io/address/0xEa3C304fAb04AA459a5E4712e06Eb22Ef3624420#code)\
Function: **togglePause**

**Note: Bonds will be toggled one by one, meaning that if a bond ID provided in parameter is already paused, it will then be false**

**Parameters**
- Bond IDs (array)

**Bond IDs Parameters Example**
```js
[1, 2, 3]
```