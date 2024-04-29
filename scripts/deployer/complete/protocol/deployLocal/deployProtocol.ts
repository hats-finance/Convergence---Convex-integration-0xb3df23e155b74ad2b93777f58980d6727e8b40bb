import {network} from "hardhat";
import {configureAccounts} from "../../../../../test/fixtures/testContext";
import {verifyContracts} from "./verifyEthernalContracts";
import {createProdBonds} from "../bond/createProdBonds";
import {galleryPresale} from "./galleryPresale";
import {getTokens} from "./getTokens";
import {takeOwnershipOfStakeGauge} from "./takeOwnershipAndSetDistributor";
import {getPositions} from "./getPositions";
import {deployAirdrop} from "./deployAirdrop";
import hre, {ethers} from "hardhat";

const IS_GALLERY_PRESALE = false;
const ISMULTIVOTE = false;
const ISMULTISTAKING = false;

async function main() {
    let accounts = await configureAccounts();
    // let users = {
    //     treasuryDao: await accounts.treasuryDao.getAddress(),
    //     treasuryTeam: await accounts.treasuryTeam.getAddress(),
    //     treasuryPod: await accounts.treasuryPod.getAddress(),
    //     treasuryPdd: await accounts.treasuryPdd.getAddress(),
    //     treasuryAirdrop: await accounts.treasuryAirdrop.getAddress(),
    //     veSdtMultisig: await accounts.veSdtMultisig.getAddress(),
    // };
    await getTokens(accounts);
    // await getPositions(accounts);
    // await deployAirdrop();
    // await takeOwnershipOfStakeGauge(accounts);
    await createProdBonds(accounts);

    // if (IS_GALLERY_PRESALE) await galleryPresale(accounts, ISMULTIVOTE, ISMULTISTAKING);
    // verify contracts if network is ethernal
    // if (network.name === "cvg") {
    //     await verifyContracts();
    // }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
