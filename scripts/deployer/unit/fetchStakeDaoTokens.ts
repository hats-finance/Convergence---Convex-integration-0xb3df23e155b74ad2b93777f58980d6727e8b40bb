import {ethers} from "hardhat";
import {
    TOKEN_ADDR_SD_FRAX_3CRV,
    TOKEN_ADDR_sdCRV,
    TOKEN_ADDR_sdBAL,
    TOKEN_ADDR_sdPENDLE,
    TOKEN_ADDR_sdANGLE,
    TOKEN_ADDR_sdFXS,
    TOKEN_ADDR_sdCRV_GAUGE,
    TOKEN_ADDR_sdPENDLE_GAUGE,
    TOKEN_ADDR_sdBAL_GAUGE,
    TOKEN_ADDR_sdFXS_GAUGE,
    TOKEN_ADDR_sdANGLE_GAUGE,
    TOKEN_ADDR_BB_A_USD,
    TOKEN_ADDR_AG_EUR,
    TOKEN_ADDR_SAN_USDC_EUR,
    TOKEN_ADDR_triLLAMA_GAUGE,
    TOKEN_ADDR_sdFXN,
    TOKEN_ADDR_sdFXN_GAUGE,
    TOKEN_ADDR_triSDT_GAUGE,
    TOKEN_ADDR_ETHp_WETH_GAUGE, TOKEN_ADDR_sdYFI, TOKEN_ADDR_sdAPW, TOKEN_ADDR_sdYFI_GAUGE, TOKEN_ADDR_sdAPW_GAUGE,
} from "../../../resources/tokens/stake-dao";
import {TOKEN_ADDR_BAL, TOKEN_ADDR_ANGLE} from "../../../resources/tokens/common";
import {IContractsUser} from "../../../utils/contractInterface";
import {THIEF_TOKEN_CONFIG} from "../../../utils/thief/thiefConfig";
import {giveTokensToAddresses} from "../../../utils/thief/thiefv2";
import {CRV_TRI_CRYPTO_SDT, CRV_TRI_CRYPTO_LLAMA, CRV_DUO_ETHp_WETH} from "../../../resources/lp";

export async function fetchStakeDaoTokens(contractsUsers: IContractsUser): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;
    await giveTokensToAddresses(
        [users.owner, users.user1, users.user2, users.user3, users.user4],
        [
            //SDASSET
            {token: THIEF_TOKEN_CONFIG.sd_CRV, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.sd_ANGLE, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.sd_BAL, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.sd_FXS, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.sd_FXN, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.sd_PENDLE, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.sd_YFI, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.sd_APW, amount: ethers.parseEther("100000000")},
            //SDLPASSET
            {token: THIEF_TOKEN_CONFIG.SDFRAX3CRV, amount: ethers.parseEther("100000000")},
            // Rewards BAL
            {token: THIEF_TOKEN_CONFIG.BB_A_USD, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.BAL, amount: ethers.parseEther("100000000")},

            // Rewards ANGLE
            {token: THIEF_TOKEN_CONFIG.SAN_USD_EUR, amount: ethers.parseUnits("100000000", 6)},
            {token: THIEF_TOKEN_CONFIG.AG_EUR, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.ANGLE, amount: ethers.parseEther("100000000")},

            {token: THIEF_TOKEN_CONFIG.wstETH, amount: ethers.parseEther("100000000")},

            {token: THIEF_TOKEN_CONFIG.TRICRYPTO_LLAMA, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.FRX_ETH_ETH, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG._80_BAL_20_WETH, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.CRVUSD_FRXETH_SDT, amount: ethers.parseEther("100000000")},
            {token: THIEF_TOKEN_CONFIG.ETHp_WETH, amount: ethers.parseEther("100000000")},
        ]
    );

    // Fetch all Sd assets & SdAssets Gauges
    const sdCrv = await ethers.getContractAt("ISdAsset", TOKEN_ADDR_sdCRV);
    const sdBal = await ethers.getContractAt("ISdAsset", TOKEN_ADDR_sdBAL);
    const sdPendle = await ethers.getContractAt("ISdAsset", TOKEN_ADDR_sdPENDLE);
    const sdAngle = await ethers.getContractAt("ISdAsset", TOKEN_ADDR_sdANGLE);
    const sdFxs = await ethers.getContractAt("ISdAsset", TOKEN_ADDR_sdFXS);
    const sdFxn = await ethers.getContractAt("ISdAsset", TOKEN_ADDR_sdFXN);
    const sdYfi = await ethers.getContractAt("ISdAsset", TOKEN_ADDR_sdYFI);
    const sdApw = await ethers.getContractAt("ISdAsset", TOKEN_ADDR_sdAPW);

    const sdCrvGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_sdCRV_GAUGE);
    const sdPendleGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_sdPENDLE_GAUGE);
    const sdBalGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_sdBAL_GAUGE);
    const sdFxsGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_sdFXS_GAUGE);
    const sdFxnGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_sdFXN_GAUGE);
    const sdAngleGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_sdANGLE_GAUGE);
    const sdYfiGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_sdYFI_GAUGE);
    const sdApwGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_sdAPW_GAUGE);

    const sdFrax3Crv = await ethers.getContractAt("ERC20", TOKEN_ADDR_SD_FRAX_3CRV);
    const bal = await ethers.getContractAt("ERC20", TOKEN_ADDR_BAL);
    const bbAUsd = await ethers.getContractAt("ERC20", TOKEN_ADDR_BB_A_USD);

    const sanUsdEur = await ethers.getContractAt("ERC20", TOKEN_ADDR_SAN_USDC_EUR);
    const agEur = await ethers.getContractAt("ERC20", TOKEN_ADDR_AG_EUR);
    const angle = await ethers.getContractAt("ERC20", TOKEN_ADDR_ANGLE);
    const _80bal_20weth = await ethers.getContractAt("ERC20", THIEF_TOKEN_CONFIG._80_BAL_20_WETH.address);

    const triLLAMA = await ethers.getContractAt("ERC20", CRV_TRI_CRYPTO_LLAMA);
    const triLLAMAGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_triLLAMA_GAUGE);

    const triSDT = await ethers.getContractAt("ERC20", CRV_TRI_CRYPTO_SDT);
    const triSDTGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_triSDT_GAUGE);

    const ETHp_WETH = await ethers.getContractAt("ERC20", CRV_DUO_ETHp_WETH);
    const ETHp_WETHGauge = await ethers.getContractAt("ISdAssetGauge", TOKEN_ADDR_ETHp_WETH_GAUGE);

    return {
        ...contractsUsers,
        contracts: {
            ...contracts,
            tokensStakeDao: {
                sdAngle,
                sdAngleGauge,
                sdBal,
                sdBalGauge,
                sdCrv,
                sdCrvGauge,
                sdFxs,
                sdFxn,
                sdFxsGauge,
                sdFxnGauge,
                sdPendle,
                sdPendleGauge,
                sdYfi,
                sdApw,
                sdYfiGauge,
                sdApwGauge,
                sdFrax3Crv,
                bal,
                bbAUsd,
                sanUsdEur,
                agEur,
                angle,
                triLLAMA,
                triLLAMAGauge,
                triSDT,
                triSDTGauge,

                ETHp_WETH,
                ETHp_WETHGauge,

                _80bal_20weth,
            },
        },
    };
}
