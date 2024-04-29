# SdtBlackHole - Log Book

## Set Bribe Tokens

Contract: **SdtBlackHole**
Address: [0x21777106355Ba506A31FF7984c0aE5C924deB77f](https://etherscan.io/address/0x21777106355Ba506A31FF7984c0aE5C924deB77f#code)\
Function: **setBribeTokens**

**Parameters**
- Bribe tokens (arrays)

**Bribe tokens parameters**
- **token**: address of the bribe token
- **fee**: percentage to send to the POD treasury as fees
  - 5_000 = 5% (must never exceed 15%)

## Delegate SD Power

Contract: **SdtBlackHole**
Address: [0x21777106355Ba506A31FF7984c0aE5C924deB77f](https://etherscan.io/address/0x21777106355Ba506A31FF7984c0aE5C924deB77f#code)\
Function: **delegateSdPower**

**Parameters**
- Encoded string of the applied delegation
- Delegatee address

## Clear SD Delegatee

Contract: **SdtBlackHole**
Address: [0x21777106355Ba506A31FF7984c0aE5C924deB77f](https://etherscan.io/address/0x21777106355Ba506A31FF7984c0aE5C924deB77f#code)\
Function: **clearDelegate**

**Parameters**
- Encoded string of the current delegation