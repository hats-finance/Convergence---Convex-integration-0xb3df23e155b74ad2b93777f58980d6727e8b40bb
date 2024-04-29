import fs from "fs";
const registryPath = "./scripts/deployer/complete/contractRegistry.json";
const registryMainnetPath = "./scripts/deployer/complete/contractRegistryMainnet.json";

export const cleanFile = (registry = registryPath) => {
    const json = JSON.parse(fs.readFileSync(registryMainnetPath).toString());
    fs.writeFileSync(registry, JSON.stringify(json, null, 4));
};

cleanFile();
