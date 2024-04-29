import {expect} from "chai";

import {MAX_INTEGER} from "@nomicfoundation/ethereumjs-util";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployBondFixture} from "../../fixtures/stake-dao";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {Signer} from "ethers";
import {ERC20} from "../../../typechain-types/@openzeppelin/contracts/token/ERC20";
import {BondDepository, BondPositionManager} from "../../../typechain-types/contracts/Bond";
import {ethers} from "hardhat";
import {MINT, TOKEN_1, TOKEN_2, TOKEN_3} from "../../../resources/constant";
import {TOKEN_ADDR_CNC} from "../../../resources/tokens/common";
import {ApiHelper} from "../../../utils/ApiHelper";

describe("BondDepository - Tokenization", () => {
    let owner: Signer, treasuryDao: Signer, user1: Signer;
    let usdt: ERC20, cnc: ERC20;
    let bondDepository: BondDepository;
    let token;
    let bondPositionManager: BondPositionManager;
    let prices: any;

    before(async () => {
        let {contracts, users} = await loadFixture(deployBondFixture);

        owner = users.owner;
        user1 = users.user1;
        treasuryDao = users.treasuryDao;
        prices = await ApiHelper.getDefiLlamaTokenPrices([TOKEN_ADDR_CNC]);

        bondPositionManager = contracts.bonds.bondPositionManager;
        bondDepository = contracts.bonds.bondDepository;

        token = contracts.tokens;

        cnc = token.cnc;
        usdt = token.usdt;

        // approve users USDT
        await usdt.connect(user1).approve(bondDepository, MAX_INTEGER);
        await usdt.connect(owner).approve(bondDepository, MAX_INTEGER);

        // approve users CNC
        await cnc.connect(user1).approve(bondDepository, MAX_INTEGER);
        await cnc.connect(owner).approve(bondDepository, MAX_INTEGER);
    });
    const BOND_USDT = 1;
    it("Success : Should create bond Stable", async () => {
        const tx = await bondDepository.connect(treasuryDao).createBond([
            {
                bondDuration: 86400 * 70,
                cvgToSell: ethers.parseEther("1000000"),
                minRoi: 5_000,
                maxRoi: 65_000,
                composedFunction: 0,
                vestingTerm: 432_000,
                token: usdt,
                percentageOneTx: 150,
                gamma: 250_000,
                scale: 5_000,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                isPaused: false,
            },
        ]);

        await time.increase(10);
    });

    const BOND_CNC = 2;
    it("Success : Should create bond not stable", async () => {
        const tx2 = await bondDepository.connect(treasuryDao).createBond([
            {
                bondDuration: 86400 * 70,
                cvgToSell: ethers.parseEther("1000000"),
                minRoi: 5_000,
                maxRoi: 65_000,
                composedFunction: "0",
                vestingTerm: 7_600,
                token: cnc,
                percentageOneTx: 200,
                gamma: 250_000,
                scale: 5_000,
                startBondTimestamp: (await ethers.provider.getBlock("latest"))!.timestamp + 10,
                isPaused: false,
            },
        ]);
        await time.increase(10);
    });

    it("Fail : depositing asset on a token not created", async () => {
        await expect(bondDepository.deposit(BOND_USDT, TOKEN_1, ethers.parseEther("5"), 1, owner)).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("Success : creating a bond on USDT", async () => {
        await bondDepository.deposit(BOND_USDT, MINT, ethers.parseUnits("5", 6), 1, owner);
    });

    it("Fail : using a bond token that is not owned", async () => {
        await expect(bondDepository.connect(user1).deposit(BOND_USDT, TOKEN_1, ethers.parseEther("5"), 1, user1)).to.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Fail : updating a bond token on a wrong bondDepository", async () => {
        await expect(bondDepository.deposit(BOND_CNC, TOKEN_1, ethers.parseEther("5"), 1, owner)).to.be.revertedWith("NO_UPT_BOND_ID_ON_OPEN_POSITION");
    });

    it("Fail : redeeming a bond token not owned", async () => {
        await expect(bondDepository.connect(user1).redeem([TOKEN_1], user1)).to.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Fail : burning a bond token not fully claimed", async () => {
        await expect(bondPositionManager.burn(1)).to.be.revertedWith("POSITION_STILL_OPEN");
    });
    it("Fail : burning a bond token not owned", async () => {
        await expect(bondPositionManager.connect(user1).burn(1)).to.be.revertedWith("TOKEN_NOT_OWNED");
    });

    it("Success : creating a second bond on USDT & claim it fully", async () => {
        await bondDepository.deposit(BOND_USDT, MINT, ethers.parseUnits("10", 6), 1, owner);
        await time.increase(10 * 86400);
        await bondDepository.redeem([TOKEN_2], owner);
    });

    it("Success : creating a third bond on USDT", async () => {
        await bondDepository.deposit(BOND_USDT, MINT, ethers.parseUnits("10000", 6), 1, owner);
    });
    it("Success : View function for getting infos per token ids", async () => {
        const tokens = await bondDepository.getBondInfosPerTokenIds([TOKEN_2, TOKEN_3]);

        expect(tokens[0].claimableCvg).to.be.eq("0");
        expect(tokens[0].leftClaimable).to.be.eq("0");

        expect(tokens[1].claimableCvg).to.be.eq("0");
        expect(tokens[1].leftClaimable).to.be.eq("32409658078107275968238");
    });

    it("Success : View function for the bond depository per TokenID", async () => {
        const tokens = await bondPositionManager.getBondIdsOfTokens([TOKEN_1, TOKEN_2, TOKEN_3]);
        expect(tokens).to.be.deep.eq([BOND_USDT, BOND_USDT, BOND_USDT]);
    });

    it("Success : redeeming a bond token ", async () => {
        await time.increase(8 * 86400);
        await bondDepository.redeem([TOKEN_1], user1);
    });

    it("Verify : That all position is claimed", async () => {
        const bondInfo = await bondDepository.positionInfos(TOKEN_1);
        expect(bondInfo.leftClaimable).to.be.eq(0);
        expect(bondInfo.vestingTimeLeft).to.be.eq(0);
    });

    it("Success : burning a token", async () => {
        const tx = await bondPositionManager.burn(1);
    });

    it("Verify : token burnt", async () => {
        await expect(bondPositionManager.ownerOf(1)).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("Fail : calling mint function on BondPositionManager from a random address", async () => {
        await expect(bondPositionManager.mintOrCheck(BOND_USDT, TOKEN_1, owner)).to.be.revertedWith("NOT_BOND_DEPOSITORY");
    });

    let totalToken2 = 0n;

    it("Success : Replace the bondID of the token 2. Possible as token 2 is empty. USDT => CNC", async () => {
        const cncToPay = 10_000;
        const cvgPriceExpected = 0.33 - 0.33 * 0.065;

        const cncPrice = prices[TOKEN_ADDR_CNC].price;

        const dollarValueDeposited = cncPrice * cncToPay;
        const cvgMintedExpected = dollarValueDeposited / cvgPriceExpected;

        expect(await bondPositionManager.bondPerTokenId(TOKEN_2)).to.be.eq(BOND_USDT);

        await bondDepository.deposit(BOND_CNC, TOKEN_2, ethers.parseEther("10000"), 1, owner);
        const bondPending = await bondDepository.positionInfos(TOKEN_2);
        expect(Number(ethers.formatEther(bondPending.leftClaimable))).to.be.within(cvgMintedExpected * 0.95, cvgMintedExpected * 1.05);

        expect(await bondPositionManager.bondPerTokenId(TOKEN_2)).to.be.eq(BOND_CNC);
    });

    it("Success : Timelock the token 2 in one day", async () => {
        const timestamp = await time.latest();
        const tx = await bondPositionManager.setLock(TOKEN_2, timestamp + 86400);
        expect(await bondPositionManager.unlockingTimestampPerToken(2)).to.be.eq(timestamp + 86400);
    });

    it("Fail : Refreshing a bond vesting end when timelocked", async () => {
        await expect(bondDepository.deposit(BOND_CNC, TOKEN_2, 10, 1, owner)).to.be.revertedWith("TOKEN_TIMELOCKED");
    });

    it("Fail : Redeeming a bond when timelocked", async () => {
        await expect(bondDepository.redeem([TOKEN_2], owner)).to.be.revertedWith("TOKEN_TIMELOCKED");
    });

    it("Success : Transfer the token to simulate a sell, wait 1 day and redeem with new owner", async () => {
        await bondPositionManager.transferFrom(owner, user1, TOKEN_2);
        await time.increase(1 * 86400);
        await bondDepository.connect(user1).redeem([TOKEN_2], user1);
    });
});
