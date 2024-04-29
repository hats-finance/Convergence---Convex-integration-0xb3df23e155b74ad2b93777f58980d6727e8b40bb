import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised).should();
const expect = chai.expect;

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployYsDistributorFixture} from "../../fixtures/stake-dao";
import {ethers} from "hardhat";
import {Signer} from "ethers";
import {LockingPositionManager, LockingPositionService, VeSDTAirdrop} from "../../../typechain-types/";
import {Cvg} from "../../../typechain-types/contracts/Token";
import {IContracts, IUsers} from "../../../utils/contractInterface";
import {MerkleHelper} from "../../../utils/MerkleHelper";

const CLAIM = ethers.parseEther("1000");

describe("VeSDT Airdrop Tests", () => {
    let treasuryDao: Signer, treasuryAirdrop: Signer;
    let owner: Signer, user1: Signer, user2: Signer, user3: Signer, user4: Signer;
    let cvgContract: Cvg, veSDTAirdropContract: VeSDTAirdrop;
    let contractsUsers, contracts: IContracts, users: IUsers, merkleRoot: string;
    let whitelist: string[];
    let lockingPositionServiceContract: LockingPositionService, lockingPositionManagerContract: LockingPositionManager;

    before(async () => {
        contractsUsers = await loadFixture(deployYsDistributorFixture);
        contracts = contractsUsers.contracts;
        users = contractsUsers.users;
        lockingPositionServiceContract = contracts.locking.lockingPositionService;
        lockingPositionManagerContract = contracts.locking.lockingPositionManager;
        veSDTAirdropContract = contracts.presaleVesting.veSDTAirdrop;

        cvgContract = contracts.tokens.cvg;

        owner = users.owner;
        user1 = users.user1;
        user2 = users.user2;
        user3 = users.user3;
        user4 = users.user4;

        treasuryDao = users.treasuryDao;
        treasuryAirdrop = users.treasuryAirdrop;

        whitelist = [await user1.getAddress(), await user2.getAddress(), await user3.getAddress(), await user4.getAddress()];
        merkleRoot = MerkleHelper.getRoot(whitelist);
    });
    it("Fail: startAirdrop with random user", async () => {
        await veSDTAirdropContract.startAirdrop(merkleRoot).should.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Fail: startAirdrop with owner but without sufficient CVG allowance", async () => {
        await cvgContract.connect(treasuryAirdrop).approve(veSDTAirdropContract, ethers.parseEther("10"));
        await veSDTAirdropContract.connect(treasuryDao).startAirdrop(merkleRoot).should.be.revertedWith("ALLOWANCE_INSUFFICIENT");
    });
    it("Fail: claim before start of airdrop", async () => {
        const proof = MerkleHelper.getProofMerkle(whitelist, await user1.getAddress());
        await veSDTAirdropContract.connect(user1).claim(proof).should.be.revertedWith("CLAIM_NOT_ACTIVE");
    });
    it("Success: startAirdrop with owner and right CVG allowance", async () => {
        await cvgContract.connect(treasuryAirdrop).approve(veSDTAirdropContract, ethers.parseEther("300000"));
        await veSDTAirdropContract.connect(treasuryDao).startAirdrop(merkleRoot);
    });
    it("Toggles contract locker", async () => {
        await lockingPositionServiceContract.connect(treasuryDao).toggleContractLocker(veSDTAirdropContract);
        expect(await lockingPositionServiceContract.isContractLocker(veSDTAirdropContract)).to.be.true;
    });
    it("Success: claim with right address", async () => {
        const proof = MerkleHelper.getProofMerkle(whitelist, await user1.getAddress());
        await expect(veSDTAirdropContract.connect(user1).claim(proof)).to.changeTokenBalances(cvgContract, [treasuryAirdrop], [-CLAIM]);
        expect(await lockingPositionManagerContract.balanceOf(user1)).to.be.equal("1");
        expect(await veSDTAirdropContract.cvgClaimable()).to.be.equal(ethers.parseEther("299000"));
    });
    it("Fail: re-claim with right address", async () => {
        const proof = MerkleHelper.getProofMerkle(whitelist, await user1.getAddress());
        await veSDTAirdropContract.connect(user1).claim(proof).should.be.revertedWith("ALREADY_CLAIMED");
    });
    it("Fail: claim with non-wl address", async () => {
        const proof = MerkleHelper.getProofMerkle(whitelist, await user1.getAddress());
        await veSDTAirdropContract.connect(owner).claim(proof).should.be.revertedWith("INVALID_PROOF");
    });
});
