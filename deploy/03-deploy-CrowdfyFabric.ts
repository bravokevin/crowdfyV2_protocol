import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { network, ethers } from 'hardhat';
import { networkConfig, developmentChains } from "../helper-hardhat-config";
import verify from "../helper-functions"

const deployFabricContract: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const allowancePerCampaign = ethers.BigNumber.from('1020000000000000000000').div(17);
    const { deployments, getNamedAccounts } = hre;
    const { deploy, log, get } = deployments;
    log("------------------------------------------------------------------------------")
    log("Deploying CrowdfyFabric and waiting for confirmations...")
    const chainId = network.config.chainId;
    const crowdfyToken = await get("CrowdfyToken");
    const { deployer } = await getNamedAccounts()
    const crowdfyFabric = await deploy(
        "CrowdfyFabric", {
        from: deployer,
        args: [
            networkConfig[network.name].whitlistedTokens || [],
            crowdfyToken.address,
            allowancePerCampaign
        ],
        log: true,
        // we need to wait if on a live network so we can verify the contract on etherscan properly
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })
    log(`CrowdfyFabric Deployed at ${crowdfyFabric.address}`)
    log("------------------------------------------------------------------------------")
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(crowdfyFabric.address, [])
    }
    const timelock = await ethers.getContract("TimeLock")
    const fabricContract = await ethers.getContract("CrowdfyFabric", deployer);
    const transferOwnershipTx = await fabricContract.changeProtocolOwner(timelock.address)
    await transferOwnershipTx.wait(1)

};
export default deployFabricContract;
deployFabricContract.tags = ["all", "Crowdfy Fabric"]
