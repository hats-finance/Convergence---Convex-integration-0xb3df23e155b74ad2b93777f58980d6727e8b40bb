import {ethers} from "hardhat";

// AMOUNTS
export const ONE_ETHER = ethers.parseEther("1");
export const TWO_ETHER = ethers.parseEther("2");
export const THREE_ETHER = ethers.parseEther("3");
export const TEN_ETHER = ethers.parseEther("10");
export const ONE_HUNDRED_ETHER = ethers.parseEther("100");
export const ONE_THOUSEN_ETHER = ethers.parseEther("1000");
export const TEN_THOUSEN_ETHER = ethers.parseEther("10000");
export const ONE_MILLION_ETHER = ethers.parseEther("1000000");
export const TWO_MILLION_ETHER = ethers.parseEther("2000000");

// TOKENS
export const MINT = 0;
export const TOKEN_1 = 1;
export const TOKEN_2 = 2;
export const TOKEN_3 = 3;
export const TOKEN_4 = 4;
export const TOKEN_5 = 5;
export const TOKEN_6 = 6;
export const TOKEN_7 = 7;
export const TOKEN_8 = 8;
export const TOKEN_9 = 9;
export const TOKEN_10 = 10;
export const TOKEN_11 = 11;
export const TOKEN_12 = 12;
export const TOKEN_13 = 13;

// Type Oracle

export const ORACLE_TYPE_NOT_SET = 0;
export const ORACLE_TYPE_STABLE = 1;
export const ORACLE_TYPE_CURVE_DUO = 2;
export const ORACLE_TYPE_CURVE_TRIPOOL = 3;
export const ORACLE_TYPE_UNIV3 = 4;
export const ORACLE_TYPE_UNIV2 = 5;

// BOND

export const IS_TOKENIZED = true;
export const IS_USERIFIED = false;
// CYCLES

export const CYCLE_1 = 1;
export const CYCLE_2 = 2;
export const CYCLE_3 = 3;
export const CYCLE_4 = 4;
export const CYCLE_5 = 5;
export const CYCLE_6 = 6;
export const CYCLE_7 = 7;
export const CYCLE_8 = 8;
export const CYCLE_9 = 9;
export const CYCLE_10 = 10;
export const CYCLE_11 = 11;
export const CYCLE_12 = 12;
export const CYCLE_13 = 13;
export const CYCLE_14 = 14;
export const CYCLE_15 = 15;
export const CYCLE_24 = 24;
export const CYCLE_36 = 36;
export const CYCLE_48 = 48;
export const CYCLE_60 = 60;
export const CYCLE_72 = 72;
export const CYCLE_84 = 84;
export const CYCLE_96 = 96;
export const CYCLE_108 = 108;
export const CYCLE_120 = 120;
export const CYCLE_132 = 132;
export const CYCLE_144 = 144;
export const CYCLE_156 = 156;
export const TDE_1 = 1;
export const TDE_2 = 2;
export const TDE_3 = 3;
export const TDE_4 = 4;
export const TDE_5 = 5;
export const TDE_6 = 6;
// PROCESS REWARDS CLAIMER REWARDS
export const CLAIMER_REWARDS_PERCENTAGE = 1000n;
export const SD_ASSETS_FEE_PERCENTAGE = 5_000n;
export const DENOMINATOR = 100000n;

export const ONE_WEEK = 604_800n;

/// @dev Duration that rewards are streamed over. 25.6 days = 11 cycle * 7 days / 3 distributions. Allows us to do 3 distrib on one TDE.
export const STREAM_PERIOD_YS = 2211840n;
