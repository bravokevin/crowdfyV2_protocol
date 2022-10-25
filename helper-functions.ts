import { run } from "hardhat"

/**
 * @notice Helper function that allow us to verify the contracts on etherscan
 * @dev checks if a contract was already verified.
 * @param contractAddress the contract we want to verify
 * @param args whatever args 
 */
const verify = async (contractAddress: string, args: any[]) => {
    console.log("Verifying contract...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e: any) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!")
        } else {
            console.log(e)
        }
    }
}

export default verify