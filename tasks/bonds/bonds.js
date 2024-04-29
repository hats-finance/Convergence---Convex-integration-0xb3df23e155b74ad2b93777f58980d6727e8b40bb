const fs = require("fs");
const contracts = require("../../scripts/deployer/complete/contractRegistry.json");

task(
  "bonds",
  "Display all bonds in control tower",
  async function (taskArguments, hre, runSuper) {
    const signers = await ethers.getSigners();
    const owner = signers[0];

    let addresses = JSON.parse(rawAddresses);

    const cvgControlTower = await ethers.getContractAt(
      "CvgControlTower",
      addresses.CONTROL_TOWER
    );

    const bonds = await cvgControlTower.getBondContractsPerVersion(
      1,
      0,
      20,
      owner.address
    );

    console.log(bonds);
  }
);
