import {AddressLike} from "ethers";
import {GaugeController} from "../../typechain-types-vyper/GaugeController";
import {expect} from "chai";
import {CvgRewards} from "../../typechain-types";

interface GaugeVotes {
    stakingContract: AddressLike;
    veCvgAmount: bigint;
}

interface GaugeControllerState {
    gaugeVotes: GaugeVotes[];
    totalVeCvg: bigint;
}
export async function getGaugeControllerVotes(gaugeController: GaugeController, cvgRewards: CvgRewards): Promise<GaugeControllerState> {
    const gaugeVotes: GaugeVotes[] = [];
    const numberOfGauges = await cvgRewards.gaugesLength();
    for (let index = 0; index < numberOfGauges; index++) {
        const stakingContract = await cvgRewards.gauges(index);
        const gaugeVote: GaugeVotes = {
            stakingContract,
            veCvgAmount: await gaugeController.get_gauge_weight(stakingContract),
        };
        gaugeVotes.push(gaugeVote);
    }
    return {
        gaugeVotes,
        totalVeCvg: await gaugeController.get_total_weight(),
    };
}
