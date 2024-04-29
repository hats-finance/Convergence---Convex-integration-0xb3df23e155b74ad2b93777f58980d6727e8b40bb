import {impersonateAccount, time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers, upgrades} from "hardhat";
import {TREASURY_DAO} from "../../resources/treasury";
import {fetchMainnetContracts} from "./stake-dao";
import {TOKEN_ADDR_USDC, TOKEN_ADDR_WETH} from "../../resources/tokens/common";
import {ONE_WEEK} from "../../resources/constant";

export async function deployBondDepositoryV2() {
    const mainnetContracts = await fetchMainnetContracts();

    await mainnetContracts.users.user1.sendTransaction({
        to: TREASURY_DAO,
        value: ethers.parseEther("100"),
    });

    await impersonateAccount(TREASURY_DAO);
    const treasuryDao = await ethers.getSigner(TREASURY_DAO);
    const proxyAdmin = mainnetContracts.base.proxyAdmin;

    /// Migration ControlTower V2
    const BondDepositoryFactory = await ethers.getContractFactory("BondDepository");
    const BondDepositoryV2Factory = await ethers.getContractFactory("BondDepositoryV2");
    await upgrades.validateUpgrade(BondDepositoryFactory, BondDepositoryV2Factory);

    let bondDepositoryV2 = await ethers.deployContract("BondDepositoryV2", []);
    await bondDepositoryV2.waitForDeployment();

    await proxyAdmin.connect(treasuryDao).upgrade(mainnetContracts.bondDepository, bondDepositoryV2);
    bondDepositoryV2 = await ethers.getContractAt("BondDepositoryV2", mainnetContracts.bondDepository);

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;

    await bondDepositoryV2.connect(treasuryDao).createBond([
        {
            bondParams: {
                composedFunction: 0,
                token: TOKEN_ADDR_WETH,
                gamma: 250000n,
                bondDuration: ONE_WEEK,
                isPaused: false,
                scale: 500,
                minRoi: 100_000,
                maxRoi: 150_000,
                percentageOneTx: 200,
                vestingTerm: 0,
                cvgToSell: ethers.parseEther("100000"),
                startBondTimestamp: now + 100,
            },
            isLockMandatory: true,
        },

        {
            bondParams: {
                composedFunction: 0,
                token: TOKEN_ADDR_WETH,
                gamma: 250000n,
                bondDuration: ONE_WEEK,
                isPaused: false,
                scale: 500,
                minRoi: 100_000,
                maxRoi: 150_000,
                percentageOneTx: 200,
                vestingTerm: 0,
                cvgToSell: ethers.parseEther("100000"),
                startBondTimestamp: now + 100,
            },
            isLockMandatory: false,
        },

        {
            bondParams: {
                composedFunction: 0,
                token: TOKEN_ADDR_USDC,
                gamma: 250000n,
                bondDuration: ONE_WEEK,
                isPaused: false,
                scale: 500,
                minRoi: 100_000,
                maxRoi: 150_000,
                percentageOneTx: 200,
                vestingTerm: 0,
                cvgToSell: ethers.parseEther("100000"),
                startBondTimestamp: now + 100,
            },
            isLockMandatory: true,
        },

        {
            bondParams: {
                composedFunction: 0,
                token: TOKEN_ADDR_USDC,
                gamma: 250000n,
                bondDuration: ONE_WEEK,
                isPaused: false,
                scale: 500,
                minRoi: 100_000,
                maxRoi: 150_000,
                percentageOneTx: 200,
                vestingTerm: 0,
                cvgToSell: ethers.parseEther("100000"),
                startBondTimestamp: now + 100,
            },
            isLockMandatory: false,
        },
    ]);
    await time.increase(100);

    return {
        mainnetContracts,
        bondDepositoryV2,
    };
}

deployBondDepositoryV2();
