const { BigNumber } = require("ethers");
const fs = require("fs");
const contracts = require("../../scripts/deployer/complete/contractRegistry.json");
task(
  "swap-curve",
  "Swap a CURVE",
  async function (taskArguments, hre, runSuper) {
    const signers = await ethers.getSigners();
    const owner = signers[0];

    const poolTicker = taskArguments["pool"];
    let amountIn = taskArguments["amount"];
    const direction = taskArguments["direction"];

    const poolsCrv = contracts.addresses.curvePoolContracts;

    await hre.run("prices", { pool: poolTicker });

    const poolAddress = poolsCrv[poolTicker];
    const poolContract = await ethers.getContractAt("ICrvPool", poolAddress);

    const token0 = await ethers.getContractAt(
      "ERC20",
      await poolContract.coins(0)
    );
    const token1 = await ethers.getContractAt(
      "ERC20",
      await poolContract.coins(1)
    );
    const decimal0 = await token0.decimals();
    const decimal1 = await token1.decimals();

    const path = direction == "1" ? [0, 1] : [1, 0];

    amountIn = BigNumber.from(amountIn.toString()).mul(
      BigNumber.from(Math.pow(10, Number(eval("decimal" + path[0]))).toString())
    );

    direction == "1"
      ? await token0.connect(owner).approve(poolAddress, ethers.MAX_INTEGER)
      : await token1.connect(owner).approve(poolAddress, ethers.MAX_INTEGER);

    await (
      await poolContract.exchange(path[0], path[1], amountIn, 0, false)
    ).wait();

    console.log(`Swap executed`);

    // Run prices task
    await hre.run("prices", { pool: poolTicker });
  }
)
  .addParam("pool", "Pool ticker")
  .addParam("amount", "Amount in ")
  .addParam("direction", "Swap direction");
