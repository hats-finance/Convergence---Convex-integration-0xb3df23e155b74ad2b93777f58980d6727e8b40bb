# CvxStakingPositionManager

## Description

This contract is a `CvgERC721TimeLockingUpgradeable` contract.

The first motivation of this contract is to externalize the NFT logic from the `CvxStakingPositionService` in order to get space in the size of the contract :

- Tokenize a Staking Position through a transferable NFT.
- All minted positions are linked to a `CvxStakingPositionService`.

## mint

- Mints a Staking Position to the Staking depositor
- This function is only callable by a Convex `StakingService` contract during the _deposit_.

```mermaid
sequenceDiagram
    CvxStakingPositionService->>CvxStakingPositionManager: mint
    note over CvxStakingPositionManager: Check NOT_CVX_STAKING
    CvxStakingPositionManager->>CvxStakingPositionManager: Associate the token Id to mint with the staking contract
    CvxStakingPositionManager->>CvxStakingPositionManager: Mints the token ID to the user
```

## burn

- Burn the staking position only if the staked amount is equal to 0.

```mermaid
sequenceDiagram
    actor User
    User->>CvxStakingPositionManager: burn
    CvxStakingPositionManager-->>CvxStakingPositionService: Fetches the amount staked on the position
    note over CvxStakingPositionManager: Verify that the amount staked is 0
    CvxStakingPositionManager->>CvxStakingPositionManager: Burns the Staking position
```