import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { network, ethers } from 'hardhat';
import { ADDRESS_ZERO, WHITELISTED_TOKENS } from '../helper-hardhat-config';

const setUpGovernanceContracts: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments } = hre;
    const { log } = deployments;
    const { deployer } = await getNamedAccounts()
    const crowdfyToken = await ethers.getContract("CrowdfyToken", deployer);
    const timelock = await ethers.getContract("TimeLock", deployer);
    const crowdfyGovernance = await ethers.getContract("CrowdfyGovernance", deployer);
    log("------------------------------------------------------------------------------");
    log("Setting up roles...");
    const proposerRole = await timelock.PROPOSER_ROLE()
    const executorRole = await timelock.EXECUTOR_ROLE()
    const adminRole = await timelock.TIMELOCK_ADMIN_ROLE()

    const proposerTx = await timelock.grantRole(proposerRole, crowdfyGovernance.address)
    await proposerTx.wait(1)
    const executorTx = await timelock.grantRole(executorRole, ADDRESS_ZERO)
    await executorTx.wait(1)
    const revokeTx = await timelock.revokeRole(adminRole, deployer)
    await revokeTx.wait(1)

}

export default setUpGovernanceContracts
setUpGovernanceContracts.tags = ["all", "setup"]