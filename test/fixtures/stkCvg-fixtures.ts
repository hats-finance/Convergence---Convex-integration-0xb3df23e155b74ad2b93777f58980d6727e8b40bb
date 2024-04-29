import {configureAccounts} from "./testContext";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../resources/treasury";
import {impersonateAccount} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {TOKEN_ADDR_CVG} from "../../resources/tokens/common";
import {deployProxy} from "../../utils/global/deployProxy";
import {fetchMainnetContracts} from "./stake-dao";
import {CRV_DUO_WETH_CVG} from "../../resources/cvg-mainnet";
import {StkCvg} from "../../typechain-types/contracts/Rewards/StkCvg";

export const fetchMainnetStkContracts = async () => {
    const users = await configureAccounts();
    const contracts = await fetchMainnetContracts();

    return {
        users,
        contracts,
    };
};

export const deployStkContracts = async () => {
    const contractsUsers = await fetchMainnetStkContracts();

    await contractsUsers.users.user1.sendTransaction({
        to: TREASURY_DAO,
        value: ethers.parseEther("100"),
    });

    await impersonateAccount(TREASURY_DAO);

    const stkCvgEth = await deployProxy<StkCvg>(
        "string,string,address",
        ["stkCvgEth", "Staked CVG ETH Yield", CRV_DUO_WETH_CVG],
        "StkCvg",
        contractsUsers.contracts.base.proxyAdmin
    );

    const stkCvgCvgSdt = await deployProxy<StkCvg>(
        "string,string,address",
        ["stkCvgCvgSdt", "Staked CVG cvgSDT Yield", CRV_DUO_WETH_CVG],
        "StkCvg",
        contractsUsers.contracts.base.proxyAdmin
    );
    const cvg = await ethers.getContractAt("ERC20", TOKEN_ADDR_CVG);

    return {...contractsUsers, cvg, stkCvgEth, stkCvgCvgSdt};
};
