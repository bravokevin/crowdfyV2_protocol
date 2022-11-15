import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, getNamedAccounts, deployments } from "hardhat";
import { FIFTY_ETH, HUNDRED_ETH, ONE_YEAR_IN_SECS, STATE, WETH, QUOTER, SWAP_ROUTER, WHITELISTED_TOKENS } from "../helper-hardhat-config"
import { contributeWithSwap} from "../scripts/core/contribute";

describe("Crowfy Yielding", function () {

    const deployFabricContract = async () => {

        const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;
        const [owner11, beneficiaryAccount, otherAccount, anotherAccount] = await ethers.getSigners();
        const owner = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        const tokenContract = await ethers.getContract("CrowdfyToken", owner);
        const fabricContract = await ethers.getContract("CrowdfyFabric", owner)
        await fabricContract.createCampaign(
            "My new Campaign",
            FIFTY_ETH,
            CREATION_TIME,
            HUNDRED_ETH,
            beneficiaryAccount.address,
            WHITELISTED_TOKENS[0]
        )
        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));
        return { fabricContract, CREATION_TIME,  owner, otherAccount, contract, beneficiaryAccount }
    }

    describe("Yielding", function () {
        it("Should Allow to yield during early state", async function () {
            const { contract, owner } = await loadFixture(deployFabricContract)
            await contributeWithSwap(contract, WHITELISTED_TOKENS[0], WHITELISTED_TOKENS[0], FIFTY_ETH, true, owner);
            await contract.yield(4)
        })
        it("Should yield the correct amount", async function () {
            const { contract,owner } = await loadFixture(deployFabricContract)
            await contributeWithSwap(contract, WHITELISTED_TOKENS[0], WHITELISTED_TOKENS[0], FIFTY_ETH, true, owner);
            await contract.yield(50)
            const yieldedAmount = await contract.supplied();
            const amountToWithdraw = await contract.amountToWithdraw()
            expect(String(yieldedAmount)).to.equal(String(Number(FIFTY_ETH) / 2));
            expect(String(amountToWithdraw)).to.equal(String(Number(FIFTY_ETH) / 2));
        })
        it("should not allow to withdraw during yielding", async function () {
            const { contract,owner, beneficiaryAccount } = await loadFixture(deployFabricContract)
            await contributeWithSwap(contract, WHITELISTED_TOKENS[0], WHITELISTED_TOKENS[0], FIFTY_ETH, true, owner);
            await contract.yield(50)
            await expect(contract.connect(beneficiaryAccount).withdraw()).to.be.reverted
        })
        it("Should not allow others than the beneficiary or the owner to yield", async function () {
            const { contract, owner, otherAccount } = await loadFixture(deployFabricContract)
            await contributeWithSwap(contract, WHITELISTED_TOKENS[0], WHITELISTED_TOKENS[0], FIFTY_ETH, true, owner);
            await contract.yield(50)
            await expect(contract.connect(otherAccount).withdraw()).to.be.reverted
        })
    })
    describe("withdraw yield", function () {
        it("Should not allow to withdraw if not are yielding", async function () {
            const { contract, owner, otherAccount } = await loadFixture(deployFabricContract)
            await contributeWithSwap(contract, WHITELISTED_TOKENS[0], WHITELISTED_TOKENS[0], FIFTY_ETH, true, owner);
            await expect(contract.withdrawYield()).to.be.revertedWithCustomError(contract, "isNotYielding")
        })
        it("Should allow to withdrawl the yieldings", async function () {
            const { contract,owner,otherAccount } = await loadFixture(deployFabricContract)
            await contributeWithSwap(contract, WHITELISTED_TOKENS[0], WHITELISTED_TOKENS[0], FIFTY_ETH, true, owner);
            const amountBefore = await contract.amountToWithdraw()
            await contract.yield(50)
            await contract.withdrawYield();
            const amountAfter = await contract.amountToWithdraw()
            expect(amountAfter).to.be.greaterThanOrEqual(amountBefore)

        })
    })
})
