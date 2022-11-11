import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { FIFTY_ETH, HUNDRED_ETH, ONE_YEAR_IN_SECS, STATE, WETH, QUOTER, SWAP_ROUTER, WHITELISTED_TOKENS } from "../helper-hardhat-config"

describe("Crowdfy Fabric", function () {

  const deployFabricContract = async () => {
    const [ownessr, otherAccount] = await ethers.getSigners();
    await deployments.fixture(["all"])
    const owner = (await getNamedAccounts()).deployer
    const tokenContract = await ethers.getContract("CrowdfyToken", owner);
    const fabricContract = await ethers.getContract("CrowdfyFabric", owner);
    const timelockContract = await ethers.getContract("TimeLock", owner)
    const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;
    const test = async (i: number) => {
      expect(await fabricContract.whitelistedTokensArr(i)).to.equal(ethers.utils.getAddress(WHITELISTED_TOKENS[i]))
      expect(await fabricContract.isWhitelisted(WHITELISTED_TOKENS[i])).to.be.true
    }

    return { fabricContract, CREATION_TIME,  owner, otherAccount, timelockContract, test, tokenContract }
  }

  describe("Deployment", function () {
    it("Should be deployed correctly", async function () {
      //We add to whitelistesd tokens becose at the moment of deploy the fabric we add the address of the crowdfy token 
      const { owner, tokenContract, fabricContract, timelockContract } = await loadFixture(deployFabricContract)
      expect(await fabricContract.getTotalTokens()).to.equal(WHITELISTED_TOKENS.length + 1);
      expect(await fabricContract.protocolOwner()).to.equal(timelockContract.address);
      expect(await fabricContract.crowdfyTokenAddress()).to.equal(tokenContract.address);
      // expect(await Fabric.deploy(WHITELISTED_TOKENS, tokenContract.address))
      //   .to.emit(fabricContract, "WhitlistedTokensUpdated")
      //   .withArgs(WHITELISTED_TOKENS)
    })

    it("Should list all tokens correctly", async function () {
      const { test } = await loadFixture(deployFabricContract)
      for (let i = 0; i < WHITELISTED_TOKENS.length; i++) {
        test(i)
      }
    })
  })
  describe("Initializing campaign", async function () {
    it("should create a campaign succesfully", async function () {
      const { fabricContract, CREATION_TIME, owner, otherAccount, test, } = await loadFixture(deployFabricContract)
      expect(await fabricContract.createCampaign(
        "My new Campiang",
        FIFTY_ETH,
        CREATION_TIME,
        HUNDRED_ETH,
        otherAccount.address,
        WHITELISTED_TOKENS[1]
      )).to.emit(fabricContract, "CampaignCreated")

      await fabricContract.createCampaign(
        "My new Campiang",
        FIFTY_ETH,
        CREATION_TIME,
        HUNDRED_ETH,
        otherAccount.address,
        WHITELISTED_TOKENS[1]
      )

      const campaignAddress = (await fabricContract.campaigns(0)).campaignAddress

      expect((await fabricContract.campaigns(0)).campaignAddress).to.equal(await fabricContract.campaignsById(0))

    })
    it("should not Allowed to create a campaign whit a not whitelisted token", async function () {
      const { fabricContract, CREATION_TIME, owner, otherAccount, test, } = await loadFixture(deployFabricContract)

      await expect(fabricContract.createCampaign(
        "My new Campiang",
        FIFTY_ETH,
        CREATION_TIME,
        HUNDRED_ETH,
        otherAccount.address,
        WETH
      )).to.be.revertedWith("Error: Token `_selectedToken` is not on the list")
    })
    it("should not Allowed to create a campaign whit due date minor than the current date", async function () {
      const { fabricContract, CREATION_TIME, owner, otherAccount, test, } = await loadFixture(deployFabricContract)

      await expect(fabricContract.createCampaign(
        "My new Campiang",
        FIFTY_ETH,
        time.latest(),
        HUNDRED_ETH,
        otherAccount.address,
        WHITELISTED_TOKENS[1]
      )).to.be.revertedWith("Your duedate have to be major than the current time")
    })
  })

})
