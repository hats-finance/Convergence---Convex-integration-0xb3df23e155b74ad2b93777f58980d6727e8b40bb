import {FACTORY_PLAIN_POOL} from "../../../resources/curve";
import {TOKEN_ADDR_SDT} from "../../../resources/tokens/common";
import {ICrvPoolPlain} from "../../../typechain-types";
import {IContractsUser} from "../../../utils/contractInterface";
import {ethers} from "hardhat";

export async function deployLiquidityCvgSdt(contractsUsers: IContractsUser, isSetAndApprove: boolean): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;
    const tokens = contracts.tokens;
    const NEW_FACTORY_PLAIN_POOL = "0x6a8cbed756804b16e05e741edabd5cb544ae21bf";
    const curveFactoryPlain = await ethers.getContractAt("ICrvFactoryPlain", NEW_FACTORY_PLAIN_POOL);

    const cvgSdt = tokens.cvgSdt;
    const sdt = tokens.sdt;
    const AddressZero = ethers.ZeroAddress;

    const tx = await curveFactoryPlain.deploy_plain_pool(
        "cvgSDT/SDT", //name
        "cvgSDTSDT", //symbol
        [sdt, cvgSdt], //coins
        37, //A
        10000000, //fee
        20000000000, //_offpeg_fee_multiplier
        866, //_ma_exp_time
        0, //_implementation_idx
        [0, 0], //_asset_types
        ["0x00000000", "0x00000000"], //_method_ids
        [ethers.ZeroAddress, ethers.ZeroAddress]
    );

    await tx.wait();
    const poolAddress = await curveFactoryPlain.find_pool_for_coins(sdt, cvgSdt);
    const cvgSdtPoolContract = await ethers.getContractAt("ICrvPoolPlain", poolAddress);
    const amount = ethers.parseEther("10000");

    await sdt.approve(cvgSdt, amount);
    await cvgSdt.mint(users.owner, amount);

    await (await sdt.approve(poolAddress, ethers.MaxUint256)).wait();
    await (await cvgSdt.approve(poolAddress, ethers.MaxUint256)).wait();

    await cvgSdtPoolContract["add_liquidity(uint256[],uint256)"]([amount, amount], "0"); //1$

    await (await contracts.base.cvgControlTower.connect(users.treasuryDao).setPoolCvgSdt(cvgSdtPoolContract)).wait();

    return {
        ...contractsUsers,
        contracts: {
            ...contracts,
            lp: {
                ...contracts.lp,
                stablePoolCvgSdt: cvgSdtPoolContract,
            },
        },
    };
}
