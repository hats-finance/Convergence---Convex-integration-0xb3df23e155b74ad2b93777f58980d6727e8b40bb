# CvgCvxStakingService

## Description

This contract is in charge of registering deposits and withdraws of staking position. It inherits from the `StakingServiceBase` which implements all the staking logic.
Staking positions are represented by a unique NFT.

Any user can own a staking position by depositing `ETH`, `CVX` or `cvgCVX`. Reducing the entry barrier.

### Note

Votes must be disabled during the first cycle of deployment to prevent the burning of inflation as 0 token will be staked fully during 1 cycle on the first cycle. Also, processing CVX rewards is not enabled at the first cvgCycle of the deployment.

## depositEth

It issues an NFT **Staking Position** or increase the staked amount on an already existing one.
User deposits ETH on the contract, which are automatically swapped to `CVX` and then staked.
The main process is written inside the internal `_deposit` function which is detailed below.

```mermaid
sequenceDiagram
    actor User
    User->>CvgCvxStakingService: depositEth
    CvgCvxStakingService->>StakingServiceBase: _depositEth
    CvgCvxStakingService->>CvgCvxStakingService: _deposit
```

## deposit

It issues an NFT **Staking Position** or increase the staked amount on an already existing one.
User has the ability to choose which token to deposit between these two:

- cvgCVX
- CVX

```mermaid
sequenceDiagram
    actor User
    User->>CvgCvxStakingService: deposit
    CvgCvxStakingService->>CvgCvxStakingService: _deposit
```

## withdraw

- Removing rewards before the end of a cycle leads to the loss of all rewards accumulated during this cycle.
- Withdrawing always removes first from the staked asset deposited on the same cycle (pending staked) then on the staked amount eligible to rewards (on the current cycle).

```mermaid
sequenceDiagram
    actor User
    User->>CvgCvxStakingService: withdraw
    note over CvgCvxStakingService: Check WITHDRAW_LTE_0
    CvgCvxStakingService->>StakingServiceBase: _updateAmountStakedWithdraw
    CvgCvxStakingService->>CvxConvergenceLocker: withdraw
```

## \_depositEth

Internal function covering the swap of `ETH` to `CVX`.

```mermaid
sequenceDiagram
    note over CvgCvxStakingService: Check DEPOSIT_PAUSED

    alt poolType == UNIV2
        CvgCvxStakingService->>UniswapV2Router: swapExactETHForTokens
    else poolType == UNIV3
        CvgCvxStakingService->>UniswapV3Router: exactInputSingle
    else poolType == CURVE
    CvgCvxStakingService->>curvePool(CVX/ETH): exchange

```

## \_convertCvxToCvgCvx

Internal function covering the convert of `CVX` to `cvgCVX`.

```mermaid
sequenceDiagram
    CvgCvxStakingService->>CvxConvergenceLocker: balanceOf staking contract

    alt isNotEthDeposit
        CvgCvxStakingService->>CVX: transferFrom user to staking
    end

    CvgCvxStakingService->>CvxConvergenceLocker: mintFees to calculate feesAmount

    alt get_dy(amountOut) > cvxAmount * depegPercentage
        note over CvgCvxStakingService: Check INVALID_SLIPPAGE
        CvgCvxStakingService->>curvePool (CVX/cvgCVX): exchange
    else
        CvgCvxStakingService->>CvxConvergenceLocker: mint
    end

```

## \_deposit

Internal function covering the staking logic of `cvgCVX`.

```mermaid
sequenceDiagram
    note over CvgCvxStakingService: Check DEPOSIT_PAUSED


    alt tokenId != 0
        CvgCvxStakingService-->>CvxStakingPositionManager: checkIncreaseDepositCompliance
    else
        CvgCvxStakingService->>CvxStakingPositionManager: mint
    end

    alt cvgCvxAmount != 0
        CvgCvxStakingService->>CvxConvergenceLocker: transferFrom User to CvgCvxStakingService
    end

    alt cvxData.amount != 0
        CvgCvxStakingService->>CvgCvxStakingService: _convertCvxToCvgCvx
    end

    note over CvgCvxStakingService: Check DEPOSIT_LTE_0

    CvgCvxStakingService->>StakingServiceBase: _updateAmountStakedDeposit

```
