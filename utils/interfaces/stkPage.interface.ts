export interface StkContractInfo {
    stakingContract: string;
    stakingName: string;
    stkCvgBalance: bigint;
    cvgAllowance: bigint;
    wethAllowance: bigint;
    rewardRateForDuration: bigint;
    claimableRewards: bigint;
    userRewardPerTokenPaid: bigint;
}

export interface CommonInfos {
    cvgBalance: bigint;
    ethBalance: bigint;
    wETHBalance: bigint;
}
