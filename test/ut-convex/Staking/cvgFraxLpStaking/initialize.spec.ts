import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {IContractsConvex} from "../../../../utils/contractInterface";
import {
    CvgFraxLpLocker,
    CvgFraxLpStakingService,
    ProxyAdmin
} from "../../../../typechain-types";
import {ZeroAddress} from "ethers";
import {TOKEN_ADDR_CRV, TOKEN_ADDR_CVX, TOKEN_ADDR_FXS} from "../../../../resources/tokens/common";
import {deployProxy} from "../../../../utils/global/deployProxy";

describe("cvgFraxLpStaking - Initialize", () => {
    let contractsUsers: IContractsConvex;
    let cvgeUSDFRAXBPStaking: CvgFraxLpStakingService;
    let cvgeUSDFRAXBPLocker: CvgFraxLpLocker;
    let proxyAdmin: ProxyAdmin;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);

        proxyAdmin = contractsUsers.contractsUserMainnet.base.proxyAdmin;
        cvgeUSDFRAXBPStaking = contractsUsers.convex.cvgFraxLpStaking.cvgeUSDFRAXBPStaking;
        cvgeUSDFRAXBPLocker = contractsUsers.convex.cvgFraxLpLocker.cvgeUSDFRAXBPLocker;
    });

    it("Fail: initialize cvgeUSDFRAXBPLocker again", async () => {
        await cvgeUSDFRAXBPLocker
            .initialize(0, TOKEN_ADDR_CVX, "", "", [TOKEN_ADDR_CVX, TOKEN_ADDR_CVX], [TOKEN_ADDR_CVX, TOKEN_ADDR_CVX], ZeroAddress, ZeroAddress)
            .should.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Fails : Initialize contract with CVX as coin", async () => {
        await deployProxy<CvgFraxLpLocker>(
            "uint256,address,string,string,address[2],address[2],address,address",
            [1, ZeroAddress, "NONE", "NONE", [TOKEN_ADDR_CVX, TOKEN_ADDR_CVX], [TOKEN_ADDR_CVX, TOKEN_ADDR_CVX], ZeroAddress, ZeroAddress],
            "CvgFraxLpLocker",
            proxyAdmin
        ).should.be.revertedWith("COIN_IS_CVX");
    });

    it("Fails : Initialize contract with CRV as coin", async () => {
        await deployProxy<CvgFraxLpLocker>(
            "uint256,address,string,string,address[2],address[2],address,address",
            [1, ZeroAddress, "NONE", "NONE", [TOKEN_ADDR_CRV, TOKEN_ADDR_CRV], [TOKEN_ADDR_CRV, TOKEN_ADDR_CRV], ZeroAddress, ZeroAddress],
            "CvgFraxLpLocker",
            proxyAdmin
        ).should.be.revertedWith("COIN_IS_CRV");
    });

    it("Fails : Initialize contract with FXS as coin", async () => {
        await deployProxy<CvgFraxLpLocker>(
            "uint256,address,string,string,address[2],address[2],address,address",
            [1, ZeroAddress, "NONE", "NONE", [TOKEN_ADDR_FXS, TOKEN_ADDR_FXS], [TOKEN_ADDR_FXS, TOKEN_ADDR_FXS], ZeroAddress, ZeroAddress],
            "CvgFraxLpLocker",
            proxyAdmin
        ).should.be.revertedWith("COIN_IS_FXS");
    });

    it("Fail: initialize cvgeUSDFRAXBPStaking again", async () => {
        await cvgeUSDFRAXBPStaking
            .initialize(ZeroAddress, "NONE")
            .should.be.revertedWith("Initializable: contract is already initialized");
    })

    it("Fail: initialize cvgeUSDFRAXBPStaking with 0x0 as Locker", async () => {
        await deployProxy<CvgFraxLpStakingService>(
            "address,string",
            [ZeroAddress, "NONE"],
            "CvgFraxLpStakingService",
            proxyAdmin
        ).should.be.revertedWith("CVG_LOCKER_ZERO");
    });
});