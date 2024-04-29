import {ethers, network} from "hardhat";
import {Cvg, VestingCvg, CvgOracle} from "../../../../../typechain-types";
import {MaxUint256, ZeroAddress, parseEther} from "ethers";
import {FACTORY_POOL} from "../../../../../resources/curve";
import {CVG_CONTRACT, VESTING_CONTRACT, ORACLE_CONTRACT, CVG_POOL} from "../../../../../resources/contracts";
import {IUsers} from "../../../../../utils/contractInterface";
import {CRV_DUO_FRAXBP} from "../../../../../resources/lp";
import {TOKEN_ADDR_FRAX, TOKEN_ADDR_USDC, TOKEN_ADDR_WETH, TOKEN_ADDR_crvUSD} from "../../../../../resources/tokens/common";
import {getContract, txCheck, getAddress} from "../../../complete/helper";
import {TREASURY_DAO} from "../../../../../resources/treasury";
import {getSigner} from "@openzeppelin/hardhat-upgrades/dist/utils";
export const deployCvgPool = async (u: IUsers) => {
    console.info("\x1b[33m ************ CvgPool deployment ************ \x1b[0m");

    const vestingCvgContract = await getContract<VestingCvg>(VESTING_CONTRACT);
    const cvgContract = await getContract<Cvg>(CVG_CONTRACT);
    const cvgOracle = await getContract<CvgOracle>(ORACLE_CONTRACT);

    // await txCheck(async () => {
    //     await network.provider.send("evm_increaseTime", [1000]);
    //     await network.provider.send("hardhat_mine", []);
    //     await (await vestingCvgContract.connect(u.treasuryDao).releaseTeamOrDao(false)).wait();
    //     const amountCvg = parseEther("227272");
    //     return cvgContract.connect(u.treasuryDao).transfer(u.owner, amountCvg);
    // }, "RELEASE_CLIFF_DAO");

    // await txCheck(
    //     async () => {
    //         const fraxBpContract = await ethers.getContractAt("ERC20", CRV_DUO_FRAXBP);
    //         const poolParams = {
    //             name: "CVG/FRAXBP",
    //             symbol: "CVGFRAXBP",
    //             coin0: fraxBpContract,
    //             coin1: cvgContract,
    //             price: 330000000000000000n, // 0.33 $
    //         };
    //         const curveFactory = await ethers.getContractAt("ICrvFactory", FACTORY_POOL);
    //         const tx = await curveFactory.deploy_pool(
    //             poolParams.name,
    //             poolParams.symbol,
    //             [fraxBpContract, cvgContract],
    //             "400000", //A
    //             "145000000000000", //gamma
    //             "26000000", //mid_fee
    //             "45000000", //out_fee
    //             "2000000000000", //allowed_extra_profit
    //             "230000000000000", //fee_gamma
    //             "146000000000000", //adjustment_step
    //             "5000000000", //admin_fee
    //             "600", //ma_half_time
    //             poolParams.price //initial_price
    //         );
    //         await u.owner.sendTransaction({
    //             to: TREASURY_DAO,
    //             value: parseEther("1"),
    //         });
    //         await network.provider.request({
    //             method: "hardhat_impersonateAccount",
    //             params: [TREASURY_DAO],
    //         });
    //         console.log("cvg bal", await cvgContract.balanceOf(TREASURY_DAO));
    //         console.log("fraxBp bal", await fraxBpContract.balanceOf(u.owner));
    //         const amountStable = parseEther("75000");
    //         const amountCvg = parseEther("227272");
    //         await cvgContract.connect(await ethers.getSigner(TREASURY_DAO)).transfer(u.owner, amountCvg);
    //         console.log("cvg transfer done");

    //         await tx.wait();
    //         const poolAddress = await curveFactory.find_pool_for_coins(poolParams.coin0, poolParams.coin1, 0);
    //         const cvgPoolContract = await ethers.getContractAt("ICrvPool", poolAddress);
    //         await (await poolParams.coin0.approve(poolAddress, MaxUint256)).wait();
    //         await (await poolParams.coin1.approve(poolAddress, MaxUint256)).wait();

    //         await (await cvgPoolContract.add_liquidity([amountStable, amountCvg], "0")).wait();

    //         return cvgPoolContract;
    //     },
    //     "DEPLOY_CVG_POOL",
    //     CVG_POOL
    // );
    await txCheck(
        async () => {
            const amountStable = parseEther("30000");
            const amountCvg = parseEther("90909");
            const amountWeth = parseEther("13.08");
            const crvUsdContract = await ethers.getContractAt("ERC20", TOKEN_ADDR_crvUSD);
            const wethContract = await ethers.getContractAt("IWETH", TOKEN_ADDR_WETH);
            await wethContract.deposit({value: amountWeth});
            // const poolParams = {
            //     name: "CVG/FRAXBP",
            //     symbol: "CVGFRAXBP",
            //     coin0: fraxBpContract,
            //     coin1: cvgContract,
            //     price: 330000000000000000n, // 0.33 $
            // };
            const curveFactoryTri = await ethers.getContractAt("ICurveTriFactory", "0x0c0e5f2fF0ff18a3be9b835635039256dC4B4963");
            const tx = await curveFactoryTri.deploy_pool(
                "triCVG", //name
                "triCVG", //symbol
                [TOKEN_ADDR_crvUSD, TOKEN_ADDR_WETH, await cvgContract.getAddress()], //coins
                TOKEN_ADDR_WETH, //weth
                "0", //implementation_idx
                "2700000", //A
                "1300000000000", //gamma
                "2999999", //mid_fee
                "80000000", //out_fee
                "350000000000000", //fee_gamma
                "100000000000", //allowed_extra_profit
                "100000000000", //adjustment_step
                "865", //ma_exp_time
                ["2200000000000000000000", "330000000000000000"] //initial_prices
            );
            console.log("pool deployed");

            await u.owner.sendTransaction({
                to: TREASURY_DAO,
                value: parseEther("1"),
            });
            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [TREASURY_DAO],
            });

            // console.log("fraxBp bal", await fraxBpContract.balanceOf(u.owner));

            await cvgContract.connect(await ethers.getSigner(TREASURY_DAO)).transfer(u.owner, amountCvg);
            // console.log("cvg transfer done");

            await tx.wait();
            const poolAddress = await curveFactoryTri.find_pool_for_coins(TOKEN_ADDR_WETH, await cvgContract.getAddress(), 0);
            // console.log("poolAddress", poolAddress);
            const cvgPoolContract = await ethers.getContractAt("ITriCrvPool", poolAddress);
            // console.log("crvUsd bal", await crvUsdContract.balanceOf(u.owner));
            // console.log("weth bal", await wethContract.balanceOf(u.owner));
            // console.log("cvg bal", await cvgContract.balanceOf(u.owner));
            await (await crvUsdContract.approve(poolAddress, MaxUint256)).wait();
            await (await wethContract.approve(poolAddress, MaxUint256)).wait();
            await (await cvgContract.approve(poolAddress, MaxUint256)).wait();

            console.log("token approved !");
            await (await cvgPoolContract.add_liquidity([amountStable, amountWeth, amountCvg], "0", false)).wait();

            return cvgPoolContract;
        },
        "DEPLOY_CVG_TRI_POOL",
        CVG_POOL
    );

    await txCheck(async () => {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [TREASURY_DAO],
        });
        return cvgOracle.connect(await ethers.getSigner(TREASURY_DAO)).setPoolTypeForToken(getAddress(CVG_CONTRACT), 3);
    }, "SET_CVG_POOL_TYPE_IN_ORACLE");

    // await txCheck(async () => {
    //     await network.provider.request({
    //         method: "hardhat_impersonateAccount",
    //         params: [TREASURY_DAO],
    //     });
    //     return cvgOracle.connect(await ethers.getSigner(TREASURY_DAO)).setCurveTriParams(getAddress(CVG_CONTRACT), {
    //         poolAddress: getAddress(CVG_POOL),
    //         isReversed: false,
    //         isEthPriceRelated: false,
    //         deltaLimitOracle: 1000, // 10% delta error allowed
    //         maxLastUpdate: 800_600_400,
    //         k: 1,
    //         minPrice: "1",
    //         maxPrice: parseEther("1000000"),
    //         stablesToCheck: [TOKEN_ADDR_crvUSD],
    //     });
    // }, "SET_CVG_POOL_CURVE_PARAMS_IN_ORACLE");
    await txCheck(async () => {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [TREASURY_DAO],
        });
        return cvgOracle.connect(await ethers.getSigner(TREASURY_DAO)).setCurveTriParams(getAddress(CVG_CONTRACT), {
            poolAddress: getAddress(CVG_POOL),
            isReversed: false,
            isEthPriceRelated: false,
            deltaLimitOracle: 1000, // 10% delta error allowed
            maxLastUpdate: 800_600_400,
            k: 1,
            minPrice: "1",
            maxPrice: parseEther("1000000"),
            stablesToCheck: [TOKEN_ADDR_crvUSD],
        });
    }, "SET_CVG_POOL_CURVE_PARAMS_IN_ORACLE2");

    // await txCheck(async () => {
    //     await network.provider.request({
    //         method: "hardhat_impersonateAccount",
    //         params: [TREASURY_DAO],
    //     });
    //     return cvgOracle.connect(await ethers.getSigner(TREASURY_DAO)).setCurveDuoParams(getAddress(CVG_CONTRACT), {
    //         poolAddress: getAddress(CVG_POOL),
    //         isReversed: false,
    //         isEthPriceRelated: false,
    //         deltaLimitOracle: 1000, // 10% delta error allowed
    //         maxLastUpdate: 800_600_400,
    //         minPrice: "1",
    //         maxPrice: parseEther("1000000"),
    //         stablesToCheck: [TOKEN_ADDR_USDC, TOKEN_ADDR_FRAX],
    //     });
    // }, "SET_CVG_POOL_CURVE_PARAMS_IN_ORACLE");
};
