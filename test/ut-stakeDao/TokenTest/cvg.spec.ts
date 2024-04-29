import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised).should();
const expect = chai.expect;

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deploySdtStakingFixture} from "../../fixtures/stake-dao";
import {Signer} from "ethers";
import {IContracts, IContractsUser, IUsers} from "../../../utils/contractInterface";
import {ethers} from "hardhat";
import {CvgControlTower, Cvg} from "../../../typechain-types";

describe("Cvg Token Tests", () => {
    let treasuryDao: Signer;

    let owner: Signer, user1: Signer;
    let cvgContract: Cvg, cvgControlTower: CvgControlTower;
    let contractsUsers: IContractsUser, contracts: IContracts, users: IUsers;

    let maxBond: bigint, maxStaking: bigint;

    before(async () => {
        contractsUsers = await loadFixture(deploySdtStakingFixture);
        contracts = contractsUsers.contracts;
        users = contractsUsers.users;

        cvgControlTower = contracts.base.cvgControlTower;

        const tokens = contracts.tokens;
        cvgContract = tokens.cvg;
        owner = users.owner;
        user1 = users.user1;
        treasuryDao = users.treasuryDao;

        maxBond = await cvgContract.MAX_BOND();
        maxStaking = await cvgContract.MAX_STAKING();
    });
    it("Success: burn cvg token", async () => {
        const supplyBefore = await cvgContract.totalSupply();
        const amount = ethers.parseEther("1");
        const tx = cvgContract.burn(amount);
        await expect(tx).to.changeTokenBalances(cvgContract, [owner], [-amount]);
        expect(await cvgContract.totalSupply()).to.be.equal(supplyBefore - amount);
    });
    it("Fail: mint cvg token with random user", async () => {
        await cvgContract.mintBond(owner, 1n).should.be.revertedWith("NOT_BOND");
        await cvgContract.mintStaking(owner, 1n).should.be.revertedWith("NOT_STAKING");
    });
    it("Success: add owner as an staking/bond minter", async () => {
        await cvgControlTower.connect(treasuryDao).setCloneFactory(owner);
        await cvgControlTower.connect(treasuryDao).toggleBond(owner);
        await cvgControlTower.insertNewSdtStaking(owner);
    });

    it("Fails: mint cvg token more than max bond not authorized", async () => {
        await cvgContract.mintBond(owner, maxBond + 1n).should.be.revertedWith("MAX_SUPPLY_BOND");
    });

    it("Success: mint cvg tokens from staking", async () => {
        const tx = cvgContract.mintStaking(user1, maxStaking - 1n);

        await expect(tx).to.changeTokenBalances(cvgContract, [user1], [maxStaking - 1n]);
        expect(await cvgContract.mintedStaking()).to.be.equal(maxStaking - 1n);
    });

    it("Success: mint cvg tokens more than maximum allowed from staking", async () => {
        // it should only mint 1 token as there's only one left from staking
        const tx = cvgContract.mintStaking(user1, 5n);

        await expect(tx).to.changeTokenBalances(cvgContract, [user1], [1n]);
        expect(await cvgContract.mintedStaking()).to.be.equal(maxStaking);
    });

    it("Fails: mint cvg tokens from staking with no remaining supply", async () => {
        await cvgContract.mintStaking(owner, 5n).should.be.revertedWith("MAX_SUPPLY_STAKING");
    });
});
