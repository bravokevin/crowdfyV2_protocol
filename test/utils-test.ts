import { ethers } from "hardhat";
import { CampaignStruct } from "../types";
import { WHITELISTED_TOKENS, FIFTY_ETH, HUNDRED_ETH, STATE, ONE_YEAR_IN_SECS } from "../helper-hardhat-config";


export const separateCampaignObject = (struct: CampaignStruct) => {
    const { campaignName, fundingGoal, fundingCap, deadline, beneficiary, owner, created, state, selectedToken, amountRised } = struct;
    const campaign = { campaignName, fundingGoal, fundingCap, deadline, beneficiary, owner, created, state, selectedToken, amountRised };
    return campaign;
};
export const destructContribution = (struct: any) => {
    const { sender, value, numberOfContributions } = struct;
    const contribution = { sender, value, numberOfContributions };
    return contribution;
}

export const createConributionObject = (_sender: string, _value: any, _numberOfContribution: number) => {
    const contribution = {
        sender: _sender,
        value: ethers.BigNumber.from(_value),
        numberOfContributions: ethers.BigNumber.from(_numberOfContribution)
    }
    return contribution
}



