import {BOND_DEPOSITORY_CONTRACT, ORACLE_CONTRACT} from "../../../../../resources/contracts";
import * as bondParams from "../../../../../resources/bond_config";

import {BondDepository, CvgOracle} from "../../../../../typechain-types";
import {IUsers} from "../../../../../utils/contractInterface";
import {getAddress, getContract, txCheck} from "../../../complete/helper";

import {ethers, network} from "hardhat";
import {TREASURY_DAO, TREASURY_POD} from "../../../../../resources/treasury";
import {TOKEN_ADDR_CRV, TOKEN_ADDR_CVX, TOKEN_ADDR_SDT, TOKEN_ADDR_USDC, TOKEN_ADDR_crvUSD} from "../../../../../resources/tokens/common";
import {CVG} from "../../../../../resources/cvg-mainnet";
export const createProdBonds = async (u: IUsers) => {
    const bondDepository = await getContract<BondDepository>(BOND_DEPOSITORY_CONTRACT);
    const cvgOracle = await getContract<CvgOracle>(ORACLE_CONTRACT);
    await u.owner.sendTransaction({
        to: TREASURY_DAO,
        value: ethers.parseEther("10"),
    });
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [TREASURY_DAO],
    });
    const timestamp = (await ethers.provider.getBlock("latest"))!.timestamp + 30;

    await txCheck(async () => {
        const params = [
            {
                composedFunction: 0,
                token: TOKEN_ADDR_crvUSD,
                gamma: 250000, //25%
                bondDuration: 86400 * 30, //30 days
                isPaused: false,
                scale: 5000, //0.5%
                minRoi: 40000, //4%
                maxRoi: 90000, //9%
                percentageOneTx: 250, //25%
                vestingTerm: 86400 * 14, //14 days
                cvgToSell: ethers.parseEther("35000"),
                startBondTimestamp: timestamp,
            },
        ];
        return await bondDepository.connect(await ethers.getSigner(TREASURY_DAO)).createBond(params);
    }, "CREATE_BONDS_crvUSD1");

    await txCheck(async () => {
        const params = [
            {
                composedFunction: 0,
                token: TOKEN_ADDR_crvUSD,
                gamma: 250000, //25%
                bondDuration: 86400 * 30, //30 days
                isPaused: false,
                scale: 5000, //0.5%
                minRoi: 75000, //7.5%
                maxRoi: 125000, //12.5%
                percentageOneTx: 250, //25%
                vestingTerm: 86400 * 21, //21 days
                cvgToSell: ethers.parseEther("35000"),
                startBondTimestamp: timestamp,
            },
        ];
        //1711467000
        return await bondDepository.connect(await ethers.getSigner(TREASURY_DAO)).createBond(params);
    }, "CREATE_BONDS_crvUSD2");
    const timestampStart = 1711467000;
    const bond1 = [0, TOKEN_ADDR_crvUSD, 250000, 86400 * 30, false, 5000, 75000, 125000, 250, 86400 * 21, ethers.parseEther("35000"), timestampStart];
    const data = [bond1];
    console.log(data);

    await txCheck(async () => {
        const params = [
            {
                composedFunction: 0,
                token: TOKEN_ADDR_CVX,
                gamma: 250000, //25%
                bondDuration: 86400 * 30, //30 days
                isPaused: false,
                scale: 5000, //0.5%
                minRoi: 75000, //7.5%
                maxRoi: 125000, //12.5%
                percentageOneTx: 250, //25%
                vestingTerm: 86400 * 21, //21 days
                cvgToSell: ethers.parseEther("30000"),
                startBondTimestamp: timestamp,
            },
        ];
        return await bondDepository.connect(await ethers.getSigner(TREASURY_DAO)).createBond(params);
    }, "CREATE_BONDS_CVX");

    // await txCheck(async () => {
    //     const cvgCurveDuoParams = {
    //         isReversed: true,
    //         isEthPriceRelated: false,
    //         poolAddress: "0xa7B0E924c2dBB9B4F576CCE96ac80657E42c3e42",
    //         deltaLimitOracle: 1000n,
    //         maxLastUpdate: 86_400_000_000,
    //         minPrice: 200000000000000000n,
    //         maxPrice: 10000000000000000000n,
    //         stablesToCheck: [TOKEN_ADDR_USDC],
    //     };
    //     return await cvgOracle.connect(await ethers.getSigner(TREASURY_DAO)).setCurveDuoParams(CVG, cvgCurveDuoParams);
    // }, "CHANGE_CVG_ORACLE_PARAM");
    // await txCheck(async () => {
    //     const cvgCurveDuoParamsV2 = {
    //         isReversed: false,
    //         isEthPriceRelated: true,
    //         isNg: true,
    //         poolAddress: "0x004c167d27ada24305b76d80762997fa6eb8d9b2",
    //         deltaLimitOracle: 1000n,
    //         maxLastUpdate: 21600n,
    //         minPrice: ethers.parseEther("0.2"),
    //         maxPrice: ethers.parseEther("10"),
    //         stablesToCheck: [],
    //     };
    //     return cvgOracle.setCurveDuoParams(CVG, cvgCurveDuoParamsV2);
    // }, "V2_SET_UNIV2_PARAM_FOR_CVG");
};
