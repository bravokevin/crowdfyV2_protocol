import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { FIFTY_ETH, HUNDRED_ETH, WETH, QUOTER, SWAP_ROUTER, WHITELISTED_TOKENS, VOTING_DELAY, VOTING_PERIOD, MIN_DELAY } from "../helper-hardhat-config"
import { mine } from "../utils/move-blocks";
import { moveTime } from "../utils/move-time";

describe("Crowfy Governance", function () {

    const deployFabricContract = async () => {
        const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

        const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;

        const [beneficiaryAccount, otherAccount] = await ethers.getSigners();
        await deployments.fixture(["all"])
        const owner = (await getNamedAccounts()).deployer
        const fabricContract = await ethers.getContract("CrowdfyFabric", owner)
        const governorContract = await ethers.getContract("CrowdfyGovernance", owner)
        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));
        return { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, SWAP_ROUTER, QUOTER, WETH, FIFTY_ETH, HUNDRED_ETH, contract, beneficiaryAccount, governorContract }
    }

    describe("Governance Proporsals", function () {
        it("can only be changed through governance", async function () {
            const { fabricContract, } = await loadFixture(deployFabricContract)

            await expect(fabricContract.setWhitelistedTokens(["0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05"])).to.be.revertedWith("Error: only the owner can call this function")
            await expect(fabricContract.changeCrowdfyCampaignImplementation("0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05")).to.be.revertedWith("Error: only the owner can call this function")
            await expect(fabricContract.changeProtocolOwner("0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05")).to.be.revertedWith("Error: only the owner can call this function")
            await expect(fabricContract.reWhitelistToken(["0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05"])).to.be.revertedWith("Error: only the owner can call this function")
            await expect(fabricContract.quitWhitelistedToken(["0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05"])).to.be.revertedWith("Error: only the owner can call this function")
        })
        it("should allow the governace to list new tokens", async function () {
            const { fabricContract, FIFTY_ETH, owner, governorContract, contract } = await loadFixture(deployFabricContract)
            const encodedFunctionCall = fabricContract.interface.encodeFunctionData("setWhitelistedTokens", [["0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05"]])
            const proposeTx = await governorContract.propose(
                [fabricContract.address],
                [0],
                [encodedFunctionCall],
                "Whitelist a new token"
            )

            const proposeReceipt = await proposeTx.wait(1)
            const proposalId = proposeReceipt.events![0].args!.proposalId
            let proposalState = await governorContract.state(proposalId)
            console.log(`Current Proposal State: ${proposalState}`)

            await mine(VOTING_DELAY + 1)
            // vote
            const voteTx = await governorContract.castVoteWithReason(proposalId, 1, "I like that")
            await voteTx.wait(1)
            proposalState = await governorContract.state(proposalId)
            assert.equal(proposalState.toString(), "1")
            console.log(`Current Proposal State: ${proposalState}`)
            await mine(VOTING_PERIOD + 1)

            // queue & execute
            // const descriptionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(PROPOSAL_DESCRIPTION))
            const descriptionHash = ethers.utils.id("Whitelist a new token")
            const queueTx = await governorContract.queue([fabricContract.address], [0], [encodedFunctionCall], descriptionHash)
            await queueTx.wait(1)
            await moveTime(MIN_DELAY + 1)
            await mine(1)

            proposalState = await governorContract.state(proposalId)
            console.log(`Current Proposal State: ${proposalState}`)

            console.log("Executing...")
            const exTx = await governorContract.execute([fabricContract.address], [0], [encodedFunctionCall], descriptionHash)
            await exTx.wait(1)
            assert.equal(await fabricContract.getTotalTokens(), "6")
            expect(await fabricContract.isWhitelisted("0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05")).to.be.true
        })
    })
})
// should excecute,
