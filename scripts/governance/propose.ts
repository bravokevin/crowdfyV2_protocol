import { ethers, network } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { VOTING_DELAY } from "../../helper-hardhat-config";
import { mine } from "../../utils/move-blocks";
import { storeProposalId } from "../../utils/storeProporsals";

export const propose = async (args: any[], functionToCall: string, proposalDescription: string) => {
    const crowdfyGovernance = await ethers.getContract("CrowdfyGovernance");
    const crowdfyFabric = await ethers.getContract("CrowdfyFabric");
    const encodedFunctionCall = crowdfyFabric.interface.encodeFunctionData(functionToCall, args)
    console.log(`Proposing ${functionToCall} on ${crowdfyFabric.address} with ${args}`)
    console.log(`Proposal Description:\n  ${proposalDescription}`)

    const proposeTx = await crowdfyGovernance.propose(
        [crowdfyFabric.address],
        [0],
        [encodedFunctionCall],
        proposalDescription
    );

    // If working on a development chain, we will push forward till we get to the voting period for testing pourposes
    if (developmentChains.includes(network.name)) await mine(VOTING_DELAY + 1);

    const proposeReceipt = await proposeTx.wait(1);
    // getting the id from the events, to be able to vote latter
    const proposalId = proposeReceipt.events[0].args.proposalId;
    const proposalState = await crowdfyFabric.state(proposalId)
    const proposalSnapShot = await crowdfyFabric.proposalSnapshot(proposalId)
    const proposalDeadline = await crowdfyFabric.proposalDeadline(proposalId)
    // save the proposalId
    storeProposalId(proposalId);
    // The state of the proposal. 1 is not passed. 0 is passed.
    console.log(`Current Proposal State: ${proposalState}`)
    // What block # the proposal was snapshot
    console.log(`Current Proposal Snapshot: ${proposalSnapShot}`)
    // The block number the proposal voting expires
    console.log(`Proposed with proposal ID:\n  ${proposalId}`)
    console.log(`Current Proposal Deadline: ${proposalDeadline}`)

}
propose([], 'adsf', 'adsf')
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })