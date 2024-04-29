import {task} from "hardhat/config";
import {THIEF_TOKEN_CONFIG} from "../utils/thief/thiefConfig";
import {setStorageAt} from "@nomicfoundation/hardhat-network-helpers";
import {HardhatRuntimeEnvironment} from "hardhat/types";

const calculateStorageSlotEthersSolidity = async (hre: HardhatRuntimeEnvironment, addressKey: string, mappingSlot: number) => {
    const paddedAddress = hre.ethers.zeroPadValue(addressKey, 32);
    const paddedSlot = hre.ethers.zeroPadValue(hre.ethers.toBeHex(mappingSlot), 32);
    const concatenated = hre.ethers.concat([paddedAddress, paddedSlot]);
    return hre.ethers.keccak256(concatenated);
};

const calculateStorageSlotEthersVyper = async (hre: HardhatRuntimeEnvironment, addressKey: string, mappingSlot: number) => {
    const paddedSlot = hre.ethers.zeroPadValue(hre.ethers.toBeHex(mappingSlot), 32);
    const paddedAddress = hre.ethers.zeroPadValue(addressKey, 32);
    const concatenated = hre.ethers.concat([paddedSlot, paddedAddress]);
    return hre.ethers.keccak256(concatenated);
};

task("distribute-tokens", "Distribute tokens to every users", async (a, hre) => {
    const accounts = await hre.ethers.getSigners();

    const tokensToDistribute = {
        // CVG,
        DAI: THIEF_TOKEN_CONFIG.DAI,
        FRAX: THIEF_TOKEN_CONFIG.FRAX,
        WETH: THIEF_TOKEN_CONFIG.WETH,
        CVX: THIEF_TOKEN_CONFIG.CVX,
        CNC: THIEF_TOKEN_CONFIG.CNC,
        SDT: THIEF_TOKEN_CONFIG.SDT,
        FRAXBP: THIEF_TOKEN_CONFIG.FRAXBP,
        USDC: THIEF_TOKEN_CONFIG.USDC,
        USDT: THIEF_TOKEN_CONFIG.USDT,
        FXS: THIEF_TOKEN_CONFIG.FXS,

        SD_CRV: THIEF_TOKEN_CONFIG.sd_CRV,
        SD_BAL: THIEF_TOKEN_CONFIG.sd_BAL,
        SD_ANGLE: THIEF_TOKEN_CONFIG.sd_ANGLE,
        SD_PENDLE: THIEF_TOKEN_CONFIG.sd_PENDLE,
        SD_FXS: THIEF_TOKEN_CONFIG.sd_FXS,
        SD_FXN: THIEF_TOKEN_CONFIG.sd_FXN,

        CRV: THIEF_TOKEN_CONFIG.CRV,
        BAL: THIEF_TOKEN_CONFIG.BAL,
        ANGLE: THIEF_TOKEN_CONFIG.ANGLE,
        PENDLE: THIEF_TOKEN_CONFIG.PENDLE,
        FXN: THIEF_TOKEN_CONFIG.FXN,

        _3CRV: THIEF_TOKEN_CONFIG._3CRV,

        _80BAL_20WETH: THIEF_TOKEN_CONFIG._80_BAL_20_WETH,

        BB_A_USD: THIEF_TOKEN_CONFIG.BB_A_USD,

        AG_EUR: THIEF_TOKEN_CONFIG.AG_EUR,
        SAN_USD_EUR: THIEF_TOKEN_CONFIG.SAN_USD_EUR,

        TRICRYPTOLLAMA: THIEF_TOKEN_CONFIG.TRICRYPTO_LLAMA,
        TRICRYPTO_USDC: THIEF_TOKEN_CONFIG.TRICRYPTO_USDC,
        TRICRYPTO_USDT: THIEF_TOKEN_CONFIG.TRICRYPTO_USDT,
        TRICRYPTO_USDT2: THIEF_TOKEN_CONFIG.TRICRYPTO_USDT2,

        CRVUSD_USDT: THIEF_TOKEN_CONFIG.CRVUSD_USDT,
        STG_USDC: THIEF_TOKEN_CONFIG.STG_USDC,

        SDCRV_CRV: THIEF_TOKEN_CONFIG.SDCRV_CRV,
        CRVUSD_USDC: THIEF_TOKEN_CONFIG.CRVUSD_USDC,
        FRX_ETH_ETH: THIEF_TOKEN_CONFIG.FRX_ETH_ETH,

        AGEUR_EUROC: THIEF_TOKEN_CONFIG.AGEUR_EUROC,

        MIM_3CRV: THIEF_TOKEN_CONFIG.MIM_3CRV,
        DETH_FRXETH: THIEF_TOKEN_CONFIG.DETH_FRXETH,
        CVXCRV_CRV: THIEF_TOKEN_CONFIG.CVXCRV_CRV,
        SDFXS_FXS: THIEF_TOKEN_CONFIG.SDFXS_FXS,

        FRAX_USDC: THIEF_TOKEN_CONFIG.FRAX_USDC,
        ALUSD_FRAX_USDC: THIEF_TOKEN_CONFIG.ALUSD_FRAX_USDC,

        RETH_ETH: THIEF_TOKEN_CONFIG.RETH_ETH,
        CRVUSD_XAI: THIEF_TOKEN_CONFIG.CRVUSD_XAI,
        COIL_FRAX_USDC: THIEF_TOKEN_CONFIG.COIL_FRAX_USDC,

        CRVUSD_SUSD: THIEF_TOKEN_CONFIG.CRVUSD_SUSD,
        CRVUSD_DOLA: THIEF_TOKEN_CONFIG.CRVUSD_DOLA,

        MKUSD_FRAX_USDC: THIEF_TOKEN_CONFIG.MKUSD_FRAX_USDC,
        CNC_ETH: THIEF_TOKEN_CONFIG.CNC_ETH,
        XAI_FRAX_USDC: THIEF_TOKEN_CONFIG.XAI_FRAX_USDC,

        CRVUSD_FRXETH_SDT: THIEF_TOKEN_CONFIG.CRVUSD_FRXETH_SDT,
        STETH_ETH: THIEF_TOKEN_CONFIG.STETH_ETH,

        TRICRV: THIEF_TOKEN_CONFIG.TRICRV,

        SETH_ETH: THIEF_TOKEN_CONFIG.STETH_ETH,
        SD_FRAX_3CRV: THIEF_TOKEN_CONFIG.SD_FRAX_3CRV,
        WST_ETH: THIEF_TOKEN_CONFIG.wstETH,
        FIS: THIEF_TOKEN_CONFIG.FIS,
        SPELL: THIEF_TOKEN_CONFIG.SPELL,
        CRVUSD_FRAX: THIEF_TOKEN_CONFIG.CRVUSD_FRAX,
        ETHp_WETH: THIEF_TOKEN_CONFIG.ETHp_WETH,
        WETH_SDT: THIEF_TOKEN_CONFIG.WETH_SDT,
    };

    //remove trackingVotes on FXS
    await setStorageAt(THIEF_TOKEN_CONFIG.FXS.address, 11, 0);

    const amount = 100_000_000;
    const distribution = [];
    let tokenContracts: {[key: string]: string} = {};

    for (const [tokenName, token] of Object.entries(tokensToDistribute)) {
        distribution.push({
            token: token,
            amount: hre.ethers.parseUnits(amount.toString(), token.decimals),
        });

        tokenContracts[tokenName] = token.address;
    }

    for (let i = 0; i < accounts.length; i++) {
        const userAddress = await accounts[i].getAddress();

        for (let j = 0; j < distribution.length; j++) {
            const tokenAmount = distribution[j];
            let storageSlot = "";
            if (tokenAmount.token.isVyper) {
                storageSlot = await calculateStorageSlotEthersVyper(hre, userAddress, tokenAmount.token.slotBalance);
            } else {
                storageSlot = await calculateStorageSlotEthersSolidity(hre, userAddress, tokenAmount.token.slotBalance);
            }
            await setStorageAt(tokenAmount.token.address, storageSlot, hre.ethers.toQuantity(tokenAmount.amount));
        }
    }

    for (const [tokenName, token] of Object.entries(tokensToDistribute)) {
        const contract = await hre.ethers.getContractAt("ERC20", token.address);
        const balance = await contract.balanceOf(accounts[0]);
        console.info(tokenName + " " + hre.ethers.formatUnits(balance, await contract.decimals()));
    }
});
