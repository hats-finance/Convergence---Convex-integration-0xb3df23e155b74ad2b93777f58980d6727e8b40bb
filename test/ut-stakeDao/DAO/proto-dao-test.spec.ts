import {expect} from "chai";
import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";

import {deployDaoFixture} from "../../fixtures/stake-dao";
import {ProtoDao} from "../../../typechain-types";

const SEED_INVESTOR = "0x8B71030848F0AF16866F71F69Add2c97896c4d27";
const IBO_INVESTOR = "0x5691CCeA44Fc4a53886fF1b8666c89321f73C49D";
const WL_INVESTOR = "0xc84Fb42d655208Dcd9eE5617132A1667f54dD158";
const POD_TREASURY = "0xd2c46b4c28f4B7976d9f87687863c46Bb2f71Dbb";

const SEED_WL_INVESTOR = "0xe2853983A077B3e76A0876f4D6426B985F587eF4";
const RANDOM_USER = "0xcDA9D71bdfAe59b89Cee131eD3079f8AC4c77062";

describe("Proto Dao", () => {
    let protoDao: ProtoDao;

    before(async () => {
        const {contracts} = await loadFixture(deployDaoFixture);
        protoDao = contracts.dao.protoDao;
    });

    it("Gets CVG amount for random user must return 0", async () => {
        expect(await protoDao.getCvgAmount(RANDOM_USER)).to.equal(0);
    });

    it("Gets CVG amount for POD treasury must return 997.995", async () => {
        expect(await protoDao.getCvgAmount(POD_TREASURY)).to.equal(997995000000000000000000n);
    });

    it("Gets CVG amount for seed investor must return positive value", async () => {
        // 5000$ * 100 / 13 = 38461538461538461538461
        expect(await protoDao.getCvgAmount(SEED_INVESTOR)).to.equal(38461538461538461538461n);
    });

    it("Gets CVG amount for IBO investor must return positive value", async () => {
        // just checking it's greater than 0 as amount depends on Bond system
        expect(await protoDao.getCvgAmount(IBO_INVESTOR)).to.greaterThan(0);
    });

    it("Gets CVG amount for WL investor must return positive value", async () => {
        // 3850$ * 100 / 22 = 17500000000000000000000
        expect(await protoDao.getCvgAmount(WL_INVESTOR)).to.equal(17500000000000000000000n);
    });

    it("Gets CVG amount for both Seed and WL investor must return positive value", async () => {
        // 2000$ * 100 / 13 = 15384615384615384615384
        // 3850$ * 100 / 22 = 17500000000000000000000
        // 1600$ * 100 / 22 = 12307692307692307692307
        expect(await protoDao.getCvgAmount(SEED_WL_INVESTOR)).to.equal(45192307692307692307691n);
    });
});
