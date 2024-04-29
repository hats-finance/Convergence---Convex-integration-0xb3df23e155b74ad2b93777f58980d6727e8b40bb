import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
const expect = chai.expect;
import {
    BondDepository,
    BondPositionManager,
    CloneFactory,
    CvgControlTower,
    CvgRewards,
    CvgSdtBuffer,
    LockingPositionManager,
    LockingPositionService,
    MockFeeDistributor,
    ProxyAdmin,
    SdtBlackHole,
    SdtRewardDistributor,
    SdtStakingLogo,
    SdtStakingPositionManager,
    SdtStakingPositionService,
    YsDistributor,
} from "../../../typechain-types";
import {Signer, ZeroAddress} from "ethers";
import {ethers} from "hardhat";
import {deployProxy} from "../../../utils/global/deployProxy";
import {TRANSFER_ERC20} from "../../../resources/signatures";
import {deployOnlyControlTower} from "../../fixtures/testContext";
import {deployMockFeeDistributor} from "../../../scripts/deployer/unit/XX_deployMockFeeDistributor";
import {IContractsUser} from "../../../utils/contractInterface";
import {TOKEN_ADDR_SD_FRAX_3CRV} from "../../../resources/tokens/stake-dao";

describe("Coverage Initialize", () => {
    let cvgControlTower: CvgControlTower, proxyAdmin: ProxyAdmin, mockFeeDistributor: MockFeeDistributor, cloneFactory: CloneFactory;
    let user1: Signer, user10: Signer, user11: Signer, treasuryDao: Signer;
    let contractsUsers: IContractsUser;

    before(async () => {
        contractsUsers = await deployOnlyControlTower();
        contractsUsers = await deployMockFeeDistributor(contractsUsers);
        const contracts = contractsUsers.contracts;
        const users = contractsUsers.users;
        proxyAdmin = contracts.base.proxyAdmin;
        cvgControlTower = contracts.base.cvgControlTower;
        cloneFactory = contracts.base.cloneFactory;
        mockFeeDistributor = contracts.tests.mockFeeDistributor;
        user1 = users.user1;
        user10 = users.user10;
        user11 = users.user11;
        treasuryDao = users.treasuryDao;
        //unset addresses on controlTower
        await cvgControlTower.connect(treasuryDao).setTreasuryPod(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setTreasuryPdd(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setVeSdtMultisig(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setTreasuryDao(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setTreasuryAirdrop(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setTreasuryTeam(ZeroAddress);
    });
    it("Fail: initialize cvgControlTower", async () => {
        await cvgControlTower
            .initialize(user1, user1, user1, user1, user1, user1, user1)
            .should.be.revertedWith("Initializable: contract is already initialized");
    });
    it("Deploy cvgControlTower should revert", async () => {
        const sigParams = "address,address,address,address,address,address,address";
        await deployProxy<CvgControlTower>(
            sigParams,
            [
                ZeroAddress,
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
            ],
            "CvgControlTower",
            proxyAdmin
        ).should.be.revertedWith("TREASURY_POD_ZERO");
        await deployProxy<CvgControlTower>(
            sigParams,
            [
                await user1.getAddress(),
                ZeroAddress,
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
            ],
            "CvgControlTower",
            proxyAdmin
        ).should.be.revertedWith("TREASURY_PDD_ZERO");
        await deployProxy<CvgControlTower>(
            sigParams,
            [
                await user1.getAddress(),
                await user1.getAddress(),
                ZeroAddress,
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
            ],
            "CvgControlTower",
            proxyAdmin
        ).should.be.revertedWith("VESDT_MULTISIG_ZERO");
        await deployProxy<CvgControlTower>(
            sigParams,
            [
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                ZeroAddress,
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
            ],
            "CvgControlTower",
            proxyAdmin
        ).should.be.revertedWith("TREASURY_DAO_ZERO");
        await deployProxy<CvgControlTower>(
            sigParams,
            [
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                ZeroAddress,
                await user1.getAddress(),
                await user1.getAddress(),
            ],
            "CvgControlTower",
            proxyAdmin
        ).should.be.revertedWith("TREASURY_AIRDROP_ZERO");
        await deployProxy<CvgControlTower>(
            sigParams,
            [
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                ZeroAddress,
                await user1.getAddress(),
            ],
            "CvgControlTower",
            proxyAdmin
        ).should.be.revertedWith("TREASURY_TEAM_ZERO");
        await deployProxy<CvgControlTower>(
            sigParams,
            [
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                await user1.getAddress(),
                ZeroAddress,
            ],
            "CvgControlTower",
            proxyAdmin
        ).should.be.revertedWith("TREASURY_PARTNERS_ZERO");
    });
    it("Deploy LockingPositionManager should revert", async () => {
        const sigParams = "address";
        const params = [await cvgControlTower.getAddress()];
        await deployProxy<LockingPositionManager>(sigParams, params, "LockingPositionManager", proxyAdmin).should.be.revertedWith("DELEGATION_ZERO");
    });
    it("Deploy LockingPositionService should revert", async () => {
        const sigParams = "address";
        const params = [await cvgControlTower.getAddress()];
        await deployProxy<LockingPositionService>(sigParams, params, "LockingPositionService", proxyAdmin).should.be.revertedWith("CVG_ZERO");
    });
    it("Deploy SdtFeeCollector should revert", async () => {
        const SdtFeeCollectorFactory = await ethers.getContractFactory("SdtFeeCollector");
        await SdtFeeCollectorFactory.deploy(cvgControlTower).should.be.revertedWith("SDT_ZERO");
        await cvgControlTower.connect(treasuryDao).setSdt(user1);
        await SdtFeeCollectorFactory.deploy(cvgControlTower).should.be.revertedWith("CVGSDT_BUFFER_ZERO");
        await cvgControlTower.connect(treasuryDao).setCvgSdtBuffer(user1);
        await SdtFeeCollectorFactory.deploy(cvgControlTower).should.be.revertedWith("TRESO_POD_ZERO");
        await cvgControlTower.connect(treasuryDao).setTreasuryPod(user1);
        await SdtFeeCollectorFactory.deploy(cvgControlTower).should.be.revertedWith("TRESO_DAO_ZERO");
        //unset
        await cvgControlTower.connect(treasuryDao).setSdt(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setCvgSdtBuffer(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setTreasuryPod(ZeroAddress);
    });

    it("Deploy CvgSdtStaking should revert", async () => {
        const sigParams = "address,address,string,bool,(address,bytes)";
        let params = [await cvgControlTower.getAddress(), ZeroAddress, "STK-cvgSDT", false, [ZeroAddress, TRANSFER_ERC20]];
        await deployProxy<SdtStakingPositionService>(sigParams, params, "SdtStakingPositionService", proxyAdmin).should.be.revertedWith("STAKING_ASSET_ZERO");
        params = [await cvgControlTower.getAddress(), await user1.getAddress(), "STK-cvgSDT", false, [ZeroAddress, TRANSFER_ERC20]];
        await deployProxy<SdtStakingPositionService>(sigParams, params, "SdtStakingPositionService", proxyAdmin).should.be.revertedWith("CVGSDT_BUFFER_ZERO");
        params = [await cvgControlTower.getAddress(), await user1.getAddress(), "STK-cvgSDT", true, [ZeroAddress, TRANSFER_ERC20]];
        await deployProxy<SdtStakingPositionService>(sigParams, params, "SdtStakingPositionService", proxyAdmin).should.be.revertedWith("SDT_BLACKHOLE_ZERO");
        await cvgControlTower.connect(treasuryDao).setSdtBlackHole(user1);

        await cvgControlTower.connect(treasuryDao).setCvgSdt(user1);
        params = [await cvgControlTower.getAddress(), await user1.getAddress(), "STK-cvgSDT", true, [ZeroAddress, TRANSFER_ERC20]];
        await deployProxy<SdtStakingPositionService>(sigParams, params, "SdtStakingPositionService", proxyAdmin).should.be.revertedWith("CVG_ZERO");
        await cvgControlTower.connect(treasuryDao).setCvg(user1);

        params = [await cvgControlTower.getAddress(), await user1.getAddress(), "STK-cvgSDT", true, [ZeroAddress, TRANSFER_ERC20]];
        await deployProxy<SdtStakingPositionService>(sigParams, params, "SdtStakingPositionService", proxyAdmin).should.be.revertedWith(
            "SDT_REWARD_RECEIVER_ZERO"
        );
        await cvgControlTower.connect(treasuryDao).setSdtRewardDistributor(treasuryDao);

        params = [await cvgControlTower.getAddress(), await user1.getAddress(), "STK-cvgSDT", true, [ZeroAddress, TRANSFER_ERC20]];
        await deployProxy<SdtStakingPositionService>(sigParams, params, "SdtStakingPositionService", proxyAdmin).should.be.revertedWith(
            "SDT_STAKING_MANAGER_ZERO"
        );
        await cvgControlTower.connect(treasuryDao).setSdtStakingPositionManager(treasuryDao);

        params = [await cvgControlTower.getAddress(), await user1.getAddress(), "STK-cvgSDT", true, [ZeroAddress, TRANSFER_ERC20]];
        await deployProxy<SdtStakingPositionService>(sigParams, params, "SdtStakingPositionService", proxyAdmin).should.be.revertedWith("TREASURY_DAO_ZERO");
        //unset
        await cvgControlTower.connect(treasuryDao).setSdtBlackHole(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setCvgSdt(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setCvg(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setSdt(ZeroAddress);
    });
    it("Deploy SdtStakingLogo should revert", async () => {
        const sigParams = "address";
        const params = [await cvgControlTower.getAddress()];
        await deployProxy<SdtStakingLogo>(sigParams, params, "SdtStakingLogo", proxyAdmin).should.be.revertedWith("ORACLE_ZERO");
    });
    it("Deploy CvgRewards should revert", async () => {
        const sigParams = "address";
        const params = [await cvgControlTower.getAddress()];
        await deployProxy<CvgRewards>(sigParams, params, "CvgRewards", proxyAdmin).should.be.revertedWith("TREASURY_DAO_ZERO");
    });
    it("Deploy YsDistributor should revert", async () => {
        const sigParams = "address";
        const params = [await cvgControlTower.getAddress()];

        await deployProxy<YsDistributor>(sigParams, params, "YsDistributor", proxyAdmin).should.be.revertedWith("LOCKING_SERVICE_ZERO");
        await cvgControlTower.connect(treasuryDao).setLockingPositionService(user1);
        await deployProxy<YsDistributor>(sigParams, params, "YsDistributor", proxyAdmin).should.be.revertedWith("LOCKING_MANAGER_ZERO");
        await cvgControlTower.connect(treasuryDao).setLockingPositionManager(user1);
        await deployProxy<YsDistributor>(sigParams, params, "YsDistributor", proxyAdmin).should.be.revertedWith("LOCKING_DELEGATE_ZERO");
        //unset
        await cvgControlTower.connect(treasuryDao).setCvg(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setLockingPositionService(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setLockingPositionManager(ZeroAddress);
    });
    it("Deploy CvgSdtBuffer should revert", async () => {
        const sigParams = "address,address";
        const params = [await cvgControlTower.getAddress(), await mockFeeDistributor.getAddress()];
        await deployProxy<CvgSdtBuffer>(sigParams, params, "CvgSdtBuffer", proxyAdmin).should.be.revertedWith("SDT_ZERO");
        await cvgControlTower.connect(treasuryDao).setSdt(user1);
        await deployProxy<CvgSdtBuffer>(sigParams, params, "CvgSdtBuffer", proxyAdmin).should.be.revertedWith("CVGSDT_ZERO");
        await cvgControlTower.connect(treasuryDao).setCvgSdt(user1);
        await deployProxy<CvgSdtBuffer>(sigParams, params, "CvgSdtBuffer", proxyAdmin).should.be.revertedWith("SDFRAX3CRV_ZERO");
        //unset
        await cvgControlTower.connect(treasuryDao).setSdt(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setCvgSdt(ZeroAddress);
    });
    it("Deploy SdtBlackHole should revert", async () => {
        const sigParams = "address";
        const params = [await cvgControlTower.getAddress()];
        const sdtBlackHole = await deployProxy<SdtBlackHole>(sigParams, params, "SdtBlackHole", proxyAdmin).should.be.revertedWith("SDT_ZERO");
    });
    it("Deploy SdtRewardDistributor should revert", async () => {
        const sigParams = "address";
        const params = [await cvgControlTower.getAddress()];
        await cvgControlTower.connect(treasuryDao).setSdtStakingPositionManager(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setTreasuryDao(ZeroAddress);
        await deployProxy<SdtRewardDistributor>(sigParams, params, "SdtRewardDistributor", proxyAdmin).should.be.revertedWith("SDT_ZERO");
        await cvgControlTower.connect(treasuryDao).setSdt(user1);
        await deployProxy<SdtRewardDistributor>(sigParams, params, "SdtRewardDistributor", proxyAdmin).should.be.revertedWith("CVG_ZERO");
        await cvgControlTower.connect(treasuryDao).setCvg(user1);
        await deployProxy<SdtRewardDistributor>(sigParams, params, "SdtRewardDistributor", proxyAdmin).should.be.revertedWith("CVG_SDT_ZERO");
        await cvgControlTower.connect(treasuryDao).setCvgSdt(user1);
        await deployProxy<SdtRewardDistributor>(sigParams, params, "SdtRewardDistributor", proxyAdmin).should.be.revertedWith("SDT_POSITION_MNGR_ZERO");
        await cvgControlTower.connect(treasuryDao).setSdtStakingPositionManager(user1);
        await deployProxy<SdtRewardDistributor>(sigParams, params, "SdtRewardDistributor", proxyAdmin).should.be.revertedWith("TREASURY_DAO_ZERO");
        //unset
        await cvgControlTower.connect(treasuryDao).setSdt(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setCvg(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setCvgSdt(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setSdtStakingPositionManager(ZeroAddress);
    });
    it("Deploy CvgSdt should revert", async () => {
        const CvgSdtFactory = await ethers.getContractFactory("CvgSDT");
        await CvgSdtFactory.deploy(cvgControlTower).should.be.revertedWith("SDT_ZERO");
    });
    it("Deploy CvgAirdrop should revert", async () => {
        const CvgAirdropFactory = await ethers.getContractFactory("CvgAirdrop");
        await CvgAirdropFactory.deploy(cvgControlTower).should.be.revertedWith("LOCKING_ZERO");
        await cvgControlTower.connect(treasuryDao).setLockingPositionService(user1);
        await CvgAirdropFactory.deploy(cvgControlTower).should.be.revertedWith("CVG_ZERO");
        await cvgControlTower.connect(treasuryDao).setCvg(user1);
        await CvgAirdropFactory.deploy(cvgControlTower).should.be.revertedWith("TREASURY_AIRDROP_ZERO");
        //unset
        await cvgControlTower.connect(treasuryDao).setLockingPositionService(ZeroAddress);
        await cvgControlTower.connect(treasuryDao).setCvg(ZeroAddress);
    });
});
