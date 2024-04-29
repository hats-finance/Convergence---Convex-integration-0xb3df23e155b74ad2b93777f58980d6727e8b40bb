
import {time} from "@nomicfoundation/hardhat-toolbox/network-helpers";

import fs, {PathOrFileDescriptor} from "fs";
import {IContractsUser} from "../contractInterface";
import {ethers} from "hardhat";
import {
    goOnNextWeek,
    verifySumVotesGaugeControllerEqualsTotalVotes,
    verifyTotalAmountDistributedInCvg,
    verifyVeSumBalancesEqualsTotalSupply,
    verifyYsSumBalancesEqualsTotalSupply,
    verifyYsSumBalancesEqualsTotalSupplyHistory,
} from "../locking/invariants.checks";

const baseChart = {
    labels: [],
    datasets: [
        {
            label: "ysCvg",
            data: [],
            fill: false,
            borderColor: "rgb(0, 0, 255)",
            tension: 0.1,
        },
        {
            label: "veCvg",
            data: [],
            fill: false,
            borderColor: "rgb(255,215,0)",
            tension: 0.1,
        },
    ],
};

export const increaseCvgCycleAndWriteForPlotting = async ({contracts, users}: IContractsUser, cycleAmount: number) => {
    const path = "./utils/charts/totalSuppliesData.json";
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, Buffer.from(JSON.stringify(baseChart)));
    }
    const pathOrFileDescriptor = path as PathOrFileDescriptor;

    const data = JSON.parse(fs.readFileSync(pathOrFileDescriptor).toString());
    const labels = data.labels;
    const ysCvgData = data.datasets[0].data;
    const veCvgData = data.datasets[1].data;
    const cvgRewards = contracts.rewards.cvgRewards;

    for (let i = 0; i < cycleAmount; i++) {
        const actualCycle = await contracts.base.cvgControlTower.cvgCycle();

        const cycleId = await contracts.base.cvgControlTower.cvgCycle();
        labels.push(cycleId.toString());
        const totalSupplyYsCvg = await contracts.locking.lockingPositionService.totalSupplyOfYsCvgAt(cycleId);
        ysCvgData.push(Number(ethers.formatEther(totalSupplyYsCvg)));
        veCvgData.push(Number(ethers.formatEther(await contracts.locking.veCvg.total_supply())));

        await goOnNextWeek();
        await contracts.locking.veCvg.checkpoint();

        await (await cvgRewards.connect(users.treasuryDao).writeStakingRewards(3)).wait();

        // Verify Invariants of the project
        await verifySumVotesGaugeControllerEqualsTotalVotes(contracts.locking.gaugeController);
        await verifyVeSumBalancesEqualsTotalSupply(contracts.locking.veCvg, contracts.locking.lockingPositionManager);
        await verifyYsSumBalancesEqualsTotalSupply(
            contracts.locking.lockingPositionService,
            contracts.locking.lockingPositionManager,
            Number(actualCycle),
            Number(actualCycle)
        );
        await verifyYsSumBalancesEqualsTotalSupplyHistory(
            contracts.locking.lockingPositionService,
            contracts.locking.lockingPositionManager,
            Number(actualCycle),
            Number(actualCycle)
        );

        await verifyTotalAmountDistributedInCvg(contracts.base.cvgControlTower, contracts.rewards.cvgRewards, contracts.locking.gaugeController);
    }

    fs.writeFileSync(path, Buffer.from(JSON.stringify(data, null, "    ")));
};
function colorGenerator() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
}

export const plotTokenSuppliesYsCvg = async (contractUsers: IContractsUser, tokenId: any) => {
    const path = "./utils/charts/tokenSuppliesYsCvg.json";
    let json;
    if (!fs.existsSync(path)) {
        json = {
            labels: [],
            datasets: [],
        };
    } else {
        json = JSON.parse(fs.readFileSync(path).toString());
    }
    let initializeLabels;

    const newToken = {
        label: "token" + tokenId,
        data: [] as number[],
        fill: false,
        borderColor: colorGenerator(),
        tension: 0.1,
    };

    if (json.labels.length == 0) {
        initializeLabels = true;
    }
    for (let cycle = 1; cycle < 251; cycle++) {
        if (initializeLabels) {
            json.labels.push(cycle);
        }
        const ysBalance = Number(ethers.formatEther(await contractUsers.contracts.locking.lockingPositionService.balanceOfYsCvgAt(tokenId, cycle)));
        newToken.data.push(ysBalance);
    }
    json.datasets.push(newToken);
    fs.writeFileSync(path, Buffer.from(JSON.stringify(json, null, "    ")));
};

export const plotTokenSuppliesMgCvg = async (contractsUsers: IContractsUser, tokenId: any) => {
    const path = "./utils/charts/tokenSuppliesMgCvg.json";
    let json;
    if (!fs.existsSync(path)) {
        json = {
            labels: [],
            datasets: [],
        };
    } else {
        json = JSON.parse(fs.readFileSync(path).toString());
    }
    let initializeLabels;

    const newToken = {
        label: "token" + tokenId,
        data: [] as number[],
        fill: false,
        borderColor: colorGenerator(),
        tension: 0.1,
    };

    if (json.labels.length == 0) {
        initializeLabels = true;
    }

    json.datasets.push(newToken);
    fs.writeFileSync(path, Buffer.from(JSON.stringify(json, null, "    ")));
};
