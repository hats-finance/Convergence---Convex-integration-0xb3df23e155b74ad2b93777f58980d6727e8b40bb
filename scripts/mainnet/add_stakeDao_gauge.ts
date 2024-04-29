import dotenv from "dotenv";
dotenv.config();
import {ethers} from "hardhat";
import {CLONE_FACTORY_CONTRACT, GAUGE_CONTROLLER_CONTRACT, SDT_UTILITIES_CONTRACT} from "../../resources/contracts";
import {getAddress} from "../deployer/complete/helper";
import {impersonateAccount} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {TREASURY_DAO} from "../../resources/treasury";
import {
    TOKEN_ADDR_CVG_ETH_GAUGE,
    TOKEN_ADDR_CVG_ETH_STRAT,
    TOKEN_ADDR_PYUSD_USDC_GAUGE,
    TOKEN_ADDR_PYUSD_USDC_STRAT,
    TOKEN_ADDR_cvgSDT_SDT_GAUGE,
    TOKEN_ADDR_cvgSDT_SDT_STRAT,
} from "../../resources/tokens/stake-dao";
import {giveTokensToAddresses} from "../../utils/thief/thiefv2";
import {THIEF_TOKEN_CONFIG} from "../../utils/thief/thiefConfig";
import {CRV_DUO_CVG_ETH, CRV_DUO_PYUSD_USDC, CRV_DUO_cvgSDT_SDT} from "../../resources/lp";

async function main() {
    const testSigners = await ethers.getSigners();
    await giveTokensToAddresses(
        [testSigners[0], testSigners[1], testSigners[2]],
        [
            {token: THIEF_TOKEN_CONFIG.CVG_ETH, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.cvgSDT_SDT, amount: ethers.parseEther("100000000")},
        ]
    );

    await impersonateAccount(TREASURY_DAO);

    await (
        await ethers.getSigners()
    )[0].sendTransaction({
        to: TREASURY_DAO,
        value: ethers.parseEther("100"),
    });
    console.log("Token sent");
    const treasuryDao = await ethers.getSigner(TREASURY_DAO);
    const gaugeController = await ethers.getContractAt("GaugeController", getAddress(GAUGE_CONTROLLER_CONTRACT));
    const sdtUtilities = await ethers.getContractAt("SdtUtilities", getAddress(SDT_UTILITIES_CONTRACT));

    // Deploy new gauges
    const cloneFactory = await ethers.getContractAt("CloneFactory", getAddress(CLONE_FACTORY_CONTRACT));
    const filterSdCreated = cloneFactory.filters.SdtStakingCreated(undefined, undefined, undefined);
    console.log("Add gauges on " + (await cloneFactory.getAddress()));

    await cloneFactory.connect(treasuryDao).createSdtStakingAndBuffer(TOKEN_ADDR_CVG_ETH_GAUGE, "CVG-ETH", true);
    await cloneFactory.connect(treasuryDao).createSdtStakingAndBuffer(TOKEN_ADDR_cvgSDT_SDT_GAUGE, "cvgSDT-SDT", true);

    const events = await cloneFactory.queryFilter(filterSdCreated, -10, "latest");
    const eventCvgEth = events[0].args;
    const eventCvgSdtSdt = events[1].args;

    const stakingContractCvgEth = await ethers.getContractAt("SdtStakingPositionService", eventCvgEth.stakingClone);
    const bufferContractCvgEth = await ethers.getContractAt("SdtBuffer", eventCvgEth.bufferClone);

    const stakingContractCvgSdtSdt = await ethers.getContractAt("SdtStakingPositionService", eventCvgSdtSdt.stakingClone);
    const bufferContractCvgSdtSdt = await ethers.getContractAt("SdtBuffer", eventCvgSdtSdt.bufferClone);
    await gaugeController.connect(treasuryDao).add_gauges([
        [stakingContractCvgEth, 0, 0],
        [stakingContractCvgSdtSdt, 0, 0],
    ]);
    await gaugeController.connect(treasuryDao).toggle_votes_pause([stakingContractCvgEth, stakingContractCvgSdtSdt]);

    console.log("STAKING cvgETH", await stakingContractCvgEth.getAddress());
    console.log("BUFFER cvgETH", await bufferContractCvgEth.getAddress());

    console.log("STAKING CvgSdtSdt", await stakingContractCvgSdtSdt.getAddress());
    console.log("BUFFER CvgSdtSdt", await bufferContractCvgSdtSdt.getAddress());

    await sdtUtilities.connect(treasuryDao).approveTokens([
        {token: TOKEN_ADDR_CVG_ETH_GAUGE, spender: stakingContractCvgEth, amount: ethers.MaxUint256}, //token: Stake Gauge / spender: new staking
        {token: CRV_DUO_CVG_ETH, spender: TOKEN_ADDR_CVG_ETH_STRAT, amount: ethers.MaxUint256}, //token: Curve Pool / spender: Stake Vault

        {token: TOKEN_ADDR_cvgSDT_SDT_GAUGE, spender: stakingContractCvgSdtSdt, amount: ethers.MaxUint256}, //token: Stake Gauge / spender: new staking
        {token: CRV_DUO_cvgSDT_SDT, spender: TOKEN_ADDR_cvgSDT_SDT_STRAT, amount: ethers.MaxUint256}, //token: Curve Pool / spender: Stake Vault
    ]);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
