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
    IConvexStaking,
    IConvexVault,
    ICurveLp,
    LockingPositionService,
} from "../../../../typechain-types";
import {ethers} from "hardhat";
import {TREASURY_DAO} from "../../../../resources/treasury";
import {expect} from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
import {increaseCvgCycleNoCheck} from "../../../fixtures/stake-dao";
import {MINT, TOKEN_1, TOKEN_2} from "../../../../resources/constant";
import {OWNABLE_REVERT} from "../../../../resources/revert";

//eUSD/FRAXP

describe("cvgFraxLpStaking - Deposit", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer, owner: Signer, user1: Signer, user2: Signer, user3: Signer;
    let cvg: Cvg, cvx: ERC20, fxs: ERC20, crv: ERC20, usdc: ERC20, frax: ERC20, eusd: ERC20, fraxbp: ERC20, eusdfraxbp: ICurveLp;
    let cvgeUSDFRAXBPLocker: CvgFraxLpLocker;
    let cvgeUSDFRAXBPStaking: CvgFraxLpStakingService;
    let cvxcvgeUSDFRAXBPStaking: IConvexStaking;
    let eUSDFRAXBPVault: IConvexVault;
    let cvxRewardDistributor: CvxRewardDistributor;
    let cvxStakingPositionManager: CvxStakingPositionManager;
    let lockingPositionService: LockingPositionService;
    let currentCycle: bigint;
    let CYCLE_1: bigint, CYCLE_2: bigint, CYCLE_3: bigint, CYCLE_4: bigint, CYCLE_5: bigint;
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

        cvxcvgeUSDFRAXBPStaking = await ethers.getContractAt("IConvexStaking", await eUSDFRAXBPVault.stakingAddress());

        // we have to fetch it because we're live now
        currentCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();
        CYCLE_1 = currentCycle;
        CYCLE_2 = currentCycle + 1n;
        CYCLE_3 = currentCycle + 2n;
        CYCLE_4 = currentCycle + 3n;
        CYCLE_5 = currentCycle + 4n;

        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).add_gauge(cvgeUSDFRAXBPStaking, 0, 0);
        await contractsUsers.contractsUserMainnet.locking.gaugeController.connect(treasuryDao).toggle_vote_pause(cvgeUSDFRAXBPStaking);

        // transfer 1 wei of to initialize the staker position of the locker contract
        await eusdfraxbp.transfer(cvgeUSDFRAXBPLocker, "1");
        await cvgeUSDFRAXBPLocker.connect(treasuryDao).setupLocker(cvgeUSDFRAXBPStaking);

        // mint locking position and vote for cvgSdtStaking gauge
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
        await cvgeUSDFRAXBPLocker.transfer(user2, ethers.parseEther("1000000"));
        await cvgeUSDFRAXBPLocker.transfer(user3, ethers.parseEther("1000000"));

        // approve cvgSdt spending from staking contract
        await cvgeUSDFRAXBPLocker.connect(user1).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(user2).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
        await cvgeUSDFRAXBPLocker.connect(user3).approve(cvgeUSDFRAXBPStaking, ethers.MaxUint256);
    });

    it("Fails : Depositing SDT  with amount 0", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(MINT, 0).should.be.revertedWith("DEPOSIT_LTE_0");
    });

    it("Fails : Setting deposit paused with random user", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).toggleDepositPaused().should.be.revertedWith(OWNABLE_REVERT);
    });

    it("Success : Pauses deposit", async () => {
        await cvgeUSDFRAXBPStaking.connect(treasuryDao).toggleDepositPaused();
        expect(await cvgeUSDFRAXBPStaking.depositPaused()).to.be.true;
    });

    it("Fails : Deposits when paused", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(MINT, ethers.parseEther("500")).should.be.revertedWith("DEPOSIT_PAUSED");
    });

    it("Success : Unpause deposit", async () => {
        await cvgeUSDFRAXBPStaking.connect(treasuryDao).toggleDepositPaused();
        expect(await cvgeUSDFRAXBPStaking.depositPaused()).to.be.false;
    });

    it("Success : Depositing cvgeUSDFRAXBP for user1 at cycle 1", async () => {
        const amount500 = ethers.parseEther("500");
        // deposit cvgToke

        const tx = cvgeUSDFRAXBPStaking.connect(user1).deposit(MINT, amount500);
        // await expect(tx)
        //     .to.emit(cvgeUSDFRAXBPStaking, "Deposit")
        //     .withArgs(TOKEN_1, await user1.getAddress(), CYCLE_1, amount500);

        await expect(tx).to.changeTokenBalances(cvgeUSDFRAXBPLocker, [user1, cvgeUSDFRAXBPStaking], [-amount500, amount500]);

        // staking information
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_1)).to.be.deep.equal([amount500, amount500]);
    });

    it("Success : Re-deposit cvgeUSDFRAXBPLocker for user1 at cycle 1 for cycle 2", async () => {
        const amount1000 = ethers.parseEther("1000");

        // deposit cvgToke
        await expect(cvgeUSDFRAXBPStaking.connect(user1).deposit(TOKEN_1, amount1000))
            .to.emit(cvgeUSDFRAXBPStaking, "Deposit")
            .withArgs(TOKEN_1, await user1.getAddress(), CYCLE_1, amount1000);

        // check staking info
        const expectedAmount = ethers.parseEther("1500");
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_2, TOKEN_1)).to.be.deep.eq([expectedAmount, expectedAmount]);
    });

    it("Success : Update staking cycle to 2 and processRewards CVG", async () => {
        const expectedAmount = ethers.parseEther("1500");
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);

        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_2);
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_2)).to.be.deep.eq([0, expectedAmount, false]);
    });

    it("Success : Depositing cvgeUSDFRAXBPLocker for user2 at cycle 2 for cycle 3", async () => {
        const amount700 = ethers.parseEther("700");

        // deposit cvgSdt
        await expect(cvgeUSDFRAXBPStaking.connect(user2).deposit(MINT, amount700))
            .to.emit(cvgeUSDFRAXBPStaking, "Deposit")
            .withArgs(TOKEN_2, await user2.getAddress(), CYCLE_2, amount700);
        expect(await cvgeUSDFRAXBPStaking.tokenInfoByCycle(CYCLE_3, TOKEN_2)).to.be.deep.eq([amount700, amount700]);
    });

    it("Fails : Depositing with wrong tokenId", async () => {
        const amount700 = ethers.parseEther("700");
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(TOKEN_2, amount700).should.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Success : Updating staking cycle to 3 and processRewards", async () => {
        const expectedAmount = ethers.parseEther("2200");
        await increaseCvgCycleNoCheck(contractsUsers.contractsUserMainnet, 1);

        expect(await cvgeUSDFRAXBPStaking.stakingCycle()).to.be.equal(CYCLE_3);
        expect(await cvgeUSDFRAXBPStaking.cycleInfo(CYCLE_3)).to.be.deep.eq([0, expectedAmount, false]);
    });

    it("Success : Deposit", async () => {
        await cvgeUSDFRAXBPStaking.connect(user1).deposit(MINT, ethers.parseEther("100"));
    });
});
