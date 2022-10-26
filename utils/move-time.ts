import { network } from "hardhat"

export const moveTime = async (amount: number) => {
    console.log("Moving blocks...")
    await network.provider.send("evm_increaseTime", [amount])

    console.log(`Moved forward in time ${amount} seconds`)
}