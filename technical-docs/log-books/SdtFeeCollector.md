# SdtFeeCollector - Log Book

## Set Root Fees

Contract: **SdtFeeCollector**\
Address: [0x15cbdf343fA37cD555D8F8CdeaA3948c1f0C42aE](https://etherscan.io/address/0x15cbdf343fA37cD555D8F8CdeaA3948c1f0C42aE#code)\
Function: **setUpRootFees**

**Note: This is the percentage representing the fees taken when pulling `SDT` rewards from `SdtBuffer`.**

**Parameters**
- Root fees
  - 10_000 = 10% (must never exceed 20%)

## Set Fees Repartition

Contract: **SdtFeeCollector**\
Address: [0x15cbdf343fA37cD555D8F8CdeaA3948c1f0C42aE](https://etherscan.io/address/0x15cbdf343fA37cD555D8F8CdeaA3948c1f0C42aE#code)\
Function: **setUpFeesRepartition**

**Note: The sum of all `feePercentage` must be equal to 100_000 (100%)**

**Parameters**
- Fees repartition (array)

**Fees repartition parameters**
- **receiver**: address of the receiver
- **feePercentage**: percentage