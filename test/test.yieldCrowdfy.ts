import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";


describe.only("Crowfy Yielding", function () {

    const deployFabricContract = async () => {
        const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

        // eth, dai, usdt, usdc
        const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
        const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
        const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
        const WHITELISTED_TOKENS = [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0x73967c6a0904aa032c103b4104747e88c566b1a2",
            "0x509ee0d083ddf8ac028f2a56731412edd63223b9",
            "0x07865c6e87b9f70255377e024ace6630c1eaa37f"
        ];
        const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;
        const ONE_ETH = "1000000000000000000";
        const TWO_ETH = "2000000000000000000";

        const [owner, beneficiaryAccount, otherAccount, anotherAccount] = await ethers.getSigners();


        const Fabric = await ethers.getContractFactory("CrowdfyFabric");
        const fabricContract = await Fabric.deploy(WHITELISTED_TOKENS);

        const test = async (i: number) => {
            expect(await fabricContract.whitelistedTokensArr(i)).to.equal(ethers.utils.getAddress(WHITELISTED_TOKENS[i]))
            expect(await fabricContract.isWhitelisted(WHITELISTED_TOKENS[i])).to.be.true
        }

        await fabricContract.createCampaign(
            "My new Campaign",
            ONE_ETH,
            CREATION_TIME,
            TWO_ETH,
            beneficiaryAccount.address,
            WHITELISTED_TOKENS[1]
        )

        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));


        return { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, Fabric, SWAP_ROUTER, QUOTER, WETH, test, ONE_ETH, TWO_ETH, contract, beneficiaryAccount }
    }

    describe("Yielding", function () {
        it("Should Allow to yield during early state", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })

            await contract.yield(4)
        })
        it("Should yield the correct amount", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })

            await contract.yield(50)

            const yieldedAmount = await contract.getBalanceWithoutInterest(contract.address);
            const amountToWithdraw = await contract.amountToWithdraw()

            expect(yieldedAmount).to.equal((Number(ONE_ETH) / 2));
            expect(amountToWithdraw.toNumber()).to.equal((Number(ONE_ETH) / 2));


        })
        it("should not allow to withdraw during yielding", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH, beneficiaryAccount } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            await contract.yield(50)
            await expect(contract.connect(beneficiaryAccount).withdraw()).to.be.revertedWith("You cannot withdraw your funds if you are yielding")
        })
        it("Should not allow others than the beneficiary or the owner to yield", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH, otherAccount } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            await contract.yield(50)
            await expect(contract.connect(otherAccount).withdraw()).to.be.reverted
        })
    })
    describe("withdraw yield", function () {
        it("Should not allow to withdraw if not are yielding", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH, otherAccount } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            await expect(contract.withdrawYield()).to.be.revertedWith("YieldFarming: you cannot withdraw if you are not yielding")
        })
        it("Should allow to withdrawl the yieldings", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH, otherAccount } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            const amountBefore = await contract.amountToWithdraw()
            await contract.yield(50)
            await contract.withdrawYield();
            const amountAfter = await contract.amountToWithdraw()
            expect(amountAfter).to.be.greaterThanOrEqual(amountBefore)

        })
    })
})