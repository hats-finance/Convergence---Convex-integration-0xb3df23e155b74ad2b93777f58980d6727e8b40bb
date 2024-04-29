import {ethers} from "hardhat";
import {TOKEN_ADDR_FRAX, TOKEN_ADDR_USDC} from "../../../resources/tokens/common";
import {IContractsUser} from "../../../utils/contractInterface";
import {AddressLike, parseEther} from "ethers";
import {oracleCurveDuoParams, oracleCurveTriParams, oracleStableParams, oracleUniV2Params, oracleUniV3Params} from "../complete/protocol/_config";

export async function deployOracleContract(contractsUsers: IContractsUser, isIbo: boolean): Promise<IContractsUser> {
    const {users, contracts} = contractsUsers;

    const CvgOracleFactory = await ethers.getContractFactory("CvgOracle");

    const cvgOracle = await CvgOracleFactory.deploy();
    await cvgOracle.waitForDeployment();

    //transfer ownership
    await cvgOracle.transferOwnership(users.treasuryDao);
    await cvgOracle.connect(users.treasuryDao).acceptOwnership();

    for (const param of oracleStableParams) {
        await cvgOracle.connect(users.treasuryDao).setPoolTypeForToken(param.token, 1);
        await cvgOracle.connect(users.treasuryDao).setStableParams(param.token, param.oracleParams);
    }

    for (const param of oracleCurveDuoParams) {
        await cvgOracle.connect(users.treasuryDao).setPoolTypeForToken(param.token, 2);
        await cvgOracle.connect(users.treasuryDao).setCurveDuoParams(param.token, param.oracleParams);
    }

    for (const param of oracleCurveTriParams) {
        await cvgOracle.connect(users.treasuryDao).setPoolTypeForToken(param.token, 3);
        await cvgOracle.connect(users.treasuryDao).setCurveTriParams(param.token, param.oracleParams);
    }

    for (const param of oracleUniV3Params) {
        await cvgOracle.connect(users.treasuryDao).setPoolTypeForToken(param.token, 4);
        await cvgOracle.connect(users.treasuryDao).setUniV3Params(param.token, param.oracleParams);
    }

    for (const param of oracleUniV2Params) {
        await cvgOracle.connect(users.treasuryDao).setPoolTypeForToken(param.token, 5);
        await cvgOracle.connect(users.treasuryDao).setUniV2Params(param.token, param.oracleParams);
    }

    if (!isIbo) {
        await cvgOracle.connect(users.treasuryDao).setCvg(contracts.tokens.cvg);
        await cvgOracle.connect(users.treasuryDao).setPoolTypeForToken(contracts.tokens.cvg, 2);

        await cvgOracle.connect(users.treasuryDao).setCurveDuoParams(contracts.tokens.cvg, {
            poolAddress: contracts.lp.poolCvgFraxBp,
            isReversed: false,
            isEthPriceRelated: false,
            deltaLimitOracle: 1000, // 10% delta error allowed
            maxLastUpdate: 800_600_400,
            stablesToCheck: [TOKEN_ADDR_USDC, TOKEN_ADDR_FRAX],
            minPrice: 1,
            maxPrice: parseEther("1000000"),
        });
        await (await contracts.base.cvgControlTower.connect(users.treasuryDao).setOracle(cvgOracle)).wait();
    }

    return {
        users: users,
        contracts: {
            ...contracts,
            bonds: {
                ...contracts.bonds,
                cvgOracle: cvgOracle,
            },
        },
    };
}
