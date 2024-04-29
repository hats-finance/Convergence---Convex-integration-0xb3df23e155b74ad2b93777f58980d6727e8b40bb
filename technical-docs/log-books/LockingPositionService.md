# Locking Service - Log Book

## Toggle Contract Locker

Contract: **LockingPositionService**
Address: [0xc8a6480ed7C7B1C401061f8d96bE7De6f94D3E60](https://etherscan.io/address/0xc8a6480ed7C7B1C401061f8d96bE7De6f94D3E60#code)\
Function: **toggleContractLocker**

**Parameters**
- Contract address

**Note: It is to prevent accumulation of voting power through veCVG on a multisig so a governance attack cannot happen.**

## Toggle Special Locker

Contract: **LockingPositionService**
Address: [0xc8a6480ed7C7B1C401061f8d96bE7De6f94D3E60](https://etherscan.io/address/0xc8a6480ed7C7B1C401061f8d96bE7De6f94D3E60#code)\
Function: **toggleSpecialLocker**

**Parameters**
- Contract address

**Note: Only used on Bond and Lock feature, it returns the minted token to `msg.sender` of the special locker contract
and not on the `msg.sender` of the locking contract.**
