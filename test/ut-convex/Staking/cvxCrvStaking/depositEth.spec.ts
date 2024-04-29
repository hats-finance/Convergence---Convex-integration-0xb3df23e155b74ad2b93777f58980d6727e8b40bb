import {ethers} from "hardhat";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";

import {MINT, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_5} from "../../../../resources/constant";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {parseEther, Signer, MaxUint256} from "ethers";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {CVX_CRV_DEPOSITOR, CVX_CRV_REWARDS, CVX_CRV_WRAPPER, TOKEN_ADDR_CVX_CRV} from "../../../../resources/convex";
import {CRV_DUO_cvxCRV_CRV} from "../../../../resources/lp";
import {CvxAssetStakerBuffer, CvxAssetStakingService, ERC20, IAssetDepositor, ICrvPoolPlain, ICvxAssetWrapper} from "../../../../typechain-types";
import {chainView} from "../../../../utils/chainview";
import artifact from "../../../../artifacts/contracts/ChainView/AmountOutStaking.sol/AmountOutStaking.json";
import {TOKEN_ADDR_CRV} from "../../../../resources/tokens/common";
import {TREASURY_DAO} from "../../../../resources/treasury";
const DEACTIVATED = 0;
const TYPE_UNIV2 = 1;
const TYPE_UNIV3 = 2;
const TYPE_CURVE = 3;
describe("cvxCrv - Deposit & Withdraw", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvxCrvStakingPositionService: CvxAssetStakingService;
    let cvxCrvStakerBuffer: CvxAssetStakerBuffer;
    let cvxCrvWrapper: ICvxAssetWrapper;
    let crvDepositor: IAssetDepositor;
    let cvxAsset_asset_stablePool: ICrvPoolPlain;
    let cvxCrv: ERC20, crv: ERC20;
    let currentCycle: bigint;
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        treasuryDao = await ethers.getSigner(TREASURY_DAO);
        cvxCrvStakingPositionService = contractsUsers.convex.cvxCrvStakingPositionService;
        cvxCrvStakerBuffer = contractsUsers.convex.cvxCrvStakerBuffer;

        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();

        crv = contractsUsers.contractsUserMainnet.globalAssets["crv"];
        cvxCrv = contractsUsers.contractsUserMainnet.convexAssets!["cvxCrv"];

        cvxCrvWrapper = await ethers.getContractAt("ICvxAssetWrapper", CVX_CRV_WRAPPER);
        crvDepositor = await ethers.getContractAt("IAssetDepositor", CVX_CRV_DEPOSITOR);
        cvxAsset_asset_stablePool = await ethers.getContractAt("ICrvPoolPlain", CRV_DUO_cvxCRV_CRV);
    });
    it("Fail : Depositing ETH with DEACTIVATED Eth Deposit", async () => {
        const amountEth = parseEther("1");

        const tx = await cvxCrvStakingPositionService
            .depositEth(0, 0, 0, false, false, {
                value: amountEth,
            })
            .should.be.revertedWith("DEPOSIT_ETH_PAUSED");
    });
    it("Fail : Set pool for ETH deposit for UNIV2 with wrong parameters", async () => {
        await cvxCrvStakingPositionService
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 3000,
                indexEth: 0,
                poolCurve: ethers.ZeroAddress,
                poolType: TYPE_UNIV2,
                token: TOKEN_ADDR_CRV,
            })
            .should.be.revertedWith("FEE_FOR_UNIV3");
        await cvxCrvStakingPositionService
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 0,
                indexEth: 1,
                poolCurve: ethers.ZeroAddress,
                poolType: TYPE_UNIV2,
                token: TOKEN_ADDR_CRV,
            })
            .should.be.revertedWith("INDEX_FOR_CURVE");
        await cvxCrvStakingPositionService
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 0,
                indexEth: 0,
                poolCurve: TOKEN_ADDR_CRV,
                poolType: TYPE_UNIV2,
                token: TOKEN_ADDR_CRV,
            })
            .should.be.revertedWith("POOL_FOR_CURVE");
    });
    it("Fail : Set pool for ETH deposit for UNIV3 with wrong parameters", async () => {
        await cvxCrvStakingPositionService
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 3000,
                indexEth: 1,
                poolCurve: ethers.ZeroAddress,
                poolType: TYPE_UNIV3,
                token: TOKEN_ADDR_CRV,
            })
            .should.be.revertedWith("INDEX_FOR_CURVE");
        await cvxCrvStakingPositionService
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 0,
                indexEth: 0,
                poolCurve: TOKEN_ADDR_CRV,
                poolType: TYPE_UNIV3,
                token: TOKEN_ADDR_CRV,
            })
            .should.be.revertedWith("POOL_FOR_CURVE");
    });
    it("Fail : Set pool for ETH deposit for CURVE with wrong parameters", async () => {
        const CVX_ETH_POOL_CRUVE = "0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4";
        await cvxCrvStakingPositionService
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 3000,
                indexEth: 1,
                poolCurve: CVX_ETH_POOL_CRUVE,
                poolType: TYPE_CURVE,
                token: TOKEN_ADDR_CRV,
            })
            .should.be.revertedWith("FEE_FOR_UNIV3");

        await cvxCrvStakingPositionService
            .connect(treasuryDao)
            .setPoolEthInfo({
                fee: 0,
                indexEth: 1,
                poolCurve: CVX_ETH_POOL_CRUVE,
                poolType: TYPE_CURVE,
                token: TOKEN_ADDR_CRV,
            })
            .should.be.revertedWith("WRONG_INDEX_ETH");
    });
    it("Success : Set pool for ETH deposit", async () => {
        // const CVR_ETH_POOL_UNIV3 = "0x919Fa96e88d67499339577Fa202345436bcDaf79";
        const poolEthInfo = {
            fee: 3000,
            indexEth: 0,
            poolCurve: ethers.ZeroAddress,
            poolType: TYPE_UNIV3,
            token: TOKEN_ADDR_CRV,
        };
        await cvxCrvStakingPositionService.connect(treasuryDao).setPoolEthInfo(poolEthInfo);
    });
    it("Success : Depositing ETH", async () => {
        const amountEth = parseEther("1");
        type ParamCall = [string, bigint];
        type AmountOutInfo = {
            amountIn: bigint;
            amountOutOne: bigint;
            amountOutTwo: bigint;
        };
        const params: ParamCall = [await cvxCrvStakingPositionService.getAddress(), amountEth];
        const [chainViewResponse] = await chainView<ParamCall, AmountOutInfo[]>(artifact.abi, artifact.bytecode, params);
        const tx = await cvxCrvStakingPositionService.depositEth(0, chainViewResponse.amountOutOne, chainViewResponse.amountOutTwo, false, false, {
            value: amountEth,
        }); //544 087 (false,false) / 544 087 (true,false) / 976 219 (true,true)
        await expect(tx).to.changeTokenBalances(cvxCrv, [cvxCrvStakerBuffer], [chainViewResponse.amountOutTwo]);
        expect(await cvxCrvStakingPositionService.tokenInfoByCycle(currentCycle + 1n, TOKEN_1)).to.be.deep.equal([
            chainViewResponse.amountOutTwo,
            chainViewResponse.amountOutTwo,
        ]);
    });
});
