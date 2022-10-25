import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from "hardhat";
import verify from "../helper-functions"
import { networkConfig, developmentChains } from "../helper-hardhat-config"

const deployTokenContract: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, network, getNamedAccounts } = hre;
    const { deploy, log, } = deployments;
    log("------------------------------------------------------------------------------")
    log("Deploying CrowdfyToken and waiting for confirmations...")
    const chainId = network.config.chainId;
    const { deployer } = await getNamedAccounts()
    const crowdfyToken = await deploy("CrowdfyToken", {
        from: deployer,
        log: true,
        // we need to wait if on a live network so we can verify the contract on etherscan properly
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })
    log(`CrowdfyToken Deployed at ${crowdfyToken.address}`)
    log("------------------------------------------------------------------------------")
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(crowdfyToken.address, [])
    }
    // log(`Delegating to ${deployer}`)
    // await delegate(governanceToken.address, deployer)
    // log("Delegated!")
};

export default deployTokenContract;
deployTokenContract.tags = ["all", "Crowdfy Token"]


const delegate = async (governanceTokenAddress: string, delegatedAccount: string) => {
    const governanceToken = await ethers.getContractAt("GovernanceToken", governanceTokenAddress)
    const transactionResponse = await governanceToken.delegate(delegatedAccount)
    await transactionResponse.wait(1)
    console.log(`Checkpoints: ${await governanceToken.numCheckpoints(delegatedAccount)}`)
}
