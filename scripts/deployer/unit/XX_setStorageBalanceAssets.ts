import {IContractsUser, IUsers} from "../../../utils/contractInterface";
import {parseEther, parseUnits} from "ethers";

import {giveTokensToAddresses} from "../../../utils/thief/thiefv2";
import {ethers} from "hardhat";
import {
    TOKEN_ADDR_CNC,
    TOKEN_ADDR_CRV,
    TOKEN_ADDR_CVX,
    TOKEN_ADDR_DAI,
    TOKEN_ADDR_FRAX,
    TOKEN_ADDR_FXS,
    TOKEN_ADDR_SDT,
    TOKEN_ADDR_USDC,
    TOKEN_ADDR_USDT,
    TOKEN_ADDR_WETH,
    TOKEN_ADDR_FXN,
    TOKEN_ADDR_eUSD,
    TOKEN_ADDR_PRISMA,
    TOKEN_ADDR_FPIS,
    TOKEN_ADDR_wstETH,
} from "../../../resources/tokens/common";
import {THIEF_TOKEN_CONFIG} from "../../../utils/thief/thiefConfig";
import {CRV_DUO_FRAXBP, CRV_DUO_FRAXBP_POOL, TOKEN_ADDR_3CRV} from "../../../resources/lp";
import {TOKEN_ADDR_eUSD_FRAXBP} from "../../../resources/tokens/curve";
import {
    CVX_CRV_WRAPPER,
    CVX_FPIS_WRAPPER,
    CVX_FXN_WRAPPER,
    CVX_FXS_WRAPPER,
    CVX_PRISMA_WRAPPER,
    TOKEN_ADDR_CVX_CRV,
    TOKEN_ADDR_CVX_FPIS,
    TOKEN_ADDR_CVX_FXN,
    TOKEN_ADDR_CVX_FXS,
    TOKEN_ADDR_CVX_PRISMA,
} from "../../../resources/convex";
const ONE_HUNDRED_BILLION = Number(100_000_000_000).toString();

export async function getGlobalAssets(users: IUsers) {
    await giveTokensToAddresses(users.allUsers, [
        {token: THIEF_TOKEN_CONFIG["DAI"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["FRAX"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["WETH"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["CRV"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["CVX"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["CNC"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["FXS"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["FXN"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["SDT"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["FRAXBP"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["USDC"], amount: parseUnits(ONE_HUNDRED_BILLION, 6)},
        {token: THIEF_TOKEN_CONFIG["USDT"], amount: parseUnits(ONE_HUNDRED_BILLION, 6)},
        {token: THIEF_TOKEN_CONFIG["_3CRV"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["PRISMA"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["FPIS"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG.CVG, amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["wstETH"], amount: parseEther(ONE_HUNDRED_BILLION)},
    ]);

    return {
        dai: await ethers.getContractAt("ERC20", TOKEN_ADDR_DAI),
        frax: await ethers.getContractAt("ERC20", TOKEN_ADDR_FRAX),
        weth: await ethers.getContractAt("ERC20", TOKEN_ADDR_WETH),
        wstETH: await ethers.getContractAt("ERC20", TOKEN_ADDR_wstETH),
        crv: await ethers.getContractAt("ERC20", TOKEN_ADDR_CRV),
        cvx: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX),
        cnc: await ethers.getContractAt("ERC20", TOKEN_ADDR_CNC),
        fxs: await ethers.getContractAt("ERC20", TOKEN_ADDR_FXS),
        fxn: await ethers.getContractAt("ERC20", TOKEN_ADDR_FXN),
        sdt: await ethers.getContractAt("ERC20", TOKEN_ADDR_SDT),
        fraxBp: await ethers.getContractAt("ERC20", CRV_DUO_FRAXBP),
        usdc: await ethers.getContractAt("ERC20", TOKEN_ADDR_USDC),
        usdt: await ethers.getContractAt("ERC20", TOKEN_ADDR_USDT),
        _3crv: await ethers.getContractAt("ERC20", TOKEN_ADDR_3CRV),
        prisma: await ethers.getContractAt("ERC20", TOKEN_ADDR_PRISMA),
        fpis: await ethers.getContractAt("ERC20", TOKEN_ADDR_FPIS),
    };
}

export async function getConvexAssets(users: IUsers) {
    const AMOUNT_TOKEN = parseEther(ONE_HUNDRED_BILLION);
    await giveTokensToAddresses(users.allUsers, [
        {
            token: THIEF_TOKEN_CONFIG.CVX_CRV,
            amount: AMOUNT_TOKEN,
        },
        {
            token: THIEF_TOKEN_CONFIG.CVX_FXS,
            amount: AMOUNT_TOKEN,
        },
        {
            token: THIEF_TOKEN_CONFIG.CVX_PRISMA,
            amount: AMOUNT_TOKEN,
        },
        {
            token: THIEF_TOKEN_CONFIG.CVX_FXN,
            amount: AMOUNT_TOKEN,
        },
        {
            token: THIEF_TOKEN_CONFIG.CVX_FPIS,
            amount: AMOUNT_TOKEN,
        },
        {
            token: THIEF_TOKEN_CONFIG.eUSD_FRAXLP,
            amount: AMOUNT_TOKEN,
        },
        {
            token: THIEF_TOKEN_CONFIG.eUSD,
            amount: AMOUNT_TOKEN,
        },
    ]);

    return {
        cvxCrv: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_CRV),
        stkCvxCrv: await ethers.getContractAt("ERC20", CVX_CRV_WRAPPER),

        cvxFxs: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_FXS),
        stkCvxFxs: await ethers.getContractAt("ERC20", CVX_FXS_WRAPPER),

        cvxPrisma: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_PRISMA),
        stkCvxPrisma: await ethers.getContractAt("ERC20", CVX_PRISMA_WRAPPER),

        cvxFxn: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_FXN),
        stkCvxFxn: await ethers.getContractAt("ERC20", CVX_FXN_WRAPPER),

        cvxFpis: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_FPIS),
        stkCvxFpis: await ethers.getContractAt("ERC20", CVX_FPIS_WRAPPER),

        eusdfraxbp: await ethers.getContractAt("ERC20", TOKEN_ADDR_eUSD_FRAXBP),
        eusd: await ethers.getContractAt("ERC20", TOKEN_ADDR_eUSD),
        fraxbp: await ethers.getContractAt("ERC20", CRV_DUO_FRAXBP),
        cvx: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX),
        crv: await ethers.getContractAt("ERC20", TOKEN_ADDR_CRV),
        fxs: await ethers.getContractAt("ERC20", TOKEN_ADDR_FXS),

        convexAssets: {
            cvxCrv: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_CRV),
            stkCvxCrv: await ethers.getContractAt("ERC20", CVX_CRV_WRAPPER),

            cvxFxs: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_FXS),
            stkCvxFxs: await ethers.getContractAt("ERC20", CVX_FXS_WRAPPER),

            cvxPrisma: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_PRISMA),
            stkCvxPrisma: await ethers.getContractAt("ERC20", CVX_PRISMA_WRAPPER),

            cvxFxn: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_FXN),
            stkCvxFxn: await ethers.getContractAt("ERC20", CVX_FXN_WRAPPER),

            cvxFpis: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX_FPIS),
            stkCvxFpis: await ethers.getContractAt("ERC20", CVX_FPIS_WRAPPER),

            eusd: await ethers.getContractAt("ERC20", TOKEN_ADDR_eUSD),
            fraxbp: await ethers.getContractAt("ERC20", CRV_DUO_FRAXBP),
            cvx: await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX),
            crv: await ethers.getContractAt("ERC20", TOKEN_ADDR_CRV),
            fxs: await ethers.getContractAt("ERC20", TOKEN_ADDR_FXS),
        },
        curveLps: {
            eusdfraxbp: await ethers.getContractAt("ICurveLp", TOKEN_ADDR_eUSD_FRAXBP),
            fraxbp: await ethers.getContractAt("ICurveLp", CRV_DUO_FRAXBP_POOL),
        },
    };
}

