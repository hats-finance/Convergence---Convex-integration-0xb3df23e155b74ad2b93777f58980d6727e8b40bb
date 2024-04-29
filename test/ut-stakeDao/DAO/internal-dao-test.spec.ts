import {expect} from "chai";
import {Signer, ZeroAddress} from "ethers";
import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";

import {InternalDao} from "../../../typechain-types";
import {deployDaoFixture} from "../../fixtures/stake-dao";
import {ethers} from "hardhat";

const BURN_AUTH_ISSUER_ONLY = 0;

describe("Internal Dao", () => {
    let user1: Signer;
    let user2: Signer;
    let treasuryDao: Signer;

    let internalDao: InternalDao;

    before(async () => {
        const {contracts, users} = await loadFixture(deployDaoFixture);

        user1 = users.user1;
        user2 = users.user2;
        treasuryDao = users.treasuryDao;

        internalDao = contracts.dao.internalDao;
    });

    it("Fails to mint NFT with non-owner account", async () => {
        await expect(internalDao.connect(user1).mint(user1)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Successfully mint NFT to user", async () => {
        await expect(internalDao.mint(user1))
            .to.emit(internalDao, "Issued")
            .withArgs(ZeroAddress, await user1.getAddress(), 1, BURN_AUTH_ISSUER_ONLY);

        expect(await internalDao.balanceOf(user1)).to.be.equal(1);
    });

    it("Fails to mint NFT to already member", async () => {
        await expect(internalDao.mint(user1)).to.be.revertedWith("ALREADY_MEMBER");
    });

    it("Checks tokenURI for tokenID 1", async () => {
        expect(await internalDao.tokenURI(1)).to.be.equal("ipfs://internal-dao-uri/");
    });

    it("Checks burn authentication for token", async () => {
        expect(await internalDao.burnAuth(1)).to.be.equal(BURN_AUTH_ISSUER_ONLY);
    });

    it("Fails to transfer token to another user", async () => {
        await expect(internalDao.connect(user1).transferFrom(user1, user2, 1)).to.be.revertedWith("ERC5484: NON_TRANSFERABLE");
    });

    it("Fails to set tokens URI with non-owner account", async () => {
        await expect(internalDao.connect(user1).setTokensURI("ipfs://fake-link/")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Set new tokens URI", async () => {
        await internalDao.setTokensURI("ipfs://real-link/");
        expect(await internalDao.tokenURI(1)).to.be.equal("ipfs://real-link/");
    });

    it("Fails to burn NFT from member with non-owner account", async () => {
        await expect(internalDao.connect(user1).burn(1)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Burn NFT from member (tokenId: 1)", async () => {
        await internalDao.burn(1);
        expect(await internalDao.balanceOf(user1)).to.be.equal(0);
    });

    it("Success : Mint several  NFT", async () => {
        const actualId = await internalDao.nextTokenId();
        const addresses = [
            "0x505FB4560914eA9c3af22b75ca55c3881472ae45",
            "0xE253D64619F13f1c0bdccCFD6F2CAa4cc4838836",
            "0x84195879d3117089e2d28a3192847cf0EA4FF6b8",
            "0x58f9C59EB0144E2CC6eF433cdaC4fFe0D3CE9657",
            "0xd7EF914ecd9Adb3dFB27A165bb66E75b4D45CC10",
            "0xDA0de4a5c51d1179815C2caa51c35C4Be43157a5",
            "0x37B46d7E1795C0a303e69689eB75fd6499562e2d",
            "0x8638bb780E5Dc0a6CED54a2Dc46770de34DA7E84",
            "0x7B79eDD278742816D8C395bf9B564c62a6AF98AC",
            "0x643861ABF4386cB2f8f4d7bD49221389F675839A",
            "0x35E55a4227160D4d4f1b1732318d5062f348b354",
            "0x394b67c6bc05abb14c73a57706dcd5cb85231c4e",
            "0x45f00a71ad07f32a785cca0c0c11486063ea874d",
            "0x605b3a9CeAaBa25448E7838AdFD52CE16a0761BF",
            "0xf8318eee38a5a1da616e7268aec20ce7e46a11ab",
            "0x6e674e64b2c5f6400b40d9aE6E555fF56e7D2F7C",
            "0xF29a53cCA8Be4cCC45a5406a62107BF40ABeEA4E",
            "0x4238c0C5a79E08846928B0bEF02B99941e4211ca",
        ];
        await internalDao.mintMultiple(addresses);
        for (let index = 0n; index < addresses.length; index++) {
            expect(await internalDao.balanceOf(addresses[Number(index)])).to.be.eq(1);
            expect(await internalDao.ownerOf(actualId + index)).to.be.eq(ethers.getAddress(addresses[Number(index)]));
        }

        expect(await internalDao.nextTokenId()).to.be.eq(actualId + BigInt(addresses.length));
    });
});
