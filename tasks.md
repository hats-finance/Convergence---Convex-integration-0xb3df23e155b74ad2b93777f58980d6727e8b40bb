npm run clean-contracts && npm run deploy-protocol-local

npx hardhat cvgCycleUpdate --cycle 1 --network localhost

npx hardhat convexDistribute --network localhost

npx hardhat stakeDaoDistribute --network localhost

npx hardhat genInterface --contract <nameContract> (ex: --contract Cvg)

npx hardhat context-maker --context gallery --network localhost

npx hardhat context-maker --context bonds --network localhost

npx hardhat view --network localhost

(fill the distribution.json before)
