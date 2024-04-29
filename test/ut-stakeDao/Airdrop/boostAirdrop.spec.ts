import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
const expect = chai.expect;
import {impersonateAccount, time} from "@nomicfoundation/hardhat-toolbox/network-helpers";

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {fetchMainnetContracts} from "../../fixtures/stake-dao";
import {ethers} from "hardhat";
import {Signer} from "ethers";
import {Cvg} from "../../../typechain-types/contracts/Token";
import {IContractsUserMainnet} from "../../../utils/contractInterface";
import {INVESTORWALLET} from "../../../resources/cvg-mainnet";
import {BoostWlIbo, Ibo, WlPresaleCvg} from "../../../typechain-types";
import {TREASURY_AIRDROP, TREASURY_DAO} from "../../../resources/treasury";
import {withinPercentage} from "../../../utils/testUtils/testUtils";
const iboHolderWallet = "0x13cbd624af484c4c695ff0e1d0b7e125d45f2c76";

describe("Boost Airdrop Tests", () => {
    let user1: Signer, treasuryDao: Signer;
    let cvgContract: Cvg;
    let contractsUsers: IContractsUserMainnet;
    let boostAirdrop: BoostWlIbo, ibo: Ibo, wl: WlPresaleCvg;

    let blockTimestamp: number, vestingEnd: number;

    before(async () => {
        contractsUsers = await loadFixture(fetchMainnetContracts);
        const airdropBoostFactory = await ethers.getContractFactory("BoostWlIbo");
        boostAirdrop = await airdropBoostFactory.deploy();

        blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
        vestingEnd = blockTimestamp + 60 * 60 * 24 * 60;
        ibo = contractsUsers.presales.presaleIbo;
        wl = contractsUsers.presales.presaleWl;

        cvgContract = contractsUsers.cvg;
        user1 = contractsUsers.users.user1;
        treasuryDao = contractsUsers.users.treasuryDao;
        const amountEth = ethers.parseEther("10");
        await user1.sendTransaction({to: TREASURY_AIRDROP, value: amountEth});
        await user1.sendTransaction({to: TREASURY_DAO, value: amountEth});
        await user1.sendTransaction({to: INVESTORWALLET, value: amountEth});
        await user1.sendTransaction({to: iboHolderWallet, value: amountEth});
        await impersonateAccount(TREASURY_AIRDROP);
        await impersonateAccount(TREASURY_DAO);
        await impersonateAccount(INVESTORWALLET);
        await impersonateAccount(iboHolderWallet);
    });

    it("Success: Verify vesting start & end", async () => {
        expect(await boostAirdrop.vestingStart()).to.be.eq(0);
        expect(await boostAirdrop.vestingEnd()).to.be.eq(0);

        expect(await boostAirdrop.getClaimableAmount(12, 12)).to.be.eq(0);
    });

    it("Fail: StartAirdrop with random user", async () => {
        await boostAirdrop.connect(user1).startAirdrop().should.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Fail: StartAirdrop with not enough allowance", async () => {
        await boostAirdrop
            .connect(await ethers.getSigner(TREASURY_DAO))
            .startAirdrop()
            .should.be.revertedWith("INSUFFICIENT_ALLOWANCE");
    });

    it("Success: Approve CVG & open vesting", async () => {
        await cvgContract.connect(await ethers.getSigner(TREASURY_AIRDROP)).approve(boostAirdrop, ethers.parseEther("165600"));
        await boostAirdrop.connect(await ethers.getSigner(TREASURY_DAO)).startAirdrop();
        blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
        vestingEnd = blockTimestamp + 60 * 60 * 24 * 60;
        expect(await boostAirdrop.vestingStart()).to.be.eq(blockTimestamp);
        expect(await boostAirdrop.vestingEnd()).to.be.eq(vestingEnd);
        expect(await boostAirdrop.state()).to.be.eq(1);
    });

    it("Success: Go to half vesting time", async () => {
        await time.increase(5_184_000 / 2);
    });

    it("Success: Claim the half of a WL position", async () => {
        const signerImpersonnate = await ethers.getSigner(INVESTORWALLET);

        const balanceTreasuryBefore = await cvgContract.balanceOf(TREASURY_AIRDROP);
        const balanceInvestorBefore = await cvgContract.balanceOf(INVESTORWALLET);

        await boostAirdrop.connect(signerImpersonnate).claimBoostWl(49);

        const balanceTreasuryAfter = await cvgContract.balanceOf(TREASURY_AIRDROP);
        const balanceInvestorAfter = await cvgContract.balanceOf(INVESTORWALLET);

        const deltaTreasury = balanceTreasuryBefore - balanceTreasuryAfter;
        const deltaInvestor = balanceInvestorAfter - balanceInvestorBefore;

        withinPercentage(deltaTreasury, 437500506365740740741n, 1);
        withinPercentage(deltaInvestor, 437500506365740740741n, 1);
        withinPercentage(await boostAirdrop.wlAlreadyClaimed(49), 437500506365740740741n, 1);
    });

    it("Success: Claim the half of an IBO position", async () => {
        const balanceTreasuryBefore = await cvgContract.balanceOf(TREASURY_AIRDROP);
        const balanceInvestorBefore = await cvgContract.balanceOf(iboHolderWallet);

        await boostAirdrop.connect(await ethers.getSigner(iboHolderWallet)).claimBoostIbo(42);

        const balanceTreasuryAfter = await cvgContract.balanceOf(TREASURY_AIRDROP);
        const balanceInvestorAfter = await cvgContract.balanceOf(iboHolderWallet);

        const deltaTreasury = balanceTreasuryBefore - balanceTreasuryAfter;
        const deltaInvestor = balanceInvestorAfter - balanceInvestorBefore;

        withinPercentage(deltaTreasury, 14668460030775612370n, 1);
        withinPercentage(deltaInvestor, 14668460030775612370n, 1);
        withinPercentage(await boostAirdrop.iboAlreadyClaimed(42), 14668460030775612370n, 1);
    });

    it("Success: Go to the end of the vesting", async () => {
        await time.increaseTo(vestingEnd);
    });

    it("Success: Claim rest of the WL position on the end of the vesting", async () => {
        const balanceTreasuryBefore = await cvgContract.balanceOf(TREASURY_AIRDROP);
        const balanceInvestorBefore = await cvgContract.balanceOf(INVESTORWALLET);

        await boostAirdrop.connect(await ethers.getSigner(INVESTORWALLET)).claimBoostWl(49);

        const balanceTreasuryAfter = await cvgContract.balanceOf(TREASURY_AIRDROP);
        const balanceInvestorAfter = await cvgContract.balanceOf(INVESTORWALLET);

        const deltaTreasury = balanceTreasuryBefore - balanceTreasuryAfter;
        const deltaInvestor = balanceInvestorAfter - balanceInvestorBefore;

        withinPercentage(deltaTreasury, 437498480902777777778n, 1);
        withinPercentage(deltaInvestor, 437498480902777777778n, 1);
        expect(await boostAirdrop.wlAlreadyClaimed(49)).to.be.eq(875000000000000000000n);
    });

    it("Fails: Cannot claim when everything is already claimed", async () => {
        const signerImpersonnate = await ethers.getSigner(INVESTORWALLET);
        await boostAirdrop.connect(signerImpersonnate).claimBoostWl(49).should.be.revertedWith("NOTHING_CLAIMABLE");
    });

    it("Success: Go further in time", async () => {
        await time.increase(3600);
    });

    it("Success: Claim rest of the IBO position", async () => {
        const balanceTreasuryBefore = await cvgContract.balanceOf(TREASURY_AIRDROP);
        const balanceInvestorBefore = await cvgContract.balanceOf(iboHolderWallet);

        await boostAirdrop.connect(await ethers.getSigner(iboHolderWallet)).claimBoostIbo(42);

        const balanceTreasuryAfter = await cvgContract.balanceOf(TREASURY_AIRDROP);
        const balanceInvestorAfter = await cvgContract.balanceOf(iboHolderWallet);

        const deltaTreasury = balanceTreasuryBefore - balanceTreasuryAfter;
        const deltaInvestor = balanceInvestorAfter - balanceInvestorBefore;

        withinPercentage(deltaTreasury, 14668392121290832148n, 1);
        withinPercentage(deltaInvestor, 14668392121290832148n, 1);
        expect(await boostAirdrop.iboAlreadyClaimed(42)).to.be.eq(((await ibo.totalCvgPerToken(42)) * 500_000n) / 10_000_000n);
    });
});
