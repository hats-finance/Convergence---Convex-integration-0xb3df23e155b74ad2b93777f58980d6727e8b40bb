import {IBondStruct} from "../typechain-types/contracts/Bond/BondDepository";
import {ethers} from "hardhat";
import {
    TOKEN_ADDR_CNC,
    TOKEN_ADDR_CRV,
    TOKEN_ADDR_CVX,
    TOKEN_ADDR_DAI,
    TOKEN_ADDR_FRAX,
    TOKEN_ADDR_FXS,
    TOKEN_ADDR_SDT,
    TOKEN_ADDR_WETH,
} from "./tokens/common";

export const DAI: IBondStruct.BondParamsStruct = {
    composedFunction: 0,
    token: TOKEN_ADDR_DAI,
    gamma: 250000n,
    bondDuration: 864_000 * 3,
    scale: 5000n,
    minRoi: 10000,
    maxRoi: 55000,
    percentageOneTx: 200,
    vestingTerm: 432000,
    cvgToSell: ethers.parseEther("420000"),
    startBondTimestamp: 0,
    isPaused: false,
};

export const FRAX: IBondStruct.BondParamsStruct = {
    composedFunction: 0,
    token: TOKEN_ADDR_FRAX,
    gamma: 250000n,
    bondDuration: 864_000 * 3,
    scale: 5000n,
    minRoi: 10000,
    maxRoi: 55000,
    cvgToSell: ethers.parseEther("420000"),
    startBondTimestamp: 0,
    isPaused: false,
    percentageOneTx: 200,
    vestingTerm: 432000,
};

export const WETH: IBondStruct.BondParamsStruct = {
    composedFunction: 2,
    token: TOKEN_ADDR_WETH,
    gamma: 250000n,
    bondDuration: 864_000 * 3,
    scale: 5000n,
    minRoi: 10000,
    maxRoi: 75000,
    cvgToSell: ethers.parseEther("250000"),
    startBondTimestamp: 0,
    isPaused: false,
    percentageOneTx: 200,
    vestingTerm: 432000,
};

export const CRV: IBondStruct.BondParamsStruct = {
    composedFunction: 0,
    token: TOKEN_ADDR_CRV,
    gamma: 250000n,
    bondDuration: 864_000 * 3,
    scale: 5000n,
    minRoi: 15000,
    maxRoi: 80000,
    percentageOneTx: 200,
    vestingTerm: 604800,
    cvgToSell: ethers.parseEther("240000"),
    startBondTimestamp: 0,
    isPaused: false,
};

export const CVX: IBondStruct.BondParamsStruct = {
    composedFunction: 0,
    token: TOKEN_ADDR_CVX,
    gamma: 250000n,
    bondDuration: 864_000 * 3,
    scale: 5000n,
    minRoi: 15000,
    maxRoi: 80000,
    percentageOneTx: 200,
    vestingTerm: 604800,
    cvgToSell: ethers.parseEther("240000"),
    startBondTimestamp: 0,
    isPaused: false,
};

export const FXS: IBondStruct.BondParamsStruct = {
    composedFunction: 0,
    token: TOKEN_ADDR_FXS,
    gamma: 250000n,
    bondDuration: 864_000 * 3,
    scale: 5000n,
    minRoi: 15000,
    maxRoi: 80000,
    percentageOneTx: 200,
    vestingTerm: 604800,
    cvgToSell: ethers.parseEther("240000"),
    startBondTimestamp: 0,
    isPaused: false,
};

export const SDT: IBondStruct.BondParamsStruct = {
    composedFunction: 0,
    token: TOKEN_ADDR_SDT,
    gamma: 250000n,
    bondDuration: 864_000 * 3,
    scale: 5000n,
    minRoi: 15000,
    maxRoi: 80000,
    percentageOneTx: 200,
    vestingTerm: 604800,
    cvgToSell: ethers.parseEther("240000"),
    startBondTimestamp: 0,
    isPaused: false,
};

export const CNC: IBondStruct.BondParamsStruct = {
    composedFunction: 3,
    token: TOKEN_ADDR_CNC,
    gamma: 250000n,
    bondDuration: 864_000 * 3,
    scale: 5000n,
    minRoi: 15000,
    maxRoi: 80000,
    percentageOneTx: 200,
    vestingTerm: 604800,
    cvgToSell: ethers.parseEther("240000"),
    startBondTimestamp: 0,
    isPaused: false,
};
