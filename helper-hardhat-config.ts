import { ethers } from "hardhat";


export interface networkConfigItem {
    ethUsdPriceFeed?: string
    blockConfirmations?: number,
    name: string
    whitlistedTokens: string[],
    chainId: number
}

export interface networkConfigInfo {
    [key: string]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    hardhat: {
        name: "hardhat",
        whitlistedTokens: [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
            "0x509ee0d083ddf8ac028f2a56731412edd63223b9",
            "0x4FEB71333c2A9fE81625a5727ab0Ed33dC77B841"
        ],
        blockConfirmations: 0,
        chainId: 31337
    },
    goerli: {
        name: "goerli",
        whitlistedTokens: [],
        blockConfirmations: 6,
        chainId: 5
    },
}

export const developmentChains = ["hardhat"]
export const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
export const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
export const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
export const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
export const FIFTY_ETH = ethers.utils.parseEther('50')
export const HUNDRED_ETH = ethers.utils.parseEther('100')
// eth, dai, usdt, usdc
export const WHITELISTED_TOKENS = [
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
    "0x509ee0d083ddf8ac028f2a56731412edd63223b9",
    "0x4FEB71333c2A9fE81625a5727ab0Ed33dC77B841"
];
export const STATE = {
    ongoing: 0,
    failed: 1,
    succed: 2,
    paidOut: 3,
    earlySuccess: 4
};


export const proposalsFile = "proposals.json"

// Governor Values
export const QUORUM_PERCENTAGE = 1 // Need 4% of voters to pass
export const MIN_DELAY = 7 * 24 * 60 * 60 // 1 week - after a vote passes, you have 1 hour before you can enact
// export const VOTING_PERIOD = 45818 // 1 week - how long the vote lasts. This is pretty long even for local tests
export const VOTING_PERIOD = 5 // blocks
export const VOTING_DELAY = 1 // 1 Block - How many blocks till a proposal vote becomes active
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"

export const NEW_STORE_VALUE = 77
export const FUNC = "store"
export const PROPOSAL_DESCRIPTION = "Proposal #1 77 in the Box!"
