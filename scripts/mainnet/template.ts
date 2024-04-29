import dotenv from "dotenv";
dotenv.config();
import hre, {ethers} from "hardhat";

function delay(n: number) {
    return new Promise(function (resolve) {
        setTimeout(resolve, n * 1000);
    });
}
/*Please add on .env file:
DEPLOYER_PRIVKEY="PRIV_KEY"
ETHERSCAN_API_KEY="API_KEY"
*/
async function main() {
    if (process.env.ETHERSCAN_API_KEY !== undefined && process.env.DEPLOYER_PRIVKEY !== undefined) {
        const InternalDaoFactory = await ethers.getContractFactory("InternalDao");
        const internalDao = await InternalDaoFactory.deploy("");
        await internalDao.waitForDeployment();
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

        await (await internalDao.mintMultiple(addresses)).wait();

        await delay(Number(process.env.ETHERSCAN_API_KEY));

        await hre
            .run("verify:verify", {
                address: await internalDao.getAddress(),
                constructorArguments: [""],
            })
            .catch((error) => {
                console.log(error);
            });
    } else {
        console.log("PLEASE SETUP API KEYS !");
    }
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
