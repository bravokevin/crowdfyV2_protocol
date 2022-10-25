import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { network } from 'hardhat';
import { networkConfig, developmentChains, MIN_DELAY } from "../helper-hardhat-config";
import verify from "../helper-functions"


const deployTimelockContract: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, log, get } = deployments;
    const { deployer } = await getNamedAccounts()
    log("------------------------------------------------------------------------------")
    log("Deploying Timelock and waiting for confirmations...")
    const chainId = network.config.chainId;
    const timelock = await deploy(
        "TimeLock", {
        from: deployer,
        args: [MIN_DELAY, [], []],
        log: true,
        // we need to wait if on a live network so we can verify the contract on etherscan properly
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })
    log(`Timelock Deployed at ${timelock.address}`)
    log("------------------------------------------------------------------------------")
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(timelock.address, [])
    }
};
export default deployTimelockContract;
deployTimelockContract.tags = ["all", "Timelock"]