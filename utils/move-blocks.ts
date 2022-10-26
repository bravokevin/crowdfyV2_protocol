import { network } from "hardhat";

export const mine = async (amount: number) => {
    console.log("Mining Blocks...");
    for (let i = 0; i < amount; i++) {
        await network.provider.request({
            method: "evm_mine",
            params: []
        })
    }
}