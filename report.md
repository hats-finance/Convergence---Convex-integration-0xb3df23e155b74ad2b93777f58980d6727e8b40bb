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
- Submissions: 0
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



## Conclusion

The audit report evaluates the Convergence - Convex integration via Hats.finance's decentralized audit competition. Hats.finance fosters web3 security by leveraging decentralized audit competitions and bug bounties, where auditors compete to identify vulnerabilities in smart contracts. This model enhances the speed and cost-efficiency of audits by focusing on results and rewarding only the successful findings. The Convergence project intended to optimize yield through governance aggregation and focused its audit on the Convex protocol integration. Despite the two-week competition duration and a maximum reward of $25,000, the actual submissions were zero, leading to a total payout of $12,500 distributed among four participants. This emphasizes Hats' commitment to quality security assessments, ensuring efficient budget allocation and attracting top auditing talent, thus setting a superior standard for decentralized security solutions in the web3 ecosystem.

## Disclaimer


This report does not assert that the audited contracts are completely secure. Continuous review and comprehensive testing are advised before deploying critical smart contracts.


The Convergence - Convex integration audit competition illustrates the collaborative effort in identifying and rectifying potential vulnerabilities, enhancing the overall security and functionality of the platform.


Hats.finance does not provide any guarantee or warranty regarding the security of this project. Smart contract software should be used at the sole risk and responsibility of users.

