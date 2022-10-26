import { network } from "hardhat"
import * as fs from "fs"
import { proposalsFile } from "../helper-hardhat-config";

export const storeProposalId = (proposalId: any) => {
    const chainId = network.config.chainId!.toString();
    let proposals: any;

    if (fs.existsSync(proposalsFile)) {
        proposals = JSON.parse(fs.readFileSync(proposalsFile, "utf8"));
    }
    else {
        proposals = {};
        proposals[chainId] = [];
    }
    proposals[chainId].push(proposalId.toString());
    fs.writeFileSync(proposalsFile, JSON.stringify(proposals), "utf8");
}