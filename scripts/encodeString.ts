import {encodeBytes32String} from "ethers";

async function main() {
    const idsDelegation = ["sdcrv.eth", "sdbal.eth", "sdfxs.eth", "sdpendle.eth", "sdangle.eth", "sdfxn.eth"];
    const addressToDelegate = "0x52ea58f4FC3CEd48fa18E909226c1f8A0EF887DC"; //stakedao-delegation.eth
    for (const idDelegation of idsDelegation) {
        console.log(idDelegation, encodeBytes32String(idDelegation));
    }
}

main();

//ts-node scripts/encodeString.ts
