import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
const expect = chai.expect;

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {fetchMainnetContracts} from "../../fixtures/stake-dao";
import {ethers, network} from "hardhat";
import {Signer, parseEther} from "ethers";
import {Cvg} from "../../../typechain-types/contracts/Token";
import {IContractsUserMainnet, IUsers} from "../../../utils/contractInterface";
import {QuestAirdrop} from "../../../typechain-types/";
import {MerkleNode, MerkleHelper} from "../../../utils/MerkleHelper";
import {impersonateAccount, time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {TREASURY_AIRDROP, TREASURY_DAO} from "../../../resources/treasury";
import {setStorageBalanceOfAssetsOwner} from "../../../scripts/deployer/unit/XX_setStorageBalanceAssets";

describe.skip("Quest Airdrop Tests", () => {
    let treasuryDao: Signer, treasuryAirdrop: Signer;
    let owner: Signer, user1: Signer, user2: Signer, user3: Signer, user4: Signer, user5: Signer;
    let cvgContract: Cvg, questAirdropContract: QuestAirdrop;
    let contractsUsers, contracts: IContractsUserMainnet, users: IUsers, merkleRoot: string;
    let whitelist: MerkleNode[];

    before(async () => {
        contractsUsers = await loadFixture(fetchMainnetContracts);
        users = contractsUsers.users;
        await setStorageBalanceOfAssetsOwner(users);

        const QuestAirdropFactory = await ethers.getContractFactory("QuestAirdrop");
        questAirdropContract = await QuestAirdropFactory.deploy(contractsUsers.base.cvgControlTower);
        await questAirdropContract.waitForDeployment();

        cvgContract = contractsUsers.cvg;
        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        user3 = users.user3;
        user4 = users.user4;
        user5 = users.user5;

        whitelist = [
            {address: await user1.getAddress(), amount: parseEther("1")},
            {address: await user2.getAddress(), amount: parseEther("2")},
            {address: await user3.getAddress(), amount: parseEther("3")},
            {address: await user4.getAddress(), amount: parseEther("4")},
            {address: await user5.getAddress(), amount: parseEther("5")},
        ];
        merkleRoot = MerkleHelper.getRootAddressAmount(whitelist);
        const amountEth = ethers.parseEther("10");
        await user1.sendTransaction({to: TREASURY_AIRDROP, value: amountEth});
        await user1.sendTransaction({to: TREASURY_DAO, value: amountEth});
        await impersonateAccount(TREASURY_AIRDROP);
        await impersonateAccount(TREASURY_DAO);
    });
    it("Fail: startAirdrop with random user", async () => {
        await questAirdropContract.startAirdrop(merkleRoot).should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Fail: startAirdrop with owner but without sufficient CVG balance", async () => {
        await questAirdropContract
            .connect(await ethers.getSigner(TREASURY_DAO))
            .startAirdrop(merkleRoot)
            .should.be.revertedWith("ALLOWANCE_INSUFFICIENT");
    });
    it("Success: startAirdrop with owner and right CVG balance", async () => {
        await cvgContract.connect(await ethers.getSigner(TREASURY_AIRDROP)).approve(questAirdropContract, ethers.parseEther("1000"));
        await questAirdropContract.connect(await ethers.getSigner(TREASURY_DAO)).startAirdrop(merkleRoot);
    });
    it("Fail: claim with right address but wrong amount", async () => {
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user1.getAddress(), amount: parseEther("1")});
        await questAirdropContract.connect(user1).claim(parseEther("2"), proof).should.be.revertedWith("INVALID_PROOF");
    });
    it("Success: claim with right address/amount at the begining", async () => {
        const amountMaxCvg = parseEther("1");
        const expectedCvg = parseEther("0.2"); //20% cliff
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user1.getAddress(), amount: amountMaxCvg});
        await questAirdropContract.connect(user1).claim(amountMaxCvg, proof);
        expect(await cvgContract.balanceOf(user1)).to.be.approximately(expectedCvg, ethers.parseEther("0.1"));
    });
    it("Fail: re-claim with right address/amount (user1)", async () => {
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user1.getAddress(), amount: parseEther("1")});
        await questAirdropContract.connect(user1).claim(parseEther("1"), proof).should.be.revertedWith("ALREADY_CLAIMED");
    });
    it("Go 15 days later (day 15)", async () => {
        await network.provider.send("evm_increaseTime", [15 * 86400]);
        await network.provider.send("hardhat_mine", []);
    });
    it("Fail: claim with right address but wrong amount", async () => {
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user2.getAddress(), amount: parseEther("1")});
        await questAirdropContract.connect(user2).claim(parseEther("2"), proof).should.be.revertedWith("INVALID_PROOF");
    });
    it("Success: claim with right address/amount at the begining", async () => {
        const amountMaxCvg = parseEther("2");
        const expectedCvg = parseEther("0.8"); //20% cliff + 20% rest of vesting
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user2.getAddress(), amount: amountMaxCvg});
        await questAirdropContract.connect(user2).claim(amountMaxCvg, proof);
        expect(await cvgContract.balanceOf(user2)).to.be.approximately(expectedCvg, ethers.parseEther("0.1"));
    });
    it("Fail: re-claim with right address/amount (user2)", async () => {
        const amountMaxCvg = parseEther("2");
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user2.getAddress(), amount: amountMaxCvg});
        await questAirdropContract.connect(user2).claim(amountMaxCvg, proof).should.be.revertedWith("ALREADY_CLAIMED");
    });
    it("Go 15 days later (day 30)", async () => {
        await network.provider.send("evm_increaseTime", [15 * 86400]);
        await network.provider.send("hardhat_mine", []);
    });
    it("Fail: claim with right address but wrong amount", async () => {
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user3.getAddress(), amount: parseEther("1")});
        await questAirdropContract.connect(user3).claim(parseEther("2"), proof).should.be.revertedWith("INVALID_PROOF");
    });
    it("Success: claim with right address/amount at the begining", async () => {
        const amountMaxCvg = parseEther("3");
        const expectedCvg = parseEther("1.8"); //20% cliff + 40% rest of vesting
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user3.getAddress(), amount: amountMaxCvg});
        await questAirdropContract.connect(user3).claim(amountMaxCvg, proof);
        expect(await cvgContract.balanceOf(user3)).to.be.approximately(expectedCvg, ethers.parseEther("0.1"));
    });
    it("Fail: re-claim with right address/amount (user3)", async () => {
        const amountMaxCvg = parseEther("3");
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user3.getAddress(), amount: amountMaxCvg});
        await questAirdropContract.connect(user3).claim(amountMaxCvg, proof).should.be.revertedWith("ALREADY_CLAIMED");
    });
    it("Go 15 days later (day 45)", async () => {
        await network.provider.send("evm_increaseTime", [15 * 86400]);
        await network.provider.send("hardhat_mine", []);
    });
    it("Fail: claim with right address but wrong amount", async () => {
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user4.getAddress(), amount: parseEther("1")});
        await questAirdropContract.connect(user4).claim(parseEther("2"), proof).should.be.revertedWith("INVALID_PROOF");
    });
    it("Success: claim with right address/amount at the begining", async () => {
        const amountMaxCvg = parseEther("4");
        const expectedCvg = parseEther("3.2"); //20% cliff + 60% rest of vesting
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user4.getAddress(), amount: amountMaxCvg});
        await questAirdropContract.connect(user4).claim(amountMaxCvg, proof);
        expect(await cvgContract.balanceOf(user4)).to.be.approximately(expectedCvg, ethers.parseEther("0.1"));
    });
    it("Fail: re-claim with right address/amount (user4)", async () => {
        const amountMaxCvg = parseEther("4");
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user4.getAddress(), amount: amountMaxCvg});
        await questAirdropContract.connect(user4).claim(amountMaxCvg, proof).should.be.revertedWith("ALREADY_CLAIMED");
    });
    it("Go 15 days later (day 60 => end)", async () => {
        await network.provider.send("evm_increaseTime", [15 * 86400]);
        await network.provider.send("hardhat_mine", []);
    });
    it("Fail: claim with right address but wrong amount", async () => {
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user5.getAddress(), amount: parseEther("1")});
        await questAirdropContract.connect(user5).claim(parseEther("2"), proof).should.be.revertedWith("INVALID_PROOF");
    });
    it("Success: claim with right address/amount at the begining", async () => {
        const amountMaxCvg = parseEther("5"); //100%
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user5.getAddress(), amount: amountMaxCvg});
        await questAirdropContract.connect(user5).claim(amountMaxCvg, proof);
        expect(await cvgContract.balanceOf(user5)).to.be.equal(amountMaxCvg);
    });
    it("Fail: re-claim with right address/amount (user5)", async () => {
        const amountMaxCvg = parseEther("5");
        const proof = MerkleHelper.getProofAddressAmountMerkle(whitelist, {address: await user5.getAddress(), amount: amountMaxCvg});
        await questAirdropContract.connect(user5).claim(amountMaxCvg, proof).should.be.revertedWith("ALREADY_CLAIMED");
    });
});
