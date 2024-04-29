import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {parseEther, Signer, MaxUint256} from "ethers";
import {CvgCvxStakingPositionService, CvxConvergenceLocker, ERC20} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {TOKEN_ADDR_CVX} from "../../../../resources/tokens/common";
import {chainView} from "../../../../utils/chainview";
import artifact from "../../../../artifacts/contracts/ChainView/AmountOutStaking.sol/AmountOutStaking.json";

const TYPE_UNIV2 = 1;
const TYPE_UNIV3 = 2;
const TYPE_CURVE = 3;

describe("cvgCvxStaking - Deposit ETH", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvx: ERC20;
    let cvxConvergenceLocker: CvxConvergenceLocker;
    let cvgCvxStaking: CvgCvxStakingPositionService;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);

        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        cvxConvergenceLocker = contractsUsers.convex.cvxConvergenceLocker;
        cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;

        // approvals
        await cvx.connect(users.user1).approve(cvxConvergenceLocker, MaxUint256);
        await cvx.connect(users.user2).approve(cvxConvergenceLocker, MaxUint256);
        await cvx.connect(users.user1).approve(cvgCvxStaking, MaxUint256);
        await cvxConvergenceLocker.connect(users.user1).approve(cvgCvxStaking, MaxUint256);
        await cvxConvergenceLocker.connect(users.user2).approve(cvgCvxStaking, MaxUint256);

        // mint cvgCVX with fees because no locking
        await cvxConvergenceLocker.connect(users.user1).mint(users.user1, parseEther("100000"), false);
        await cvxConvergenceLocker.connect(users.user2).mint(users.user2, parseEther("100000"), false);
    });
    it("Fail : Depositing ETH with DEACTIVATED Eth Deposit", async () => {
        const amountEth = parseEther("1");

        const tx = await cvgCvxStaking
            .depositEth(0, 0, 0, {
                value: amountEth,
            })
            .should.be.revertedWith("DEPOSIT_ETH_PAUSED");
    });
    it("Fail : Set pool for ETH deposit for UNIV2 with wrong parameters", async () => {
        await cvgCvxStaking
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 3000,
                indexEth: 0,
                poolCurve: ethers.ZeroAddress,
                poolType: TYPE_UNIV2,
                token: TOKEN_ADDR_CVX,
            })
            .should.be.revertedWith("FEE_FOR_UNIV3");
        await cvgCvxStaking
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 0,
                indexEth: 1,
                poolCurve: ethers.ZeroAddress,
                poolType: TYPE_UNIV2,
                token: TOKEN_ADDR_CVX,
            })
            .should.be.revertedWith("INDEX_FOR_CURVE");
        await cvgCvxStaking
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 0,
                indexEth: 0,
                poolCurve: TOKEN_ADDR_CVX,
                poolType: TYPE_UNIV2,
                token: TOKEN_ADDR_CVX,
            })
            .should.be.revertedWith("POOL_FOR_CURVE");
    });
    it("Fail : Set pool for ETH deposit for UNIV3 with wrong parameters", async () => {
        await cvgCvxStaking
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 3000,
                indexEth: 1,
                poolCurve: ethers.ZeroAddress,
                poolType: TYPE_UNIV3,
                token: TOKEN_ADDR_CVX,
            })
            .should.be.revertedWith("INDEX_FOR_CURVE");
        await cvgCvxStaking
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 0,
                indexEth: 0,
                poolCurve: TOKEN_ADDR_CVX,
                poolType: TYPE_UNIV3,
                token: TOKEN_ADDR_CVX,
            })
            .should.be.revertedWith("POOL_FOR_CURVE");
    });
    it("Fail : Set pool for ETH deposit for CURVE with wrong parameters", async () => {
        const CVX_ETH_POOL_CRUVE = "0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4";
        await cvgCvxStaking
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 3000,
                indexEth: 0,
                poolCurve: CVX_ETH_POOL_CRUVE,
                poolType: TYPE_CURVE,
                token: TOKEN_ADDR_CVX,
            })
            .should.be.revertedWith("FEE_FOR_UNIV3");
        await cvgCvxStaking
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 0,
                indexEth: 1,
                poolCurve: CVX_ETH_POOL_CRUVE,
                poolType: TYPE_CURVE,
                token: TOKEN_ADDR_CVX,
            })
            .should.be.revertedWith("WRONG_INDEX_ETH");
    });
    it("Success : Set pool for ETH deposit", async () => {
        const CVX_ETH_POOL_CRUVE = "0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4";
        const poolEthInfo = {
            fee: 0,
            indexEth: 0,
            poolCurve: CVX_ETH_POOL_CRUVE,
            poolType: TYPE_CURVE,
            token: TOKEN_ADDR_CVX,
        };
        await cvgCvxStaking.connect(treasuryDao).setPoolEthInfo(poolEthInfo);
    });

    it("Success : Depositing ETH", async () => {
        const amountEth = parseEther("1");
        type ParamCall = [string, bigint];
        type AmountOutInfo = {
            amountIn: bigint;
            amountOutOne: bigint;
            amountOutTwo: bigint;
        };
        const params: ParamCall = [await cvgCvxStaking.getAddress(), amountEth];
        const [chainViewResponse] = await chainView<ParamCall, AmountOutInfo[]>(artifact.abi, artifact.bytecode, params);
        // console.log(chainViewResponse);
        const tx = await cvgCvxStaking.depositEth(0, chainViewResponse.amountOutOne, chainViewResponse.amountOutTwo, {value: amountEth}); //632625n
        // const receipt = await tx.wait();
        // console.log(receipt?.gasUsed);
    });
});
