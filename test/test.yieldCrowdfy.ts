import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";


describe("Crowfy Yielding", function () {

    const deployFabricContract = async () => {
        const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

        // eth, dai, usdt, usdc
        const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
        const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
        const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
        const WHITELISTED_TOKENS = [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
            "0x509ee0d083ddf8ac028f2a56731412edd63223b9",
            "0x4FEB71333c2A9fE81625a5727ab0Ed33dC77B841"
        ];
        const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;
        const ONE_ETH = "1000000000000000000";
        const TWO_ETH = "2000000000000000000";

        const [owner, beneficiaryAccount, otherAccount, anotherAccount] = await ethers.getSigners();


        const Fabric = await ethers.getContractFactory("CrowdfyFabric");
        const token = await ethers.getContractFactory("CrowdfyToken");
        const tokenContract = await token.deploy();

        const fabricContract = await Fabric.deploy(WHITELISTED_TOKENS, tokenContract.address);


        await fabricContract.createCampaign(
            "My new Campaign",
            ONE_ETH,
            CREATION_TIME,
            TWO_ETH,
            beneficiaryAccount.address,
            WHITELISTED_TOKENS[0]
        )

        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));
        return { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, Fabric, SWAP_ROUTER, QUOTER, WETH, ONE_ETH, TWO_ETH, contract, beneficiaryAccount }
    }

    describe("Yielding", function () {
        it("Should Allow to yield during early state", async function () {
            const { contract, ONE_ETH, owner} = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: ONE_ETH })
            await contract.yield(4)
        })
        it("Should yield the correct amount", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: ONE_ETH })
            await contract.yield(50)
            const yieldedAmount = await contract.supplied();
            const amountToWithdraw = await contract.amountToWithdraw()
            expect(String(yieldedAmount)).to.equal(String(Number(ONE_ETH) / 2));
            expect(String(amountToWithdraw)).to.equal(String(Number(ONE_ETH) / 2));
        })
        it("should not allow to withdraw during yielding", async function () {
            const { contract, ONE_ETH, owner,beneficiaryAccount } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: ONE_ETH })
            await contract.yield(50)
            await expect(contract.connect(beneficiaryAccount).withdraw()).to.be.revertedWith("You cannot withdraw your funds if you are yielding")
        })
        it("Should not allow others than the beneficiary or the owner to yield", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH, otherAccount } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: ONE_ETH })
            await contract.yield(50)
            await expect(contract.connect(otherAccount).withdraw()).to.be.reverted
        })
    })
    describe("withdraw yield", function () {
        it("Should not allow to withdraw if not are yielding", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH, otherAccount } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: ONE_ETH })
            await expect(contract.withdrawYield()).to.be.revertedWith("YieldFarming: you cannot withdraw if you are not yielding")
        })
        it("Should allow to withdrawl the yieldings", async function () {
            const { contract, WHITELISTED_TOKENS, ONE_ETH, owner, WETH, otherAccount } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: ONE_ETH })
            const amountBefore = await contract.amountToWithdraw()
            await contract.yield(50)
            await contract.withdrawYield();
            const amountAfter = await contract.amountToWithdraw()
            expect(amountAfter).to.be.greaterThanOrEqual(amountBefore)

        })
    })
})