import dotenv from "dotenv";
import {ethers} from "hardhat";
import {giveTokensToAddresses} from "../../utils/thief/thiefv2";
import {THIEF_TOKEN_CONFIG} from "../../utils/thief/thiefConfig";
import {impersonateAccount} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {TREASURY_DAO} from "../../resources/treasury";
import {getAddress} from "../deployer/complete/helper";
import {
    CLONE_FACTORY_CONTRACT, CVG_ORACLE_UPGRADEABLE_CONTRACT,
    GAUGE_CONTROLLER_CONTRACT,
    ORACLE_CONTRACT,
    SDT_UTILITIES_CONTRACT
} from "../../resources/contracts";
import {
    APW_DEPOSITOR,
    TOKEN_ADDR_sdAPW,
    TOKEN_ADDR_sdAPW_GAUGE,
    TOKEN_ADDR_sdYFI,
    TOKEN_ADDR_sdYFI_GAUGE, YFI_DEPOSITOR
} from "../../resources/tokens/stake-dao";
import {CRV_DUO_SDAPW_APW, CRV_DUO_SDYFI_YFI} from "../../resources/lp";
import {TOKEN_ADDR_APW, TOKEN_ADDR_dYFI, TOKEN_ADDR_YFI} from "../../resources/tokens/common";
import {APW_ORACLE_PARAMS, dYFI_ORACLE_PARAMS, YFI_ORACLE_PARAMS} from "../../resources/oracle_config";
dotenv.config();

const main = async () => {
    const testSigners = await ethers.getSigners();
    await giveTokensToAddresses(
        [testSigners[0], testSigners[1], testSigners[2]],
        [
            { token: THIEF_TOKEN_CONFIG.YFI, amount: ethers.parseEther("100000000") },
            { token: THIEF_TOKEN_CONFIG.APW, amount: ethers.parseEther("100000000") },
            { token: THIEF_TOKEN_CONFIG.sd_YFI, amount: ethers.parseEther("100000000") },
            { token: THIEF_TOKEN_CONFIG.sd_APW, amount: ethers.parseEther("100000000") }
        ]
    );

    await impersonateAccount(TREASURY_DAO);

    await (
        await ethers.getSigners()
    )[0].sendTransaction({
        to: TREASURY_DAO,
        value: ethers.parseEther("100"),
    });

    const treasuryDao = await ethers.getSigner(TREASURY_DAO);
    const gaugeController = await ethers.getContractAt("GaugeController", getAddress(GAUGE_CONTROLLER_CONTRACT));
    const sdtUtilities = await ethers.getContractAt("SdtUtilities", getAddress(SDT_UTILITIES_CONTRACT));
    const cvgOracleV2 = await ethers.getContractAt("CvgOracleUpgradeable", getAddress(CVG_ORACLE_UPGRADEABLE_CONTRACT));

    // Deploy new gauges
    const cloneFactory = await ethers.getContractAt("CloneFactory", getAddress(CLONE_FACTORY_CONTRACT));
    const filterSdCreated = cloneFactory.filters.SdtStakingCreated(undefined, undefined, undefined);

    await cloneFactory.connect(treasuryDao).createSdtStakingAndBuffer(TOKEN_ADDR_sdYFI_GAUGE, "sdYFI", false);
    await cloneFactory.connect(treasuryDao).createSdtStakingAndBuffer(TOKEN_ADDR_sdAPW_GAUGE, "sdAPW", false);

    const events = await cloneFactory.queryFilter(filterSdCreated, -10, "latest");
    const eventSdYFI = events[0].args;
    const eventSdAPW = events[1].args;

    const stakingContractsSdYFI = await ethers.getContractAt("SdtStakingPositionService", eventSdYFI.stakingClone);
    const bufferContractSdYFI = await ethers.getContractAt("SdtBuffer", eventSdYFI.bufferClone);

    const stakingContractsSdAPW = await ethers.getContractAt("SdtStakingPositionService", eventSdAPW.stakingClone);
    const bufferContractSdAPW = await ethers.getContractAt("SdtBuffer", eventSdAPW.bufferClone);

    await gaugeController.connect(treasuryDao).add_gauges([
        [stakingContractsSdYFI, 0, 0],
        [stakingContractsSdAPW, 0, 0],
    ]);
    await gaugeController.connect(treasuryDao).toggle_votes_pause([stakingContractsSdYFI, stakingContractsSdAPW]);

    console.log("STAKING sdYFI", await stakingContractsSdYFI.getAddress());
    console.log("BUFFER sdYFI", await bufferContractSdYFI.getAddress());

    console.log("STAKING sdAPW", await stakingContractsSdAPW.getAddress());
    console.log("BUFFER sdAPW", await bufferContractSdAPW.getAddress());

    await sdtUtilities.connect(treasuryDao).approveTokens([
        // sdYFI-Staking
        { token: TOKEN_ADDR_sdYFI_GAUGE, spender: stakingContractsSdYFI, amount: ethers.MaxUint256 }, // token: Stake Gauge / spender: new staking
        { token: TOKEN_ADDR_sdYFI, spender: TOKEN_ADDR_sdYFI_GAUGE, amount: ethers.MaxUint256 }, // token: sdYFI / spender: sdYFI-gauge
        { token: TOKEN_ADDR_YFI, spender: CRV_DUO_SDYFI_YFI, amount: ethers.MaxUint256 }, // token: YFI / spender: Stake Vault
        { token: TOKEN_ADDR_YFI, spender: YFI_DEPOSITOR, amount: ethers.MaxUint256 }, // token: YFI / spender: sdYFI

        // sdAPW-Staking
        { token: TOKEN_ADDR_sdAPW_GAUGE, spender: stakingContractsSdAPW, amount: ethers.MaxUint256 }, //token: Stake Gauge / spender: new staking
        { token: TOKEN_ADDR_sdAPW, spender: TOKEN_ADDR_sdAPW_GAUGE, amount: ethers.MaxUint256 }, // token: sdAPW / spender: sdAPW-gauge
        { token: TOKEN_ADDR_APW, spender: CRV_DUO_SDAPW_APW, amount: ethers.MaxUint256 }, // token: APW / spender: Curve Pool
        { token: TOKEN_ADDR_APW, spender: APW_DEPOSITOR, amount: ethers.MaxUint256 } // token: APW / spender: sdAPW
    ]);

    // setup stable pools to enable swaps
    await sdtUtilities.connect(treasuryDao).setStablePools([
        { liquidLocker: TOKEN_ADDR_sdYFI, lp: CRV_DUO_SDYFI_YFI },
        { liquidLocker: TOKEN_ADDR_sdAPW, lp: CRV_DUO_SDAPW_APW }
    ]);

    // oracle params
    await cvgOracleV2.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_YFI, 2); // curve duo
    await cvgOracleV2.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_dYFI, 2); // curve duo
    await cvgOracleV2.connect(treasuryDao).setPoolTypeForToken(TOKEN_ADDR_APW, 4); // Uniswap V3

    await cvgOracleV2.connect(treasuryDao).setCurveDuoParams(TOKEN_ADDR_YFI, YFI_ORACLE_PARAMS);
    await cvgOracleV2.connect(treasuryDao).setCurveDuoParams(TOKEN_ADDR_dYFI, dYFI_ORACLE_PARAMS);
    await cvgOracleV2.connect(treasuryDao).setUniV3Params(TOKEN_ADDR_APW, APW_ORACLE_PARAMS);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});