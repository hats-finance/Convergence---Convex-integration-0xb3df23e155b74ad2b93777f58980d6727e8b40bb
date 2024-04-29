import {ethers} from "hardhat";

describe("Processable Rewards StakeDao Chainview", () => {
    it("Success : Test that retrieve", async () => {
        const ff = await ethers.getContractFactory("SdtStakingProcessableRewards");

        const deploy = await ff.getDeployTransaction(["0x2FF160bcADb485b5F048b9880e6f471Af632060c"]);
        let dataError: any;
        try {
            await ethers.provider.estimateGas(deploy);
        } catch (e: any) {
            dataError = e.message;
        }
    });
});
