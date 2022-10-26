import { ethers, network } from "hardhat";
import * as fs from "fs"
import { developmentChains, VOTING_PERIOD, proposalsFile } from "../../helper-hardhat-config";
import { mine } from "../../utils/move-blocks";

const main = async () => {
    const proposals = JSON.parse(fs.readFileSync(proposalsFile, "utf8"));
    // Get the last proposal for the network.
    const proposalId = proposals[network.config.chainId!].at(-1);
    // 0 = Against, 1 = For, 2 = Abstain for this example
    const voteWay = 1;
    const reason = 'dsfadfad';
    await vote(proposalId, voteWay, reason)
}

export const vote = async (proposalId: string, voteWay: number, reason: string) => {
    console.log("Voting...");
    const crowdfyGovernance = await ethers.getContract("CrowdfyGovernance");
    const voteTx = await crowdfyGovernance.castVoteWithReason(proposalId, voteWay, reason);
    const voteTxReceipt = await voteTx.wait(1);
    console.log(voteTxReceipt.events[0].args.reason);
    const proposalState = await crowdfyGovernance.state(proposalId);
    console.log(`Current proposal state: ${proposalState}`);
    if (developmentChains.includes(network.name)) await mine(VOTING_PERIOD + 1);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })