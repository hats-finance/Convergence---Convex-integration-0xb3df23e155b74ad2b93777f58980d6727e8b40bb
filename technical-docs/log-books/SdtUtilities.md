# SdtUtilities - Log Book

## Approve Tokens

Contract: **SdtUtilities**\
Address: [0xD861Ff854206d0Db64f1C0f3108f59576A5CCc04](https://etherscan.io/address/0xD861Ff854206d0Db64f1C0f3108f59576A5CCc04#code)\
Function: **approveTokens**

**Parameters**
- Token spenders (array)

**Token spenders parameters**
- **token**: address of the targeted token
- **spender**: address of the spender
- **amount**: amount to be approved for spending

## Set Stable Pools

Contract: **SdtUtilities**\
Address: [0xD861Ff854206d0Db64f1C0f3108f59576A5CCc04](https://etherscan.io/address/0xD861Ff854206d0Db64f1C0f3108f59576A5CCc04#code)\
Function: **setStablePools**

**Parameters**
- Stable Pools data (array)

**Stable Pools parameters**
- **liquidLocker**: address of the liquid locker
- **lp**: address of the Curve pool

## Set Percentage Depeg

Contract: **SdtUtilities**\
Address: [0xD861Ff854206d0Db64f1C0f3108f59576A5CCc04](https://etherscan.io/address/0xD861Ff854206d0Db64f1C0f3108f59576A5CCc04#code)\
Function: **setPercentageDepeg**

**Note: This only concerns `cvgSDT`.**

**Parameters**
- Depeg percentage
  - Must always be greater or equal to 1_000