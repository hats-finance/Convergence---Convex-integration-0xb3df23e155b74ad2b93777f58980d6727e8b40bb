const fs = require("fs");
const contracts = require("../scripts/deployer/complete/contractRegistry.json");
const { constants } = require("ethers");

function convertEthersToNumber(bigNumber) {
  return Number(ethers.utils.formatEther(bigNumber));
}

task(
  "prices",
  "Print prices of all bond tokens",
  async function (taskArguments, _, _) {
    const pool = taskArguments["pool"];
    const addresses = contracts.addresses;
    const cvgOracle = await ethers.getContractAt(
      "CvgOracle",
      addresses.CvgOracle
    );
    const isNoArgs = pool == undefined;

    if (isNoArgs || pool == "TOKE_ETH_V2") {
      console.log(
        "TOKE PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "1",
              poolAddress: addresses.v2PoolContracts.TOKE_ETH_V2,
              isReversed: true,
              isEthPriceRelated: true,
              aggregatorOracle: "0x0000000000000000000000000000000000000000",
              deltaLimitOracle: 500,
            })
          )[0]
        )
      );
    }
    if (isNoArgs || pool == "FRAX_FXS_V2") {
      console.log(
        "FXS PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "1",
              poolAddress: addresses.v2PoolContracts.FRAX_FXS_V2,
              isReversed: false,
              isEthPriceRelated: false,
              aggregatorOracle: "0x0000000000000000000000000000000000000000",
              deltaLimitOracle: 500,
            })
          )[0]
        )
      );
    }

    if (isNoArgs || pool == "USDC_ETH_V3") {
      console.log(
        "ETH PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "0",
              poolAddress: addresses.v3PoolContracts.USDC_ETH_V3,
              isReversed: true,
              isEthPriceRelated: false,
              aggregatorOracle: "0x0000000000000000000000000000000000000000",
              deltaLimitOracle: 500,
            })
          )[0]
        )
      );
    }

    if (isNoArgs || pool == "CRV_ETH_V3") {
      console.log(
        "CRV PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "0",
              poolAddress: addresses.v3PoolContracts.CRV_ETH_V3,
              isReversed: false,
              isEthPriceRelated: true,
              aggregatorOracle: "0x0000000000000000000000000000000000000000",
              deltaLimitOracle: 500,
            })
          )[0]
        )
      );
    }

    if (isNoArgs || pool == "CVX_ETH_V3") {
      console.log(
        "CVX PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "0",
              poolAddress: addresses.v3PoolContracts.CVX_ETH_V3,
              isReversed: false,
              isEthPriceRelated: true,
              aggregatorOracle: "0x0000000000000000000000000000000000000000",
              deltaLimitOracle: 500,
            })
          )[0]
        )
      );
    }

    if (isNoArgs || pool == "CRV_ETH_CURVE") {
      console.log(
        "CRV PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "2",
              poolAddress: addresses.curvePoolContracts.CRV_ETH_CURVE,
              isReversed: false,
              isEthPriceRelated: true,
              aggregatorOracle: "0x0000000000000000000000000000000000000000",
              deltaLimitOracle: 500,
              twapOrK: 0,
            })
          )[0]
        )
      );
    }
    if (isNoArgs || pool == "CVX_ETH_CURVE") {
      console.log(
        "CVX PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "2",
              poolAddress: addresses.curvePoolContracts.CVX_ETH_CURVE,
              isReversed: false,
              isEthPriceRelated: true,
              aggregatorOracle: zeroAddress(),
              deltaLimitOracle: 500,
              twapOrK: "0",
            })
          )[0]
        )
      );
    }
    if (isNoArgs || pool == "SDT_ETH_CURVE") {
      console.log(
        "SDT PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "2",
              poolAddress: addresses.curvePoolContracts.SDT_ETH_CURVE,
              isReversed: false,
              isEthPriceRelated: true,
              aggregatorOracle: "0x0000000000000000000000000000000000000000",
              deltaLimitOracle: 500,
              twapOrK: "0",
            })
          )[0]
        )
      );
    }
    if (isNoArgs || pool == "CNC_ETH_CURVE") {
      console.log(
        "CNC PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "2",
              poolAddress: addresses.curvePoolContracts.CNC_ETH_CURVE,
              isReversed: false,
              isEthPriceRelated: true,
              aggregatorOracle: "0x0000000000000000000000000000000000000000",
              deltaLimitOracle: 500,
              twapOrK: "0",
            })
          )[0]
        )
      );
    }

    if (isNoArgs || pool == "CVG_FRAXBP") {
      console.log(
        "CVG PRICE in USD is : ",
        convertEthersToNumber(
          (
            await cvgOracle.getPriceOracle({
              poolType: "2",
              poolAddress: addresses.curvePoolContracts.CVG_FRAXBP,
              isReversed: false,
              isEthPriceRelated: false,
              aggregatorOracle: "0x0000000000000000000000000000000000000000",
              deltaLimitOracle: 500,
              twapOrK: "0",
            })
          )[0]
        )
      );
    }
  }
).addOptionalParam("pool", "Filter the price fetching on one token");
