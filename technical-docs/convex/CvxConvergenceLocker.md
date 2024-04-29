# CvxConvergenceLocker

## Description

This contract aims to cover 3 features of the Convex integration on Convergence.
First one is the ERC20 integration of our cvgCVX token which acts as a liquid locker of vlCVX, which means that having 1 cvgCVX is the same as having 1 vlCVX.
The advantage of a liquid locker is that it's exchangeable, conversely to the vl token which is not.
An associated stable pool will allow stakers to retrieve their CVX tokens at almost 1:1 ratio depending on the peg of the pool.

The second goal of this contract is to lock the CVX tokens received during the minting of cvgCVX tokens into vlCVX.

Then, it acts as a Buffer to pull rewards earned through locking CVX tokens.
Rewards are these four tokens: CVX, CRV, FXS and cvgCVX coming from these sources:
- Native rewards in CVX
- Bribe rewards coming from the MultiMerkleStash of [Votium](https://votium.app/).

### lockCvx

Anyone is able to call this function.

```mermaid
sequenceDiagram
    actor User
    User->>CvxConvergenceLocker: lockCvx()
    CvxConvergenceLocker->>CvxLocker: Lock pending CVX amount
    CvxConvergenceLocker->>CvxConvergenceLocker: Reset CVX pending amount
```

### pullRewards

This method is called by the cvgCVX staking contract to pull the rewards into the Reward Distributor contract.
This process is encouraged so the user who triggers it through the staking contract receives rewards.

```mermaid
sequenceDiagram
    CvgCvxStaking->>CvxConvergenceLocker: pullRewards(processor)
    note over CvxConvergenceLocker: Check NOT_CVG_CVX_STAKING
    CvxConvergenceLocker->>CvxLocker: Get reward
    CvxConvergenceLocker-->>CVX: Get contract's CVX balance
    CvxConvergenceLocker-->>CRV: Get contract's CRV balance
    CvxConvergenceLocker-->>FXS: Get contract's FXS balance
    CvxConvergenceLocker-->>CvxConvergenceLocker: Get contract's cvgCVX balance
    CvxConvergenceLocker-->>CvgControlTower: Get reward distributor address
    
    alt cvxAmount != 0
        alt processorRewards != 0
            CvxConvergenceLocker->>CVX: Transfer process fees to claimer
        end

        CvxConvergenceLocker->>CVX: Transfer CVX rewards to Reward Distributor
    end

    alt crvAmount != 0
        alt processorRewards != 0
            CvxConvergenceLocker->>CRV: Transfer process fees to claimer
        end

        CvxConvergenceLocker->>CRV: Transfer CRV rewards to Reward Distributor
    end

    alt fxsAmount != 0
        alt processorRewards != 0
            CvxConvergenceLocker->>FXS: Transfer process fees to claimer
        end

        CvxConvergenceLocker->>FXS: Transfer FXS rewards to Reward Distributor
    end

    alt cvgCvxAmount != 0
        alt processorRewards != 0
            CvxConvergenceLocker->>CvxConvergenceLocker: Transfer process fees to claimer
        end

        CvxConvergenceLocker->>CvxConvergenceLocker: Transfer cvgCVX rewards to Reward Distributor
    end
```

### delegate

Delegates the voting power earned through vlCVX tokens to another address.
It will be a multisig owned by Convergence and team members of Convex (TO CONFIRM ?).

Parameter `id` represents the ENS name of the Snapshot we want to delegate to.

```mermaid
sequenceDiagram
    actor Owner
    Owner->>CvxConvergenceLocker: delegate(id, account)
    CvxConvergenceLocker->>CvxDelegateRegistry: Set delegation
```

### clearDelegate

Clears the delegation previously set.

```mermaid
sequenceDiagram
    actor Owner
    Owner->>CvxConvergenceLocker: clearDelegate(id)
    CvxConvergenceLocker->>CvxDelegateRegistry: Clear delegation
```

### mint

Mint cvgCVX tokens.

```mermaid
sequenceDiagram
    actor User
    User->>CvxConvergenceLocker: mint(account, amount, isLock)
    alt isLock == false
        CvxConvergenceLocker->>CVX: transferFrom msg.sender to treasuryDao the fees amount
    end
    CvxConvergenceLocker->>CVX: transferFrom msg.sender to the Convergence Locker contract the amount of CVX
    alt isLock == true
        CvxConvergenceLocker->>CvxConvergenceLocker: lockCvx()
    end
    CvxConvergenceLocker->>CvxConvergenceLocker: mint the same amount of cvgCVX to the account
```

### burn

```mermaid
sequenceDiagram
    actor User
    User->>CvxConvergenceLocker: burn(amount)
    CvxConvergenceLocker->>CvxConvergenceLocker: burn the amount on the User
```

### sendTokens

Method used to transfer multiple tokens on the contract to a receiver.
Tokens must not be CVX, CRV, FXS nor cvgCVX for fairness because these are reward tokens.

```mermaid
sequenceDiagram
    actor Owner
    Owner->>CvxConvergenceLocker: sendTokens(tokens,amounts,receiver)
    note over CvxConvergenceLocker: Check LENGTH_MISMATCH
    
    loop tokens
        note over CvxConvergenceLocker: Check CVX_CANNOT_BE_TRANSFERRED
        note over CvxConvergenceLocker: Check CRV_CANNOT_BE_TRANSFERRED
        note over CvxConvergenceLocker: Check FXS_CANNOT_BE_TRANSFERRED
        note over CvxConvergenceLocker: Check CVGCVX_CANNOT_BE_TRANSFERRED

        CvxConvergenceLocker->>Token: transfer the amount to receiver
    end
```

### setMintFees

This function sets a new fees amount when users mint cvgCVX without locking their CVX.
The maximum fees amount is 2% (200).
It is only callable by the Treasury DAO multisig.

```mermaid
sequenceDiagram
    actor Owner
    Owner->>CvxConvergenceLocker: setMintFees(fees)
    note over CvxConvergenceLocker: Check FEES_TOO_BIG
    CvxConvergenceLocker->>CvxConvergenceLocker: set mint fees
```

### setProcessorRewardsPercentage

This function sets the percentage of rewards to send to the address who processed the rewards as an incentive.
The maximum amount is 3% (3000).
It is only callable by the Treasury DAO multisig.

```mermaid
sequenceDiagram
    actor Owner
    Owner->>CvxConvergenceLocker: setProcessorRewardsPercentage(percentage)
    note over CvxConvergenceLocker: Check PERCENTAGE_TOO_HIGH
    CvxConvergenceLocker->>CvxConvergenceLocker: set processe rewards percentage
```