import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {IContractsConvex, IUsers} from "../../../../utils/contractInterface";
import {deployConvexFixture} from "../../../fixtures/convex-fixtures";
import {Signer} from "ethers";
import {
    Cvg,
    CvgFraxLpLocker,
    CvgFraxLpStakingService,
    CvxRewardDistributor,
    CvxStakingPositionManager,
    ERC20,
    IConvexVault,
    ICurveLp,
    LockingPositionService,
} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {MINT, TOKEN_1} from "../../../../resources/constant";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();

//eUSD/FRAXP

describe("cvgFraxLpStaking - Burn Position", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer, owner: Signer, user1: Signer, user2: Signer, user3: Signer;
    let cvg: Cvg, cvx: ERC20, fxs: ERC20, crv: ERC20, usdc: ERC20, frax: ERC20, eusd: ERC20, fraxbp: ERC20, eusdfraxbp: ICurveLp;
    let cvgeUSDFRAXBPLocker: CvgFraxLpLocker;
    let cvgeUSDFRAXBPStaking: CvgFraxLpStakingService;
    let eUSDFRAXBPVault: IConvexVault;
    let cvxRewardDistributor: CvxRewardDistributor;
    let cvxStakingPositionManager: CvxStakingPositionManager;
    let lockingPositionService: LockingPositionService;
    let currentCycle: bigint;
    let depositedAmount = ethers.parseEther("5000");
    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        user3 = users.user3;

        treasuryDao = await ethers.getSigner(TREASURY_DAO);
        cvg = contractsUsers.contractsUserMainnet.cvg;
        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;
        crv = contractsUsers.contractsUserMainnet.globalAssets.crv;
        usdc = contractsUsers.contractsUserMainnet.globalAssets.usdc;
        frax = contractsUsers.contractsUserMainnet.globalAssets.frax;
        eusd = contractsUsers.contractsUserMainnet.convexAssets!.eusd;
        fraxbp = contractsUsers.contractsUserMainnet.globalAssets!.fraxBp;
        eusdfraxbp = contractsUsers.contractsUserMainnet.curveLps!.eusdfraxbp;
        cvgeUSDFRAXBPStaking = contractsUsers.convex.cvgFraxLpStaking.cvgeUSDFRAXBPStaking;
        cvgeUSDFRAXBPLocker = contractsUsers.convex.cvgFraxLpLocker.cvgeUSDFRAXBPLocker;
        eUSDFRAXBPVault = contractsUsers.convex.convexVault.eUSDFRAXBPVault;
        cvxRewardDistributor = contractsUsers.convex.cvxRewardDistributor;
        cvxStakingPositionManager = contractsUsers.convex.cvxStakingPositionManager;
        lockingPositionService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;

        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();

        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).add_gauge(cvgeUSDFRAXBPStaking, 0, 0);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).toggle_vote_pause(cvgeUSDFRAXBPStaking);

        // transfer 1 wei of eusdfraxbp to initialize the staker position of the locker contract
        await eusdfraxbp.transfer(cvgeUSDFRAXBPLocker, "1");
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setupLocker(cvgeUSDFRAXBPStaking);

        // mint locking position and vote
        const lockingEndCycle = 96n - currentCycle;
        // console.log("lockingEndCycle", lockingEndCycle);
        const tokenId = await contractsUsers.contractsUserMainnet.locking.lockingPositionManager.nextId();
        await cvg.approve(lockingPositionService, ethers.parseEther("300000"));
        await lockingPositionService.mintPosition(lockingEndCycle, ethers.parseEther("100000"), 0, owner, true);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.simple_vote(tokenId, cvgeUSDFRAXBPStaking, 1000);

        //mint cvgeUSDFRAXBP
        await eusdfraxbp.connect(owner).approve(cvgeUSDFRAXBPLocker, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(owner).depositLp(ethers.parseEther("3000000"), true, owner);

        //transfer cvgeUSDFRAXBP to users
        await cvgeUSDFRAXBPLocker.transfer(user1, ethers.parseEther("1000000"));
        // approve spending from staking contract
        await cvgeUSDFRAXBPLocker.connect(user1).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
        //deposit
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(MINT, depositedAmount);
    });
    it("Fail: try to mint directly through the stakingPositionManager should revert", async () => {
        await cvxStakingPositionManager.mint(owner).should.be.revertedWith("NOT_STAKING");
    });

    it("Fail: burn tokenId with non tokenId owner should revert", async () => {
        await cvxStakingPositionManager.burn(TOKEN_1).should.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Fail: burn tokenId with staked amount should revert", async () => {
        await cvxStakingPositionManager.connect(user1).burn(TOKEN_1).should.be.revertedWith("TOTAL_STAKED_NOT_EMPTY");
    });

    it("Success: withdraw all staked amount", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).withdraw(TOKEN_1, depositedAmount);
    });
});
