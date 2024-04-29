const { BigNumber } = require("ethers");
const fs = require("fs");

const abiRouter = require("../../abis/UniswapRouterV2.json");
const routerUniV2 = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
const contracts = require("../../scripts/deployer/complete/contractRegistry.json");

task("swap-uni2", "Swap a UNI", async function (taskArguments, hre, runSuper) {
  const signers = await ethers.getSigners();
  const owner = signers[0];

  const poolTicker = taskArguments["pool"];
  let amountIn = taskArguments["amount"];
  const direction = taskArguments["direction"];

  let addresses = JSON.parse(contracts);
  const poolsV2 = addresses.v2PoolContracts;

  await hre.run("prices", { pool: poolTicker });

  const poolAddress = poolsV2[poolTicker];
  const poolContract = await ethers.getContractAt(
    "IUniswapV3Pool",
    poolAddress
  );

  const token0 = await ethers.getContractAt(
    "ERC20",
    await poolContract.token0()
  );
  const token1 = await ethers.getContractAt(
    "ERC20",
    await poolContract.token1()
  );

  const path = direction == "1" ? [token0, token1] : [token1, token0];

  amountIn = BigNumber.from(amountIn.toString()).mul(
    BigNumber.from(Math.pow(10, Number(await path[1].decimals())).toString())
  );
  const router2Uniswap = await ethers.getContractAt(abiRouter, routerUniV2);

  direction == "1"
    ? await token0.connect(owner).approve(routerUniV2, ethers.MAX_INTEGER)
    : await token1.connect(owner).approve(routerUniV2, ethers.MAX_INTEGER);

  await (
    await router2Uniswap.swapExactTokensForTokens(
      amountIn,
      0,
      [path[0].address, path[1].address],
      owner.address,
      Date.now() + 1000
    )
  ).wait();

  console.log(`Swap executed`);

  // Run prices task
  await hre.run("prices", { pool: poolTicker });
})
  .addParam("pool", "Pool ticker")
  .addParam("amount", "Amount in ")
  .addParam("direction", "Swap direction");
