import {task} from "hardhat/config";
import contracts from "../../scripts/deployer/complete/contractRegistryMainnet.json";
import artifact from "../../artifacts/contracts/ChainView/SdtStakingStreamInfo.sol/SdtStakingStreamInfo.json";
import {HardhatRuntimeEnvironment} from "hardhat/types";


task("chainview:sdtstream", "task used to call view function", async function (taskArguments, hre: HardhatRuntimeEnvironment, b) {
    let addresses = contracts.addresses;

    const controlTower = await hre.ethers.getContractAt("CvgControlTower", addresses.CvgControlTower);
    const stakings = await controlTower.getSdtStakings(0,100);
    const sdtStakings = stakings.map((s) => s.stakingContract);
    const provider = hre.ethers.provider;
    const ChainViewInterface = new hre.ethers.Interface(artifact.abi);
    const ChainView = new hre.ethers.ContractFactory(artifact.abi, artifact.bytecode);
    const deploy = await ChainView.getDeployTransaction(sdtStakings);
    console.log(deploy)
    let dataError;
    try {
        await provider.estimateGas(deploy);
    } catch (e) {
        console.log(e)
        dataError = e.data;
    }
    const decoded = ChainViewInterface.parseError(dataError);
    if (decoded?.args?.at(0)) {
        const ob = decoded.args[0];
        if (ob) {
            console.log(ob)
          //  return recursiveToObject(ob);
        }
    }






});
