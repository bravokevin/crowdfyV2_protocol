import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Crowdfy } from "../../typechain-types";
import { ethers, deployments } from "hardhat";


export const contributeWithSwap = async (contract: any, tokenIn: any, tokenOut: any, value: any, isEth: any, from: any): Promise<any> => {
    if(isEth){
      const deadline = (await time.latest()) + 15;
      return await contract.contribute(deadline, value, tokenIn, { from, value: value })
    }
    else {
      if(tokenIn === tokenOut){
        await deployments.fixture(["Crowdfy Token"])
        const tokenContract = await ethers.getContract("CrowdfyToken", from)
        await tokenContract.approve(contract.address, value)
        const deadline = (await time.latest()) + 15;
        return await contract.contribute(deadline, value, tokenIn, { from })
      }
      else {
        const amount = await contract.callStatic.quotePrice(false, value, tokenIn, tokenOut)
        const deadline = (await time.latest()) + 15;
        const maxAmount = Math.floor(1.1 * (Number(amount)))
        return await contract.contribute(deadline, value, tokenIn, { from, value: String(maxAmount) })
      }
    }
}
