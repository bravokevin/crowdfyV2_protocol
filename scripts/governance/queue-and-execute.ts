import { ethers, network } from "hardhat"
import { developmentChains, MIN_DELAY } from "../../helper-hardhat-config"
import { mine } from "../../utils/move-blocks"
import { moveTime } from "../../utils/move-time"

export const queueAndExecute = async (functionToCall: string, proposalDescription: string, args: any[]) => {
    const crowdfyGovernance = await ethers.getContract("CrowdfyGovernance")
    const crowdfyFabric = await ethers.getContract("CrowdfyFabric")
    const encodedFunctionCall = crowdfyFabric.interface.encodeFunctionData(functionToCall, args)
    const descriptionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(proposalDescription))

    console.log("Queueing...")
    const queueTx = await crowdfyGovernance.queue(
        [crowdfyFabric.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
    )
    await queueTx.wait(1);

    // for testing pourposess
    if (developmentChains.includes(network.name)) {
        await mine(1);
        await moveTime(MIN_DELAY + 1);
        console.log("Executing")
        const executeTx = await crowdfyGovernance.execute(
            [crowdfyFabric.address],
            [0],
            [encodedFunctionCall],
            descriptionHash
        )
        await executeTx.wait(1);

    }
}
queueAndExecute('ads', 'adf', [])
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })