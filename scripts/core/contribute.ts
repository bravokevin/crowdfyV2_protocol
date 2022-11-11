import { FIFTY_ETH, HUNDRED_ETH, ONE_YEAR_IN_SECS, STATE, WETH, QUOTER, SWAP_ROUTER, WHITELISTED_TOKENS } from "../../helper-hardhat-config"
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Crowdfy } from "../../typechain-types";


export const contributeWithSwap = async (contract: Crowdfy, tokenIn: String, tokenOut: String, value: any, isSameToken: any) => {
    const amount = await contract.callStatic.quotePrice(false, value, tokenIn, tokenOut)
    const deadline = (await time.latest()) + 15;
    // const times = await time.latest()
    const maxAmount = Math.floor(1.1 * (Number(amount)))
    if(isSameToken){
      await contract.contribute(deadline, value, tokenIn, { from: owner})
    }
    else {
      await contract.contribute(deadline, value, tokenIn, { from: owner, value: String(maxAmount) })
    }
}

export const contribute = async (contract: Crowdfy, tokenIn: String, tokenOut: String, value: any) =>{
  const deadline = (await time.latest()) + 15;
  await contract.contribute(deadline, value, tokenIn, { from: owner, value: value })
}
