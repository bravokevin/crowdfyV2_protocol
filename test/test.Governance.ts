import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ONE_ETH, TWO_ETH, ONE_YEAR_IN_SECS, STATE, WETH, QUOTER, SWAP_ROUTER, WHITELISTED_TOKENS } from "../helper-hardhat-config"

describe.skip("Crowfy Governance", function () {

    const deployFabricContract = async () => {
        const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

        const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;

        const [owner, beneficiaryAccount, otherAccount, anotherAccount] = await ethers.getSigners();

        const tokenContract = await ethers.getContract("CrowdfyToken");
        const fabricContract = await ethers.getContract("CrowdfyFabric")
        const governorContract = await ethers.getContract("CrowdfyFabric")

        await fabricContract.createCampaign(
            "My new Campaign",
            ONE_ETH,
            CREATION_TIME,
            TWO_ETH,
            beneficiaryAccount.address,
            WHITELISTED_TOKENS[0]
        )

        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));
        return { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, SWAP_ROUTER, QUOTER, WETH, ONE_ETH, TWO_ETH, contract, beneficiaryAccount, governorContract }
    }

    describe("Governance Basics", function () {
        it("Should give the ownership to the governance contract", async function () {
            const { fabricContract, ONE_ETH, owner, governorContract, contract } = await loadFixture(deployFabricContract)
            await fabricContract.changeProtocolOwner(governorContract.address)
            const fabricOwner = await fabricContract.protocolOwner()
            const contractOwner = await contract.protocolOwner()
            expect(fabricOwner).to.be.equal(governorContract.address)
            expect(contractOwner).to.be.equal(governorContract.address)

        })
    })
    describe("Governance Proporsals", function () {
        it("Should Allow to make a Proporsal", async function () {
            const { fabricContract, ONE_ETH, owner, governorContract, contract } = await loadFixture(deployFabricContract)
            await fabricContract.changeProtocolOwner(governorContract.address)
            await governorContract.propose(
                // [tokenAddress],
                // [0],
                // [transferCalldata],
                "Proposal #1: Give grant to team",
            );
        })
    })
})

// should excecute, 