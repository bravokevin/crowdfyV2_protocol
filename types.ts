import { BigNumber } from "ethers";

export type CampaignStruct = {
    campaignName: string;
    fundingGoal: BigNumber,
    fundingCap: BigNumber;
    deadline: BigNumber;
    beneficiary: string;
    owner: string;
    created: BigNumber;
    state: number;
    selectedToken: string;
    amountRised: BigNumber;
}
