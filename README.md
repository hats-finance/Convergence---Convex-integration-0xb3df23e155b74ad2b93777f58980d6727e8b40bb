# Audit Competition for Convergence---Convex-integration
This repository is for the audit competition for the Convergence---Convex-integration.
To participate, submit your findings only by using the on-chain submission process on https://app.hats.finance/vulnerability .
## How to participate
- follow the instructions on https://app.hats.finance/
## Good luck!
We look forward to seeing your findings.
* * *
# Convergence Finance Hardhat

# Repo archi

- **archive** : Archived contracts & tests already deployed on the mainnet
- **contracts** : Convergence Protocol

  - **interfaces** : Smart Contract interfaces
  - **mock** : Mocked contracts, ONLY FOR TESTING PURPOSE
  - **poc** : POC for Mainnet, ONLY FOR TESTING PURPOSE
  - **utils** : Libraries used in the project
  - Any other folder sorts contracts per feature

- **docs** : Generated doc by _hardhat-docgen_
- **scripts** : Deployment & utility scripts interacting with contracts \*\*DeployHelper.js\*\* containing the deployment script context
- **tasks** : Hardhat tasks
- **technical-docs** : Sequential diagrams & Description of complex functions
- **test** : Unit & Integration testing. **TestHelper** containing the deployment script context
- **utils** : Utility classes & functions

# To run the project

As for now, the install with NPM is broken by `hardhat-ethernal` dependency

To install dependencies, please use yarn

```shell
yarn
```

# To run a local network forking the mainnet :

```shell
npm run mainnet-forking
```

# Test

Unit testing are located in `test` folder.
To run the full test :

```
npm run test
```

Single test:

```shell
npm run test --grep path/to/file
```

Entire folder:

```shell
npm run test --grep path/to/folder/**
```

If you have 15 min in front of you, run the coverage with:

```shell
npm run coverage
```

# How to deploy bonds ?

Once the local network that forks the mainnet is started, run the bond deployment script.
This script is handling the deployment of the all the base (controlTower, MockedERC20)
As the mainnet is forked, we are also creating the liquid pools on UNISWAP

```
npm run deploy-bonds-local
```

OR if on CVG network with ethernal

```
npm run deploy-bonds-ethernal
```

Refers to `tasks.md` to view the task associated to bonds

# Get Size of each contracts

```
npx hardhat size-contracts
```

# How to deploy Protocol ?

```
npm run deploy-protocol-local
```

OR if on CVG network with ethernal

```
npm run deploy-protocol-cvg
```

clean contracts after use

```
npm run clean-contracts
```
