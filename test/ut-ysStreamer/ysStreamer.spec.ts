import {loadFixture, time, impersonateAccount} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";
import {Signer} from "ethers";
import {expect} from "chai";
import {IContractsConvex, IContractsUserMainnet, IUsers} from "../../utils/contractInterface";
import {ERC20, LockingPositionManager, LockingPositionService, YsStreamer} from "../../typechain-types";
import {TREASURY_DAO} from "../../resources/treasury";
import {deployProxy} from "../../utils/global/deployProxy";
import {STREAM_PERIOD_YS, TDE_2, TOKEN_3, TOKEN_5, TOKEN_8} from "../../resources/constant";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {goOnNextWeek} from "../../utils/locking/invariants.checks";
import {deployConvexFixture} from "../fixtures/convex-fixtures";
chai.use(chaiAsPromised).should();
describe("YsStreamer - Tests", () => {
    let contractsUsers: IContractsConvex;
    let users: IUsers, treasuryDao: Signer;
    let cvx: ERC20, fxs: ERC20, crv: ERC20, dai: ERC20;
    let lockingService: LockingPositionService, lockingManager: LockingPositionManager;
    let ysStreamer: YsStreamer;

    before(async () => {
        contractsUsers = await loadFixture(deployConvexFixture);
        users = contractsUsers.contractsUserMainnet.users;
        await users.user1.sendTransaction({to: TREASURY_DAO, value: ethers.parseEther("100")});
        await impersonateAccount(TREASURY_DAO);
        treasuryDao = await ethers.getSigner(TREASURY_DAO);
        crv = contractsUsers.contractsUserMainnet.globalAssets.crv;
        cvx = contractsUsers.contractsUserMainnet.globalAssets.cvx;
        fxs = contractsUsers.contractsUserMainnet.globalAssets.fxs;
        dai = contractsUsers.contractsUserMainnet.globalAssets.dai;
        lockingService = contractsUsers.contractsUserMainnet.locking.lockingPositionService;
        lockingManager = contractsUsers.contractsUserMainnet.locking.lockingPositionManager;
        ysStreamer = await deployProxy<YsStreamer>("", [], "YsStreamer", contractsUsers.contractsUserMainnet.base.proxyAdmin);

        await contractsUsers.contractsUserMainnet.cvg.connect(users.user1).approve(lockingService, ethers.MaxUint256);
    });
    it("Increase cycle", async () => {
        const cycleAmount = 1;
        const cvgRewards = contractsUsers.contractsUserMainnet.rewards.cvgRewards;
        const treasuryDao = contractsUsers.contractsUserMainnet.users.treasuryDao;
        for (let i = 0; i < cycleAmount; i++) {
            const actualCycle = await contractsUsers.contractsUserMainnet.base.cvgControlTower.cvgCycle();
            await goOnNextWeek();
            await contractsUsers.contractsUserMainnet.locking.veCvg.checkpoint();

            await (await cvgRewards.connect(treasuryDao).writeStakingRewards(3)).wait();
        }
    });

    it("Success : Set distributors", async () => {
        await ysStreamer.connect(treasuryDao).approveRewardDistributor([
            {rewardToken: crv, distributor: users.user1, approved: true},
            {rewardToken: cvx, distributor: users.user1, approved: true},
            {rewardToken: fxs, distributor: users.user1, approved: true},
        ]);
    });

    // it("Success : Verify locking working ", async () => {
    //     const actualCycle = await contractsUsers.rewards.cvgRewards.getCycleLocking((await ethers.provider.getBlock("latest"))!.timestamp);
    //     const nextTde = ((actualCycle + 12n) / 12n) * 12n;
    //     await lockingService.connect(users.user1).mintPosition(nextTde - actualCycle, ethers.parseEther("1000"), 100, users.user1, true);
    // });
    it("Fail : notify reward not added", async () => {
        await ysStreamer
            .connect(users.user1)
            .notifyRewardAmount([{token: crv, amount: "1"}])
            .should.be.revertedWith("REWARD_TOKEN_DONT_EXIST");
    });
    it("Fail : notify reward with wrong distributor", async () => {
        await ysStreamer
            .connect(treasuryDao)
            .notifyRewardAmount([{token: crv, amount: "1"}])
            .should.be.revertedWith("NOT_DISTRIBUTOR_FOR_TOKEN");
    });

    it("Success : Add rewards", async () => {
        await ysStreamer.connect(treasuryDao).addReward([
            {token: crv, distributor: users.user1},
            {token: cvx, distributor: users.user1},
            {token: fxs, distributor: users.user1},
        ]);
        expect(await ysStreamer.isRewardToken(crv)).to.be.true;
        expect(await ysStreamer.isRewardToken(cvx)).to.be.true;
        expect(await ysStreamer.isRewardToken(fxs)).to.be.true;
    });
    it("Fail : notify reward with 0 amount", async () => {
        await ysStreamer
            .connect(users.user1)
            .notifyRewardAmount([{token: crv, amount: "0"}])
            .should.be.revertedWith("INCORRECT_VALUE");
    });
    it("Fail : readd same reward token on same tde", async () => {
        await ysStreamer
            .connect(treasuryDao)
            .addReward([
                {token: crv, distributor: users.user1},
                {token: cvx, distributor: users.user1},
                {token: fxs, distributor: users.user1},
            ])
            .should.be.revertedWith("REWARD_TOKEN_ALREADY_EXISTS");
    });
    it("Fail : recover reward token", async () => {
        await ysStreamer.connect(treasuryDao).recoverToken(crv, "0").should.be.revertedWith("CANNOT_WITHDRAW_REWARD");
    });

    let ysAmountToken3: bigint;

    it("Success : Check in the token 3", async () => {
        ysAmountToken3 = await lockingService.balanceOfYsCvgAt(TOKEN_3, 24);
        await ysStreamer.checkIn(TOKEN_3);

        expect(await ysStreamer.balanceCheckedIn(TDE_2, TOKEN_3)).to.be.eq(ysAmountToken3);
        expect(await ysStreamer.totalSupplyCheckedIn(TDE_2)).to.be.eq(ysAmountToken3);
    });
    let ysAmountToken5: bigint;

    it("Success : Check in the token 5", async () => {
        ysAmountToken5 = await lockingService.balanceOfYsCvgAt(TOKEN_5, 24);
        await ysStreamer.checkIn(TOKEN_5);

        expect(await ysStreamer.balanceCheckedIn(TDE_2, TOKEN_5)).to.be.eq(ysAmountToken5);
        expect(await ysStreamer.totalSupplyCheckedIn(TDE_2)).to.be.eq(ysAmountToken3 + ysAmountToken5);
    });
    const firstDropCrv = ethers.parseEther("10000");
    const firstDropCvx = ethers.parseEther("20");
    it("Success : Notify rewards in CRV & CVX", async () => {
        await crv.connect(users.user1).approve(ysStreamer, ethers.MaxUint256);
        await cvx.connect(users.user1).approve(ysStreamer, ethers.MaxUint256);
        const timestamp = await time.latest();
        await ysStreamer.connect(users.user1).notifyRewardAmount([
            {token: crv, amount: firstDropCrv},
            {token: cvx, amount: firstDropCvx},
        ]);
        expect(await ysStreamer.lastTimeRewardApplicable(TDE_2, crv)).to.be.equal(timestamp + 1);
    });

    it("Success : Goes in the future, 1/3 of the period", async () => {
        await time.increase(STREAM_PERIOD_YS / 3n);
    });

    it("Success : Get 1/3 of the rewards", async () => {
        const ownerToken3 = await lockingManager.ownerOf(TOKEN_3);
        const ownerToken5 = await lockingManager.ownerOf(TOKEN_5);

        const totalYsCheckedIn = await ysStreamer.totalSupplyCheckedIn(TDE_2);
        const shareToken3 = ((await ysStreamer.balanceCheckedIn(TDE_2, TOKEN_3)) * 10n ** 18n) / totalYsCheckedIn;
        const shareToken5 = ((await ysStreamer.balanceCheckedIn(TDE_2, TOKEN_5)) * 10n ** 18n) / totalYsCheckedIn;
        expect(shareToken3 + shareToken5).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.000001"));

        const balanceCrvOwner3Before = await crv.balanceOf(ownerToken3);
        const balanceCrvOwner5Before = await crv.balanceOf(ownerToken5);

        const balanceCvxOwner3Before = await cvx.balanceOf(ownerToken3);
        const balanceCvxOwner5Before = await cvx.balanceOf(ownerToken5);

        const claimRewards = ysStreamer.getRewardMultiple([{tdeId: TDE_2, tokenIds: [TOKEN_3, TOKEN_5]}]);

        await claimRewards;

        const balanceCrvOwner3After = await crv.balanceOf(ownerToken3);
        const balanceCrvOwner5After = await crv.balanceOf(ownerToken5);

        const balanceCvxOwner3After = await cvx.balanceOf(ownerToken3);
        const balanceCvxOwner5After = await cvx.balanceOf(ownerToken5);

        const deltaCrvToken3 = balanceCrvOwner3After - balanceCrvOwner3Before;
        const deltaCrvToken5 = balanceCrvOwner5After - balanceCrvOwner5Before;

        const deltaCvxToken3 = balanceCvxOwner3After - balanceCvxOwner3Before;
        const deltaCvxToken5 = balanceCvxOwner5After - balanceCvxOwner5Before;

        const expectedClaimableCrvToken3 = (shareToken3 * firstDropCrv) / 3n / 10n ** 18n;
        const expectedClaimableCrvToken5 = (shareToken5 * firstDropCrv) / 3n / 10n ** 18n;

        const expectedClaimableCvxToken3 = (shareToken3 * firstDropCvx) / 3n / 10n ** 18n;
        const expectedClaimableCvxToken5 = (shareToken5 * firstDropCvx) / 3n / 10n ** 18n;

        expect(deltaCrvToken3).to.be.closeTo(expectedClaimableCrvToken3, ethers.parseEther("0.1"));
        expect(deltaCrvToken5).to.be.closeTo(expectedClaimableCrvToken5, ethers.parseEther("0.1"));

        expect(deltaCvxToken3).to.be.closeTo(expectedClaimableCvxToken3, ethers.parseEther("0.01"));
        expect(deltaCvxToken5).to.be.closeTo(expectedClaimableCvxToken5, ethers.parseEther("0.01"));

        await expect(claimRewards).to.changeTokenBalances(
            crv,
            [ysStreamer, ownerToken3, ownerToken5],
            [-(deltaCrvToken3 + deltaCrvToken5), deltaCrvToken3, deltaCrvToken5]
        );
        await expect(claimRewards).to.changeTokenBalances(
            cvx,
            [ysStreamer, ownerToken3, ownerToken5],
            [-(deltaCvxToken3 + deltaCvxToken5), deltaCvxToken3, deltaCvxToken5]
        );
    });
    let ysAmountToken8: bigint;
    it("Success : Check in the token 8", async () => {
        ysAmountToken8 = await lockingService.balanceOfYsCvgAt(TOKEN_8, 24);
        await ysStreamer.checkIn(TOKEN_8);

        expect(await ysStreamer.balanceCheckedIn(TDE_2, TOKEN_8)).to.be.eq(ysAmountToken8);
        expect(await ysStreamer.totalSupplyCheckedIn(TDE_2)).to.be.eq(ysAmountToken3 + ysAmountToken5 + ysAmountToken8);
    });

    it("Success : Goes in the future, end of the streaming period", async () => {
        await time.increase((STREAM_PERIOD_YS * 2n) / 3n);
    });

    it("Success : Get all rewards", async () => {
        const ownerToken3 = await lockingManager.ownerOf(TOKEN_3);
        const ownerToken5 = await lockingManager.ownerOf(TOKEN_5);
        const ownerToken8 = await lockingManager.ownerOf(TOKEN_8);

        const totalYsCheckedIn = await ysStreamer.totalSupplyCheckedIn(TDE_2);
        const shareToken3 = ((await ysStreamer.balanceCheckedIn(TDE_2, TOKEN_3)) * 10n ** 18n) / totalYsCheckedIn;
        const shareToken5 = ((await ysStreamer.balanceCheckedIn(TDE_2, TOKEN_5)) * 10n ** 18n) / totalYsCheckedIn;
        const shareToken8 = ((await ysStreamer.balanceCheckedIn(TDE_2, TOKEN_8)) * 10n ** 18n) / totalYsCheckedIn;

        expect(shareToken3 + shareToken5 + shareToken8).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.000001"));

        const balanceCrvOwner3Before = await crv.balanceOf(ownerToken3);
        const balanceCrvOwner5Before = await crv.balanceOf(ownerToken5);
        const balanceCrvOwner8Before = await crv.balanceOf(ownerToken8);

        const balanceCvxOwner3Before = await cvx.balanceOf(ownerToken3);
        const balanceCvxOwner5Before = await cvx.balanceOf(ownerToken5);
        const balanceCvxOwner8Before = await cvx.balanceOf(ownerToken8);
        const allRewards = await ysStreamer.getRewardsForDuration(TDE_2);
        const claimableRewardsToken3 = await ysStreamer.claimableRewards(TDE_2, TOKEN_3);
        const claimableRewardsToken5 = await ysStreamer.claimableRewards(TDE_2, TOKEN_5);
        const claimableRewardsToken8 = await ysStreamer.claimableRewards(TDE_2, TOKEN_8);

        const claimRewardsToken3 = ysStreamer.getReward(TDE_2, TOKEN_3);
        const claimRewardsToken5 = ysStreamer.getReward(TDE_2, TOKEN_5);
        const claimRewardsToken8 = ysStreamer.getReward(TDE_2, TOKEN_8);

        await claimRewardsToken3;
        await claimRewardsToken5;
        await claimRewardsToken8;

        const balanceCrvOwner3After = await crv.balanceOf(ownerToken3);
        const balanceCrvOwner5After = await crv.balanceOf(ownerToken5);
        const balanceCrvOwner8After = await crv.balanceOf(ownerToken8);

        const balanceCvxOwner3After = await cvx.balanceOf(ownerToken3);
        const balanceCvxOwner5After = await cvx.balanceOf(ownerToken5);
        const balanceCvxOwner8After = await cvx.balanceOf(ownerToken8);

        const deltaCrvToken3 = balanceCrvOwner3After - balanceCrvOwner3Before;
        const deltaCrvToken5 = balanceCrvOwner5After - balanceCrvOwner5Before;
        const deltaCrvToken8 = balanceCrvOwner8After - balanceCrvOwner8Before;

        const deltaCvxToken3 = balanceCvxOwner3After - balanceCvxOwner3Before;
        const deltaCvxToken5 = balanceCvxOwner5After - balanceCvxOwner5Before;
        const deltaCvxToken8 = balanceCvxOwner8After - balanceCvxOwner8Before;

        const expectedClaimableCrvToken3 = (shareToken3 * firstDropCrv * 2n) / 3n / 10n ** 18n;
        const expectedClaimableCrvToken5 = (shareToken5 * firstDropCrv * 2n) / 3n / 10n ** 18n;
        const expectedClaimableCrvToken8 = (shareToken8 * firstDropCrv * 2n) / 3n / 10n ** 18n;

        expect(expectedClaimableCrvToken3 + expectedClaimableCrvToken5 + expectedClaimableCrvToken8).to.be.closeTo(
            (firstDropCrv * 2n) / 3n,
            ethers.parseEther("0.001")
        );

        const expectedClaimableCvxToken3 = (shareToken3 * firstDropCvx * 2n) / 3n / 10n ** 18n;
        const expectedClaimableCvxToken5 = (shareToken5 * firstDropCvx * 2n) / 3n / 10n ** 18n;
        const expectedClaimableCvxToken8 = (shareToken8 * firstDropCvx * 2n) / 3n / 10n ** 18n;

        expect(expectedClaimableCvxToken3 + expectedClaimableCvxToken5 + expectedClaimableCvxToken8).to.be.closeTo(
            (firstDropCvx * 2n) / 3n,
            ethers.parseEther("0.001")
        );

        expect(deltaCrvToken3).to.be.closeTo(expectedClaimableCrvToken3, ethers.parseEther("0.1"));
        expect(deltaCrvToken5).to.be.closeTo(expectedClaimableCrvToken5, ethers.parseEther("0.1"));
        expect(deltaCrvToken8).to.be.closeTo(expectedClaimableCrvToken8, ethers.parseEther("0.1"));

        expect(deltaCvxToken3).to.be.closeTo(expectedClaimableCvxToken3, ethers.parseEther("0.01"));
        expect(deltaCvxToken5).to.be.closeTo(expectedClaimableCvxToken5, ethers.parseEther("0.01"));
        expect(deltaCvxToken8).to.be.closeTo(expectedClaimableCvxToken8, ethers.parseEther("0.01"));

        await expect(claimRewardsToken3).to.changeTokenBalances(crv, [ysStreamer, ownerToken3], [-deltaCrvToken3, deltaCrvToken3]);
        await expect(claimRewardsToken5).to.changeTokenBalances(crv, [ysStreamer, ownerToken5], [-deltaCrvToken5, deltaCrvToken5]);
        await expect(claimRewardsToken8).to.changeTokenBalances(crv, [ysStreamer, ownerToken8], [-deltaCrvToken8, deltaCrvToken8]);

        await expect(claimRewardsToken3).to.changeTokenBalances(cvx, [ysStreamer, ownerToken3], [-deltaCvxToken3, deltaCvxToken3]);
        await expect(claimRewardsToken5).to.changeTokenBalances(cvx, [ysStreamer, ownerToken5], [-deltaCvxToken5, deltaCvxToken5]);

        expect(expectedClaimableCrvToken3).to.be.closeTo(claimableRewardsToken3[0].amount, ethers.parseEther("0.01"));
        expect(expectedClaimableCvxToken3).to.be.closeTo(claimableRewardsToken3[1].amount, ethers.parseEther("0.01"));

        expect(allRewards[0].amount).to.be.closeTo(firstDropCrv, ethers.parseEther("0.001"));
        expect(allRewards[1].amount).to.be.closeTo(firstDropCvx, ethers.parseEther("0.001"));
    });

    it("Success : send random token on ysStreamer and recover it", async () => {
        await dai.transfer(ysStreamer, "1");
        expect(await dai.balanceOf(ysStreamer)).to.be.equal(1);
        await ysStreamer.connect(treasuryDao).recoverToken(dai, "1");
        expect(await dai.balanceOf(ysStreamer)).to.be.equal(0);
    });
});
