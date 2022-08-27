import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";


describe("Crowdfy Fabric", function () {

  const deployFabricContract = async () => {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

    // eth, dai, usdt, usdc
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
    const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    const WHITELISTED_TOKENS: string[] = [
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      "0x6b175474e89094c44da98b954eedeac495271d0f",
      "0xdac17f958d2ee523a2206206994597c13d831ec7",
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
  ];
    const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;
    const ONE_ETH = "1000000000000000000";
    const TWO_ETH = "2000000000000000000";

    const [owner, otherAccount] = await ethers.getSigners();

    const Fabric = await ethers.getContractFactory("CrowdfyFabric");
    const fabricContract = await Fabric.deploy(WHITELISTED_TOKENS);

    const test = async (i: number) => {
      expect(await fabricContract.whitelistedTokensArr(i)).to.equal(ethers.utils.getAddress(WHITELISTED_TOKENS[i]))
      expect(await fabricContract.isWhitelisted(WHITELISTED_TOKENS[i])).to.be.true
    }

    return { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, Fabric, SWAP_ROUTER, QUOTER, WETH, test, ONE_ETH, TWO_ETH }
  }

  describe("Deployment", function () {
    it("Should be deployed correctly", async function () {
      const { WHITELISTED_TOKENS, owner, otherAccount, SWAP_ROUTER, QUOTER, WETH } = await loadFixture(deployFabricContract)
      const Fabric = await ethers.getContractFactory("CrowdfyFabric");
      const fabricContract = await Fabric.deploy(WHITELISTED_TOKENS);
      expect(await fabricContract.getTotalTokens()).to.equal(WHITELISTED_TOKENS.length);
      expect(await fabricContract.protocolOwner()).to.equal(owner.address);
      expect(await Fabric.deploy(WHITELISTED_TOKENS))
        .to.emit(fabricContract, "WhitlistedTokensUpdated")
        .withArgs(WHITELISTED_TOKENS)
    })

    it("Should list all tokens correctly", async function () {
      const { WHITELISTED_TOKENS, test } = await loadFixture(deployFabricContract)
      for (let i = 0; i < WHITELISTED_TOKENS.length; i++) {
        test(i)
      }
    })
  })
  describe("Initializing campaign", async function () {
    it("should create a campaign succesfully", async function () {
      const { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, Fabric, SWAP_ROUTER, QUOTER, WETH, test, ONE_ETH, TWO_ETH } = await loadFixture(deployFabricContract)
      expect(await fabricContract.createCampaign(
        "My new Campiang",
        ONE_ETH,
        CREATION_TIME,
        TWO_ETH,
        otherAccount.address,
        WHITELISTED_TOKENS[1]
      )).to.emit(fabricContract, "CampaignCreated")

      await fabricContract.createCampaign(
        "My new Campiang",
        ONE_ETH,
        CREATION_TIME,
        TWO_ETH,
        otherAccount.address,
        WHITELISTED_TOKENS[1]
      )

      const campaignAddress = (await fabricContract.campaigns(0)).campaignAddress

      expect((await fabricContract.campaigns(0)).campaignAddress).to.equal(await fabricContract.campaignsById(0))

    })
    it("should not Allowed to create a campaign whit a not whitelisted token", async function () {
      const { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, Fabric, SWAP_ROUTER, QUOTER, WETH, test, ONE_ETH, TWO_ETH } = await loadFixture(deployFabricContract)

      await expect(fabricContract.createCampaign(
        "My new Campiang",
        ONE_ETH,
        CREATION_TIME,
        TWO_ETH,
        otherAccount.address,
        WETH
      )).to.be.revertedWith("Error: Token `_selectedToken` is not on the list")
    })
    it("should not Allowed to create a campaign whit due date minor than the current date", async function () {
      const { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, Fabric, SWAP_ROUTER, QUOTER, WETH, test, ONE_ETH, TWO_ETH } = await loadFixture(deployFabricContract)

      await expect(fabricContract.createCampaign(
        "My new Campiang",
        ONE_ETH,
        time.latest(),
        TWO_ETH,
        otherAccount.address,
        WHITELISTED_TOKENS[1]
      )).to.be.revertedWith("Your duedate have to be major than the current time")
    })
  })

})