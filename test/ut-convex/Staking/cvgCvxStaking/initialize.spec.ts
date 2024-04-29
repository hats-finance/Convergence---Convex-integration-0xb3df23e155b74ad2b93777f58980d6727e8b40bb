import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {ZeroAddress} from "ethers";
import {CvgCvxStakingPositionService, ProxyAdmin} from "../../../../typechain-types";
import {deployProxy} from "../../../../utils/global/deployProxy";

describe("cvgCvxStaking - Initialize tests", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers;
    let cvgCvxStaking: CvgCvxStakingPositionService;
    let proxyAdmin: ProxyAdmin;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;

        cvgCvxStaking = contractsUsers.convex.cvgCvxStakingPositionService;
        proxyAdmin = contractsUsers.contractsUserMainnet.base.proxyAdmin;
    });

    it("Fails : Initialize contract again", async () => {
        await cvgCvxStaking.initialize(users.user1, users.user2, users.user1, "STK-cvgCVX").should.be.revertedWith("Initializable: contract is already initialized");
    });

    it("Fails : Deploy CvgCvxStakingPositionService with OxO address as Locker", async () => {
        await deployProxy<CvgCvxStakingPositionService>(
            "address,address,address,string",
            [ZeroAddress, ZeroAddress, ZeroAddress, "STK-cvgCVX"],
            "CvgCvxStakingPositionService",
            proxyAdmin
        ).should.be.revertedWith("CVG_LOCKER_ZERO");
    });

    it("Fails : Deploy CvgCvxStakingPositionService with OxO address as Locker", async () => {
        await deployProxy<CvgCvxStakingPositionService>(
            "address,address,address,string",
            [ZeroAddress, ZeroAddress, ZeroAddress, "STK-cvgCVX"],
            "CvgCvxStakingPositionService",
            proxyAdmin
        ).should.be.revertedWith("CVG_LOCKER_ZERO");
    });
});