import {TOKEN_ADDR_CVX, TOKEN_ADDR_crvUSD} from "../resources/tokens/common";
import {parseEther} from "ethers";
async function main() {
    const timestampStart = "1711467000";
    const durationBond = (86400 * 30).toString();
    const vestinTerm1 = (86400 * 14).toString();
    const vestinTerm2 = (86400 * 21).toString();
    const bond1 = [
        "0",
        TOKEN_ADDR_crvUSD,
        "250000",
        durationBond,
        false,
        "5000",
        "40000",
        "90000",
        "250",
        vestinTerm1,
        parseEther("35000").toString(),
        timestampStart,
    ];
    const bond2 = [
        "0",
        TOKEN_ADDR_crvUSD,
        "250000",
        durationBond,
        false,
        "5000",
        "75000",
        "125000",
        "250",
        vestinTerm2,
        parseEther("35000").toString(),
        timestampStart,
    ];
    const bond3 = [
        "0",
        TOKEN_ADDR_CVX,
        "250000",
        durationBond,
        false,
        "5000",
        "75000",
        "125000",
        "250",
        vestinTerm2,
        parseEther("30000").toString(),
        timestampStart,
    ];
    const data = [bond1, bond2, bond3];
    console.log(JSON.stringify(data));
}

main();

//ts-node scripts/dataBond.ts
