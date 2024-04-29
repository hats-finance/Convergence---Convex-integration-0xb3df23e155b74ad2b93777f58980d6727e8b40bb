import {defaultLogo, sdtStakingLogos} from "../../resources/staking_logos";
import fs from "fs";

interface SVGAttributes {
    [key: string]: string;
}
type SDTStakingLogosConverted = {
    [key: string]: ConvertedLogo[];
};
interface ConvertedLogo {
    balise: string;
    data: SVGAttributes;
    textContent?: string;
}

function convertLogo(sdLogo: string): ConvertedLogo[] {
    const tagRegex = /<(\w+)([^>]+)>/g;
    let tagMatch;
    const logoConverted: ConvertedLogo[] = [];

    while ((tagMatch = tagRegex.exec(sdLogo)) !== null) {
        const tag = tagMatch[1];
        const attrString = tagMatch[2];
        let textContent = "";

        const attrRegex = /([\w-]+)=["']([^"']+)["']/g;
        let attrMatch;
        const attributes: SVGAttributes = {};

        while ((attrMatch = attrRegex.exec(attrString)) !== null) {
            attributes[attrMatch[1]] = attrMatch[2];
        }

        if (tag === "text") {
            const textRegex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`);
            const textMatch = sdLogo.match(textRegex);
            if (textMatch && textMatch[1]) {
                textContent = textMatch[1].trim();
            }
        }

        const convertedLogo: ConvertedLogo = {
            balise: tag,
            data: attributes,
        };

        if (textContent) {
            convertedLogo.textContent = textContent;
        }

        logoConverted.push(convertedLogo);
    }

    return logoConverted;
}

function main() {
    const logosConverted: SDTStakingLogosConverted = {};
    for (const logoName in sdtStakingLogos) {
        logosConverted[logoName] = convertLogo(sdtStakingLogos[logoName]);
    }
    const outputFile = "utils/svg/logosConverted.json";
    fs.writeFileSync(outputFile, JSON.stringify(logosConverted, null, 4));

    fs.writeFileSync("utils/svg/defaultConverted.json", JSON.stringify(convertLogo(defaultLogo), null, 4));
}

main();

//ts-node utils/svg/convertLogo
