# **Convergence - Convex integration Audit Competition on Hats.finance** 


## Introduction to Hats.finance


Hats.finance builds autonomous security infrastructure for integration with major DeFi protocols to secure users' assets. 
It aims to be the decentralized choice for Web3 security, offering proactive security mechanisms like decentralized audit competitions and bug bounties. 
The protocol facilitates audit competitions to quickly secure smart contracts by having auditors compete, thereby reducing auditing costs and accelerating submissions. 
This aligns with their mission of fostering a robust, secure, and scalable Web3 ecosystem through decentralized security solutions​.

## About Hats Audit Competition


Hats Audit Competitions offer a unique and decentralized approach to enhancing the security of web3 projects. Leveraging the large collective expertise of hundreds of skilled auditors, these competitions foster a proactive bug hunting environment to fortify projects before their launch. Unlike traditional security assessments, Hats Audit Competitions operate on a time-based and results-driven model, ensuring that only successful auditors are rewarded for their contributions. This pay-for-results ethos not only allocates budgets more efficiently by paying exclusively for identified vulnerabilities but also retains funds if no issues are discovered. With a streamlined evaluation process, Hats prioritizes quality over quantity by rewarding the first submitter of a vulnerability, thus eliminating duplicate efforts and attracting top talent in web3 auditing. The process embodies Hats Finance's commitment to reducing fees, maintaining project control, and promoting high-quality security assessments, setting a new standard for decentralized security in the web3 space​​.

## Convergence - Convex integration Overview

Convergence is a governance aggregator optimizing yield. 

## Competition Details


- Type: A public audit competition hosted by Convergence - Convex integration
- Duration: 2 weeks
- Maximum Reward: $25,000
- Submissions: 89
- Total Payout: $12,500 distributed among 4 participants.

## Scope of Audit

## Project overview

Convergence Finance aggregates protocols involved into Governance wars in order to enhance ROI on already existing staking product. We started to launch with the protocol StakeDao and it's running on the Ethereum Mainnet since now 3 months.

This audit concerns the second integration we are doing : Convex protocol.

## Audit competition scope

Contracts to audit are all under de Staking/Convex folder.

```
|-- contracts/
     |-- Staking/
              |-- Convex/
                  |-- CvxRewardDistributor.sol
                  |-- CvxStakingPositionManager.sol   
                  |-- StakingServiceBase.sol
                  |-- cvgCVX/
                      |- CvgCvxStakingPositionService.sol
                      |- CVX1.sol
                      |- CvxConvergenceLocker.sol
                  |-- cvxAsset/
                      |- CvxAssetStakerBuffer.sol
                      |- CvxAssetStakingService.sol
```

## Medium severity issues


- **User Rewards Stuck if Claim Not Made Regularly in StakingServiceBase**

  In the `StakingServiceBase::_claimCvgCvxRewards` function, the `maxLengthRewards` is incorrectly set to the last cycle of user interaction, causing potential loss of rewards for users who claim sporadically. If a user, such as Bob, misses claiming rewards over several cycles, only the rewards from the earliest cycle are processed, leaving subsequent rewards stuck in the contract. This happens because the for loop iterates only up to the first cycle Bob interacted with, thus ignoring additional rewards accrued in later cycles. Users consistently claiming rewards each cycle receive their rewards correctly, though inefficiencies and even missed rewards may still occur. A suggested fix involves using the `numberOfUnderlyingRewards` value to correctly set `maxLengthRewards` and cover all pending rewards.


  **Link**: [Issue #37](https://github.com/hats-finance/Convergence---Convex-integration-0xb3df23e155b74ad2b93777f58980d6727e8b40bb/issues/37)


- **Malicious Users Can Exploit getReward Function to Prevent Reward Transfers in CvxConvergenceLocker**

  After a user mints a token in CvxConvergenceLocker, anyone can trigger the lock function, causing rewards to start accruing. Initially, staking services can call pullRewards to claim these rewards via CVX_LOCKER.getReward(address). However, a vulnerability exists in the getReward function of CrxLockerV2, where if the second parameter (_stake) is set to true, the cvxCrv reward is restaked rather than transferred to the user. This function lacks proper access control, allowing a malicious user to continuously lock the cvxCrv rewards, preventing their transfer to CvxConvergenceLocker. The recommendation is to implement a withdraw function to release these locked rewards. Despite its severity, this issue is classified as medium due to its low likelihood and the potential for mitigation.


  **Link**: [Issue #40](https://github.com/hats-finance/Convergence---Convex-integration-0xb3df23e155b74ad2b93777f58980d6727e8b40bb/issues/40)

## Low severity issues


- **Potential Vulnerability in CvxConvergenceLocker Function to Transfer New Reward Tokens**

  The `sendTokens` function in `CvxConvergenceLocker` does not check for dynamically added reward tokens, allowing an owner to transfer out new rewards added through `addReward` in `CVX_LOCKER`. This can result in user rewards being sent outside the locker contract, posing a potential security risk.


  **Link**: [Issue #35](https://github.com/hats-finance/Convergence---Convex-integration-0xb3df23e155b74ad2b93777f58980d6727e8b40bb/issues/35)



## Conclusion

The audit report for the Convergence - Convex integration hosted by Hats.finance centered on a public audit competition. The two-week contest garnered 89 submissions, distributed $12,500 to four participants, and aimed to enhance protocol security by leveraging the expertise of skilled auditors. The scope of the audit included specific contracts under the Staking/Convex folder. Two medium severity issues were identified: one involved the `StakingServiceBase` contract where sporadic reward claims could result in stuck user rewards, and the other pertained to a potential exploit in the `getReward` function of `CvxConvergenceLocker`, allowing malicious actors to block reward transfers. A low severity issue was also found, highlighting the vulnerability in the `sendTokens` function that could transfer new reward tokens improperly. Overall, the audit competition demonstrated Hats.finance's commitment to decentralized security by conducting thorough assessments, reducing fees, and promoting high-quality security practices in the web3 ecosystem.

## Disclaimer


This report does not assert that the audited contracts are completely secure. Continuous review and comprehensive testing are advised before deploying critical smart contracts.


The Convergence - Convex integration audit competition illustrates the collaborative effort in identifying and rectifying potential vulnerabilities, enhancing the overall security and functionality of the platform.


Hats.finance does not provide any guarantee or warranty regarding the security of this project. Smart contract software should be used at the sole risk and responsibility of users.

