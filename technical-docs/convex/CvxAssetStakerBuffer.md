# CvxAssetStakerBuffer

## Description

This contracts aims to accumulate and stake all `cvxAsset` received through the associated `CvxAssetStakingService` contract.
It also claims and process rewards for stakers.

## withdraw

Function to withdraw an amount of either `cvxAsset` or `stkCvxAsset`.
It is only callable through the `withdraw` function of the associated staking contract.

```mermaid
sequenceDiagram
    CvxAssetStakingService->>CvxAssetStakerBuffer: withdraw
    note over CvxAssetStakerBuffer: Check NOT_CVX_ASSET_STAKING_SERVICE
    
    alt isStakedAsset
        CvxAssetStakerBuffer->>CvxAssetWrapper: transfer
    else
        CvxAssetStakerBuffer-->>CvxAssetWrapper: balanceOf(CvxAssetStakerBuffer)
        alt actualBalance < amount
            CvxAssetStakerBuffer->>CvxAssetWrapper: withdraw amount difference
        end
        CvxAssetStakerBuffer->>CvxAsset: transfer
    end
```

## pullRewards

Function to process Convex rewards for the previous cycle.
It is only callable by the associated staking contract.

```mermaid
sequenceDiagram
    CvxAssetStakingService->>CvxAssetStakerBuffer: pullRewards
    note over CvxAssetStakerBuffer: Check NOT_CVX_ASSET_STAKING_SERVICE
    
    CvxAssetStakerBuffer->>CvxAssetStakerBuffer: stakeAllCvxAsset
    CvxAssetStakerBuffer->>CvxAsset: getReward
    
    loop over rewardTokens
        CvxAssetStakerBuffer-->>Reward Token: balanceOf(CvxAssetStakerBuffer)
        alt amountToStakers != 0
            CvxAssetStakerBuffer->>Reward Token: safeTransfer rewards to rewardReceiver
        end
        
        alt processorFees != 0
            CvxAssetStakerBuffer->>Reward Token: safeTransfer some fees to processor
        end
        
        alt podFeed != 0
            CvxAssetStakerBuffer->>Reward Token: safeTransfer some fees to treasury POD
        end
    end
```

## stakeAllCvxAsset

Function to stake all pending `cvxAsset` on this contract.
Anyone can call this function.

```mermaid
sequenceDiagram
    actor User
    User->>CvxAssetStakerBuffer: stakeAllCvxAsset
    CvxAssetStakerBuffer-->>CvxAsset: balanceOf(CvxAssetStakerBuffer)
    
    alt balanceCvxAsset != 0
        alt stakingType == 0
            CvxAssetStakerBuffer->>CvxAssetWrapper: stake on behalf
        else
            CvxAssetStakerBuffer->>CvxAssetWrapper: stake
        end
    end
```