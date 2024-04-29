# CvxAssetStakingService

## Description

This contract is in charge of registering deposits and withdraws of staking position. It inherits from the `StakingServiceBase` which implements all the staking logic.
Staking positions are represented by a unique NFT.

Any user can own a staking position by depositing ETH, `cvxAsset` or `stkCvxAsset`. Reducing the entry barrier.

### Note

Votes must be disabled during the first cycle of deployment to prevent the burning of inflation as 0 token will be staked fully during 1 cycle on the first cycle. Also, processing CVX rewards is not enabled at the first cvgCycle of the deployment.

## depositEth

It issues an NFT **Staking Position** or increase the staked amount on an already existing one.
User deposits ETH on the contract, which are automatically swapped to `cvxAsset` and then staked.
The main process is written inside the internal `_deposit` function which is detailed below.

```mermaid
sequenceDiagram
    actor User
    User->>CvxAssetStakingService: depositEth
    CvxAssetStakingService->>StakingServiceBase: _depositEth
    CvxAssetStakingService->>CvxAssetStakingService: _deposit
```

## deposit

It issues an NFT **Staking Position** or increase the staked amount on an already existing one.
User has the ability to choose which token to deposit between these three:
- Asset
- cvxAsset
- stkCvxAsset

```mermaid
sequenceDiagram
    actor User
    User->>CvxAssetStakingService: deposit
    CvxAssetStakingService->>CvxAssetStakingService: _deposit
```

## withdraw

- Removing rewards before the end of a cycle leads to the loss of all rewards accumulated during this cycle.
- Withdrawing always removes first from the staked asset deposited on the same cycle (pending staked) then on the staked amount eligible to rewards (on the current cycle).

```mermaid
sequenceDiagram
    actor User
    User->>CvxAssetStakingService: withdraw
    note over CvxAssetStakingService: Check WITHDRAW_LTE_0
    CvxAssetStakingService->>StakingServiceBase: _updateAmountStakedWithdraw
    CvxAssetStakingService->>CvxAssetStakerBuffer: withdraw
```

## _deposit

Internal function covering the staking logic of `cvxAsset`.

```mermaid
sequenceDiagram
    note over CvxAssetStakingService: Check DEPOSIT_PAUSED
    note over CvxAssetStakingService: Check DEPOSIT_LTE_0
    
    alt tokenId != 0
        CvxAssetStakingService-->>CvxStakingPositionManager: checkIncreaseDepositCompliance
    else
        CvxAssetStakingService->>CvxStakingPositionManager: mint
    end
    
    alt TokenType == asset
        CvxAssetStakingService->>CvxAssetStakingService: _mintOrSwapToCvxAsset
    else TokenType == cvxAsset
        CvxAssetStakingService->>CvxAsset: transferFrom user to StakerBuffer
    else
        CvxAssetStakingService->>CvxAssetWrapper: transferFrom user to StakerBuffer
    end

    CvxAssetStakingService->>StakingServiceBase: _updateAmountStakedDeposit
    
    alt isStake
        CvxAssetStakingService->>CvxAssetStakerBuffer: stakeAllCvxAsset
    end
```

## _mintOrSwapToCvxAsset

Internal function to mint or swap `Asset` to `cvxAsset`.

```mermaid
sequenceDiagram
    alt isEthDeposit == false
        CvxAssetStakingService->>Asset: transferFrom user to CvxAssetStakingService
    end
    
    alt minAmountOut != 0
        CvxAssetStakingService-->>CvxAsset: balanceOf(StakerBuffer)
        CvxAssetStakingService->>Curve Pool: exchange
        CvxAssetStakingService-->>CvxAsset: balanceOf(StakerBuffer)
    else
        CvxAssetStakingService-->>CvxAsset: balanceOf(CvxAssetStakingService)
        CvxAssetStakingService->>AssetDepositor: deposit
        CvxAssetStakingService-->>CvxAsset: balanceOf(CvxAssetStakingService)
        CvxAssetStakingService->>CvxAsset: transfer balance to StakerBuffer
    end
```