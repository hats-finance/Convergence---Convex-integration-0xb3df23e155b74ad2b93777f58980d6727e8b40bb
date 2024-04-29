const fs = require("fs");
const contracts = require("../../scripts/deployer/complete/contractRegistry.json");
const {
  MAX_INTEGER,
  zeroAddress,
} = require("@nomicfoundation/ethereumjs-util");

task(
  "distribute-ys",
  "Display all bonds in control tower",
  async function (taskArguments, hre, runSuper) {
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const treasuryPdd = signers[16];

    let addresses = contracts.addresses;

    const ysDistributorContract = await ethers.getContractAt(
      "YsDistributor",
      addresses.YsDistributor
    );

    const token1Address = taskArguments["token1address"];
    const token1Amount = ethers.parseEther(taskArguments["token1amount"]);
    const token2Address = taskArguments["token2address"];
    const token2Amount = ethers.parseEther(taskArguments["token2amount"]);
    const token3Address = taskArguments["token3address"];
    const token3Amount = ethers.parseEther(taskArguments["token3amount"]);
    const token4Address = taskArguments["token4address"];
    const token4Amount = ethers.parseEther(taskArguments["token4amount"]);
    const token5Address = taskArguments["token5address"];
    const token5Amount = ethers.parseEther(taskArguments["token5amount"]);

    let allTokens = [
      { token: token1Address, amount: token1Amount },
      { token: token2Address, amount: token2Amount },
      { token: token3Address, amount: token3Amount },
      { token: token4Address, amount: token4Amount },
      { token: token5Address, amount: token5Amount },
    ];
    allTokens = allTokens.filter(
      (token) =>
        token.token !== zeroAddress() && token.amount.toString() !== "0"
    );

    for (const token of allTokens) {
      const erc20 = await ethers.getContractAt("ERC20", token.token);
      await erc20.connect(owner).transfer(treasuryPdd.address, token.amount);
      await erc20
        .connect(treasuryPdd)
        .approve(ysDistributorContract, token.amount);
    }

    await ysDistributorContract
      .connect(treasuryPdd)
      .depositMultipleToken(allTokens);

    console.log("Distribution finished");
  }
)
  .addParam("token1address", "Token 1 address")
  .addParam("token1amount", "Token 1 amount")
  .addParam("token2address", "Token 2 address")
  .addParam("token2amount", "Token 2 amount")
  .addParam("token3address", "Token 3 address")
  .addParam("token3amount", "Token 3 amount")
  .addParam("token4address", "Token 4 address")
  .addParam("token4amount", "Token 4 amount")
  .addParam("token5address", "Token 5 address")
  .addParam("token5amount", "Token 5 amount");
