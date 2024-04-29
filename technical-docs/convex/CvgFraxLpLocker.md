# CvgFraxLpLocker

## Description

This contract aims to cover 3 features of the Convex integration on Convergence.
First one is the ERC20 integration of our cvgFraxLp token which acts as a locker of convexFraxLp, which means that having 1 cvgFraxLp is the same as having 1 convexFraxLp.
An associated stable pool will allow stakers to retrieve their convexFraxLp at almost 1:1 ratio depending on the peg of the pool.

The second goal of this contract is to lock the convexFraxLp received during the minting of cvgFraxLp tokens into the associated ConvexVault.

Then, it acts as a Buffer to pull rewards earned through locking convexFraxLp.
Rewards are these three tokens: CVX, CRV, FXS

### depositLp

Callable by anyone or through his cvgFraxLpStaking contract, consist of deposit the fraxLp to get the cvgFraxLp erc20 token used as staked token.

```mermaid
sequenceDiagram
    actor User
    User->>CvgFraxLpLocker: depositLp()
    CvgFraxLpLocker->>CvgFraxLpLocker: _compliance() get the operator and the receiver
    CvgFraxLpLocker->>fraxLp: transferFrom operator to this contract
    alt isLock == true
        CvgFraxLpLocker->>cvgConvexVault: lockAdditionalCurveLp lock the fraxLp into the cvgConvexVault
    end
    CvgFraxLpLocker->>CvgFraxLpLocker: _mint() to receiver
```

### depositLpAssets

Callable by anyone or through his cvgFraxLpStaking contract, consist of deposit the fraxLP assets (asset+fraxBP) to get the cvgFraxLp erc20 token used as staked token.

```mermaid
sequenceDiagram
    actor User
    User->>CvgFraxLpLocker: depositLpAssets()
    CvgFraxLpLocker->>CvgFraxLpLocker: _compliance() get the operator and the receiver
    loop tokens
        CvgFraxLpLocker->>token: transferFrom operator to this contract
        alt isLock == false
            CvgFraxLpLocker->>CvgFraxLpLocker: take a fee from the amount deposited
        end
    end
    CvgFraxLpLocker->>fraxLP: add_liquidity to get fraxLP minted to this contract
    alt isLock == true
        CvgFraxLpLocker->>cvgConvexVault: lockAdditionalCurveLp lock the fraxLP into the cvgConvexVault
    end
    CvgFraxLpLocker->>CvgFraxLpLocker: _mint() to receiver
```

### depositLpAssets

Callable by anyone or through its cvgFraxLpStaking contract, consists of depositing the fraxLP assets (asset+frax+usdc) to get the cvgFraxLp erc20 token used as staked token.

```mermaid
sequenceDiagram
    actor User
    User->>CvgFraxLpLocker: depositLpAssets()
    CvgFraxLpLocker->>CvgFraxLpLocker: _compliance() get the operator and the receiver
    alt asset > 0
        CvgFraxLpLocker->>asset: transferFrom operator to this contract
    end
    alt frax > 0
        CvgFraxLpLocker->>frax: transferFrom operator to this contract
    end
    alt usdc > 0
        CvgFraxLpLocker->>usdc: transferFrom operator to this contract
    end
    alt isLock == false
        CvgFraxLpLocker->>CvgFraxLpLocker: take a fee from the amount deposited on each assets
    end
    CvgFraxLpLocker->>fraxLp: add_liquidity to get fraxBP minted to this contract
    CvgFraxLpLocker->>fraxLp: add_liquidity to get fraxLP minted to this contract
    alt isLock == true
        CvgFraxLpLocker->>cvgConvexVault: lockAdditionalCurveLp lock the fraxLP into the cvgConvexVault
    end
    CvgFraxLpLocker->>CvgFraxLpLocker: _mint() to receiver
```

### increaseLock

Callable by anyone, consists to lock the pending fraxLP on the contract, from users that didn't locked directly.
The processor of this function will be rewarded by the pending fees (asset+fraxBP+frax+usdc) earned from others users.

```mermaid
sequenceDiagram
    actor User
    User->>increaseLock
    CvgFraxLpLocker->>fraxLp: balanceOf this contract
    note over CvgFraxLpLocker: Check NO_PENDING_LP
    CvgFraxLpLocker->>cvgConvexVault: lockAdditionalCurveLp lock the pending fraxLP into the cvgConvexVault
    CvgFraxLpLocker->>cvgConvexVault: lockLonger lock max time the staking position of this contract
    loop assets
        CvgFraxLpLocker->>asset: balanceOf this contract
        alt asset > 0
            CvgFraxLpLocker->>asset: transfer to msg.sender
        end
    end

    loop assetsUnderlying
        CvgFraxLpLocker->>assetUnderlying: balanceOf this contract
        alt asset > 0
            CvgFraxLpLocker->>assetUnderlying: transfer to msg.sender
        end
    end
```

### pullRewards

This method is called by the CvgFraxLp staking contract to pull the rewards into the Reward Distributor contract.
This process is encouraged so the user who triggers it through the staking contract receives rewards.

```mermaid
sequenceDiagram
    CvgCvxStaking->>CvgFraxLpLocker: pullRewards(processor)
    note over CvgFraxLpLocker: Check NOT_CVX_REWARD_DISTRIBUTOR
    CvgFraxLpLocker->>CvgConvexVault: Get reward
    CvgFraxLpLocker-->>CVX: Get contract's CVX balance
    CvgFraxLpLocker-->>CRV: Get contract's CRV balance
    CvgFraxLpLocker-->>FXS: Get contract's FXS balance

    alt cvxAmount != 0
        alt processorRewards != 0
            CvgFraxLpLocker->>CVX: Transfer process fees to processor
        end

        CvgFraxLpLocker->>CVX: Transfer CVX rewards to Reward Distributor
    end

    alt crvAmount != 0
        alt processorRewards != 0
            CvgFraxLpLocker->>CRV: Transfer process fees to processor
        end

        CvgFraxLpLocker->>CRV: Transfer CRV rewards to Reward Distributor
    end

    alt fxsAmount != 0
        alt processorRewards != 0
            CvgFraxLpLocker->>FXS: Transfer process fees to processor
        end

        CvgFraxLpLocker->>FXS: Transfer FXS rewards to Reward Distributor
    end
```