export async function setStorageBalanceOfAssets(users: IUsers) {
    await giveTokensToAddresses(users.allUsers, [
        {token: THIEF_TOKEN_CONFIG.CVG, amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["FRAX"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["SDT"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["CRV"], amount: parseEther(ONE_HUNDRED_BILLION)},
    ]);
}

export async function setStorageBalanceOfAssetsOwner(users: IUsers) {
    await giveTokensToAddresses(
        [users.owner],
        [
            {
                token: THIEF_TOKEN_CONFIG.CVG,
                amount: parseEther(ONE_HUNDRED_BILLION),
            },
        ]
    );
}

export async function setStorageBalanceAssets(contractsUsers: IContractsUser): Promise<IContractsUser> {
    await giveTokensToAddresses(contractsUsers.users.allUsers, [
        {token: THIEF_TOKEN_CONFIG["DAI"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["FRAX"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["WETH"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["CRV"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["CVX"], amount: parseEther(ONE_HUNDRED_BILLION)},
        {token: THIEF_TOKEN_CONFIG["CNC"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["FXS"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["FXN"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["SDT"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["FRAXBP"], amount: parseEther(ONE_HUNDRED_BILLION)}, //
        {token: THIEF_TOKEN_CONFIG["USDC"], amount: parseUnits(ONE_HUNDRED_BILLION, 6)},
        {token: THIEF_TOKEN_CONFIG["USDT"], amount: parseUnits(ONE_HUNDRED_BILLION, 6)},
        {token: THIEF_TOKEN_CONFIG["_3CRV"], amount: parseEther(ONE_HUNDRED_BILLION)},

        {token: THIEF_TOKEN_CONFIG["CVX_CRV"], amount: parseEther(ONE_HUNDRED_BILLION)},
    ]);

    const dai = await ethers.getContractAt("ERC20", TOKEN_ADDR_DAI);
    const frax = await ethers.getContractAt("ERC20", TOKEN_ADDR_FRAX);
    const weth = await ethers.getContractAt("ERC20", TOKEN_ADDR_WETH);
    const crv = await ethers.getContractAt("ERC20", TOKEN_ADDR_CRV);
    const cvx = await ethers.getContractAt("ERC20", TOKEN_ADDR_CVX);
    const cnc = await ethers.getContractAt("ERC20", TOKEN_ADDR_CNC);
    const fxs = await ethers.getContractAt("ERC20", TOKEN_ADDR_FXS);
    const fxn = await ethers.getContractAt("ERC20", TOKEN_ADDR_FXN);
    const sdt = await ethers.getContractAt("ERC20", TOKEN_ADDR_SDT);
    const fraxBp = await ethers.getContractAt("ERC20", CRV_DUO_FRAXBP);
    const usdc = await ethers.getContractAt("ERC20", TOKEN_ADDR_USDC);
    const usdt = await ethers.getContractAt("ERC20", TOKEN_ADDR_USDT);
    const _3crv = await ethers.getContractAt("ERC20", TOKEN_ADDR_3CRV);

    return {
        ...contractsUsers,
        contracts: {
            ...contractsUsers.contracts,
            tokens: {
                ...contractsUsers.contracts.tokens,
                dai,
                frax,
                weth,
                crv,
                cvx,
                cnc,
                fxs,
                fxn,
                sdt,
                usdc,
                usdt,
                fraxBp,
                _3crv,
            },
        },
    };
}
