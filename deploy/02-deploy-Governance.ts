import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { network } from 'hardhat';
import { networkConfig, developmentChains } from "../helper-hardhat-config";
import verify from "../helper-functions"
import { VOTING_DELAY, QUORUM_PERCENTAGE, VOTING_PERIOD } from '../helper-hardhat-config';


const deployGovernanceContract: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments } = hre;
    const { deploy, log, get } = deployments;
    log("------------------------------------------------------------------------------");
    log("Deploying CrowdfyGovernance and waiting for confirmations...");
    const chainId = network.config.chainId;
    const { deployer } = await getNamedAccounts()
    const crowdfyToken = await get("CrowdfyToken");
    const timelock = await get("TimeLock");
    const crowdfyGovernance = await deploy(
        "CrowdfyGovernance", {
        from: deployer,
        args: [
            crowdfyToken.address,
            timelock.address,
            QUORUM_PERCENTAGE,
            VOTING_PERIOD,
            VOTING_DELAY
        ],
        log: true,
        // we need to wait if on a live network so we can verify the contract on etherscan properly
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })
    log(`CrowdfyGovernance Deployed at ${crowdfyGovernance.address}`)
    log("------------------------------------------------------------------------------");
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(crowdfyGovernance.address, [])
    }
};
export default deployGovernanceContract;
deployGovernanceContract.tags = ["all", "Crowdfy Governance"]
