import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config()

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.15",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: false
        }
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MAINNET_KEY}`,
      }
    }
  },
    mocha: {
    timeout: 100000
  }
};

export default config;
