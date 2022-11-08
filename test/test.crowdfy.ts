import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { IERC20 } from "../typechain-types";
import * as ERC20ABI from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json";
import { FIFTY_ETH, HUNDRED_ETH, ONE_YEAR_IN_SECS, STATE, WETH, QUOTER, SWAP_ROUTER, WHITELISTED_TOKENS } from "../helper-hardhat-config"
import { CampaignStruct } from "../types";
import { destructContribution, separateCampaignObject, createConributionObject } from './utils-test';
import { BigNumber } from "ethers";

describe("Crowdfy", function () {

    const deployFabricContract = async () => {
        await deployments.fixture(["all"])
        const [owewr, beneficiaryAccount, otherAccount, anotherAccount] = await ethers.getSigners();
        const owner = (await getNamedAccounts()).deployer
        const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;
        const tokenContract = await ethers.getContract("CrowdfyToken", owner);
        const fabricContract = await ethers.getContract("CrowdfyFabric", owner)
        const campaignInitialStateObject: CampaignStruct = {
            campaignName: "My new Campaign",
            fundingGoal: FIFTY_ETH,
            fundingCap: HUNDRED_ETH,
            deadline: ethers.BigNumber.from(await time.latest() + ONE_YEAR_IN_SECS),
            beneficiary: beneficiaryAccount.address,
            owner: owner,
            created: ethers.BigNumber.from(await time.latest() + 1),
            state: STATE.ongoing,
            selectedToken: WHITELISTED_TOKENS[1],
            amountRised: ethers.BigNumber.from(0)
        }
        await fabricContract.createCampaign(
            "My new Campaign",
            FIFTY_ETH,
            CREATION_TIME,
            HUNDRED_ETH,
            beneficiaryAccount.address,
            WHITELISTED_TOKENS[1]
        )
        await fabricContract.createCampaign(
            "My new Campaign",
            FIFTY_ETH,
            CREATION_TIME,
            HUNDRED_ETH,
            beneficiaryAccount.address,
            WHITELISTED_TOKENS[0]
        )

        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));
        const contractInEth = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(1));
        return { contract, WHITELISTED_TOKENS, owner, beneficiaryAccount, campaignInitialStateObject, otherAccount, anotherAccount, fabricContract, contractInEth, tokenContract, CREATION_TIME }
    }
    describe("Inicialization", function () {
        it("should Initialice campain correctly", async function () {
            const { campaignInitialStateObject, contract } = await loadFixture(deployFabricContract)
            const campaignStruct = await contract.theCampaign()
            expect(separateCampaignObject(campaignStruct)).to.deep.equal(campaignInitialStateObject)
            const isInitialized = await contract.isInitialized()
            expect(isInitialized).to.be.true

        })
        it("should not allowed initialize an already initialized campaign", async function () {
            const { contract, WHITELISTED_TOKENS, owner, beneficiaryAccount, CREATION_TIME } = await loadFixture(deployFabricContract)
            await expect(contract.initializeCampaign(
                "Campaign",
                FIFTY_ETH,
                CREATION_TIME,
                HUNDRED_ETH,
                beneficiaryAccount.address,
                owner,
                owner,
                WHITELISTED_TOKENS[0]

            )).to.be.reverted
        })
    })

    describe("Contributions", function () {
        describe("Contributions in other coins", function () {
            it("should contribute correctly", async function () {
                const { contract, WHITELISTED_TOKENS, owner } = await loadFixture(deployFabricContract)
                const amount = await contract.callStatic.quotePrice(false, FIFTY_ETH, WETH, WHITELISTED_TOKENS[1])
                const deadline = (await time.latest()) + 15;
                const times = await time.latest()
                const maxAmount = Math.floor(1.1 * (Number(amount)))
                await contract.contribute(deadline, FIFTY_ETH, { from: owner, value: String(maxAmount) })
                const contribution = await contract.contributionsByPeople(owner)
                const campaignStruct = await contract.theCampaign()
                expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner, FIFTY_ETH, 1))
                expect(campaignStruct.amountRised).to.equal(Number(FIFTY_ETH))
            })
            it("Should not allow to contribute 0", async function () {
                const { contract, owner, } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                await expect(contract.contribute(deadline, FIFTY_ETH, { from: owner, value: "0" })).to.be.reverted
            })
            it("should not contribute during success state", async function () {
                const { contract, WHITELISTED_TOKENS, owner } = await loadFixture(deployFabricContract)
                const amount = await contract.callStatic.quotePrice(false, HUNDRED_ETH, WETH, WHITELISTED_TOKENS[1])
                const deadline = (await time.latest()) + 15;
                const maxAmount = Math.floor(1.1 * (Number(amount)))
                await contract.contribute(deadline, HUNDRED_ETH, { from: owner, value: String(maxAmount) })
                await expect(contract.contribute(deadline, HUNDRED_ETH, { from: owner, value: String(maxAmount) })).to.be.reverted
            })
            it("should not contribute after deadline", async function () {
                const { contract, WHITELISTED_TOKENS, owner, CREATION_TIME } = await loadFixture(deployFabricContract)
                await time.increaseTo(CREATION_TIME + CREATION_TIME)
                const amount = await contract.callStatic.quotePrice(false, HUNDRED_ETH, WETH, WHITELISTED_TOKENS[1])
                const deadline = (await time.latest()) + 15;
                const maxAmount = Math.floor(1.1 * (Number(amount)))
                await expect(contract.contribute(deadline, HUNDRED_ETH, { from: owner, value: String(maxAmount) })).to.be.reverted
            })
            it("should emit contribution Event", async function () {
                const { contract, WHITELISTED_TOKENS, owner } = await loadFixture(deployFabricContract)
                const amount = await contract.callStatic.quotePrice(false, FIFTY_ETH, WETH, WHITELISTED_TOKENS[1])
                const deadline = (await time.latest()) + 15;
                const times = await time.latest()
                const maxAmount = Math.floor(1.1 * (Number(amount)))
                const expectedContribution = createConributionObject(owner, FIFTY_ETH, 1)
                await expect(contract.contribute(deadline, FIFTY_ETH, { from: owner, value: String(maxAmount) })).to.emit(contract, "ContributionMade")
            })

            //     it.skip("Should Have Multiple contribution", async function () {
            //         const { contractInEth, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, HUNDRED_ETH, destructContribution, createConributionObject } = await loadFixture(deployFabricContract)
            //         for (let i = 5; i > 1; i--) {
            //             const amount = await contract.callStatic.quotePrice(false, '2000000000', WETH, WHITELISTED_TOKENS[0])
            //             const deadline = (await time.latest()) + 15;
            //             const times = await time.latest()
            //             const maxAmount = Math.floor(1.1 * (Number(amount)))
            //             await contract.contribute(deadline, '2000000000', { from:owner, value: String(maxAmount) })
            //         }
            //         const test = async (i: number) => {
            //             const contribution = await contract.contributionsByPeople(owner)
            //             expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner.getAddress(), '2000000000', ['2000000000'], [times], 1))
            //         }
            //     })
        })

        describe("Contribution in ETH", async function () {
            it("should contribute correctly", async function () {
                const { WHITELISTED_TOKENS, owner, contractInEth } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                await contractInEth.contribute(deadline, FIFTY_ETH, { from: owner, value: FIFTY_ETH })
                const contribution = await contractInEth.contributionsByPeople(owner)
                expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner, FIFTY_ETH, 1))
            })
            it("Should not allow to contribute 0", async function () {
                const { contractInEth, owner, } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                await expect(contractInEth.contribute(deadline, FIFTY_ETH, { from: owner, value: "0" })).to.be.reverted
            })
            it("should not contribute during success state", async function () {
                const { contractInEth, WHITELISTED_TOKENS, owner, beneficiaryAccount } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                await contractInEth.connect(beneficiaryAccount).contribute(deadline, HUNDRED_ETH, { from: owner, value: HUNDRED_ETH })
                await expect(contractInEth.contribute(deadline, FIFTY_ETH, { from: owner, value: FIFTY_ETH })).to.be.reverted
            })
            it("should not contribute after deadline", async function () {
                const { contractInEth, WHITELISTED_TOKENS, owner, CREATION_TIME } = await loadFixture(deployFabricContract)
                await time.increaseTo(CREATION_TIME + CREATION_TIME)
                const deadline = (await time.latest()) + 15;
                await expect(contractInEth.contribute(deadline, FIFTY_ETH, { from: owner, value: FIFTY_ETH })).to.be.reverted
            })
            it("should emit contribution Event", async function () {
                const { contractInEth, WHITELISTED_TOKENS, owner } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                const times = await time.latest()
                const expectedContribution = createConributionObject(owner, FIFTY_ETH, 1)
                await expect(contractInEth.contribute(deadline, FIFTY_ETH, { from: owner, value: FIFTY_ETH })).to.emit(contractInEth, "ContributionMade")
            })
        })
    })


    describe("Whitdrawls", async function () {

        //tomar en cuenta el token del cual estamos haciendo withdraw
        it("Should allow the beneficiary withdraw during succes state", async function () {
            const { contract, WHITELISTED_TOKENS, owner, beneficiaryAccount } = await loadFixture(deployFabricContract)
            const DaiContract = await ethers.getContractAt(ERC20ABI.abi, WHITELISTED_TOKENS[1]) as unknown as IERC20
            const amount = await contract.callStatic.quotePrice(false, HUNDRED_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, HUNDRED_ETH, { from: owner, value: String(maxAmount) })
            const balanceBefore = await DaiContract.balanceOf(beneficiaryAccount.address)
            await contract.connect(beneficiaryAccount).withdraw({ from: beneficiaryAccount.address })
            const balanceAfter = await DaiContract.balanceOf(beneficiaryAccount.address)
            expect(balanceAfter).greaterThan(balanceBefore)
            // expect(balanceAfter).to.equal(String(maxAmount))
        })
        it(`should not allow the beneficiary whtidraw during ongoing state`, async function () {
            const { contract, WHITELISTED_TOKENS, owner, beneficiaryAccount } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, FIFTY_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, FIFTY_ETH, { from: owner, value: String(maxAmount) })
            await contract.connect(beneficiaryAccount)
            await expect(contract.withdraw()).to.be.reverted
        })
        it(`should not allow the beneficiary whtidraw during failed state`, async function () {
            const { contract, WHITELISTED_TOKENS, beneficiaryAccount, } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, FIFTY_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.closeCampaign()
            await expect(contract.connect(beneficiaryAccount).withdraw()).to.be.reverted
        })
        it(`should allow the beneficiary whtidraw during ealry success state`, async function () {
            const { contract, WHITELISTED_TOKENS, owner, beneficiaryAccount, } = await loadFixture(deployFabricContract)
            const DaiContract = await ethers.getContractAt(ERC20ABI.abi, WHITELISTED_TOKENS[1]) as unknown as IERC20
            const amount = await contract.callStatic.quotePrice(false, FIFTY_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, FIFTY_ETH, { from: owner, value: String(maxAmount) })
            const balanceBefore = await DaiContract.balanceOf(beneficiaryAccount.address)
            await contract.connect(beneficiaryAccount).withdraw()
            const balanceAfter = await DaiContract.balanceOf(beneficiaryAccount.address)
            expect(balanceAfter).greaterThan(balanceBefore)
            // expect(balanceAfter).to.equal(String(Number(maxAmount)))
        })
        it("should not allow others than the beneficiary to witdraw", async function () {
            const { contract, WHITELISTED_TOKENS, owner, beneficiaryAccount, otherAccount, anotherAccount } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, FIFTY_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, FIFTY_ETH, { from: owner, value: String(maxAmount) })
            await expect(contract.withdraw()).to.be.revertedWith('Only the beneficiary can call this function')
            await expect(contract.connect(otherAccount).withdraw()).to.be.revertedWith('Only the beneficiary can call this function')
            await expect(contract.connect(anotherAccount).withdraw()).to.be.revertedWith('Only the beneficiary can call this function')
        })
        it("Should Allow beneficiary withdraw in eth", async function () {
            const { WHITELISTED_TOKENS, owner, contractInEth, beneficiaryAccount } = await loadFixture(deployFabricContract)
            const deadline = (await time.latest()) + 15;
            await contractInEth.contribute(deadline, FIFTY_ETH, { from: owner, value: FIFTY_ETH })
            const balanceBefore = await beneficiaryAccount.getBalance()
            await contractInEth.connect(beneficiaryAccount).withdraw()
            const balanceAfter = await beneficiaryAccount.getBalance()
            expect(balanceAfter).greaterThan(balanceBefore)
            // expect(balanceAfter).to.equal(balanceBefore.add(FIFTY_ETH))
        })
    })
    describe("Refound", function () {
        it("Should allow contributors get a refound in case of failure in campaign in ETH", async function () {
            const { owner, contractInEth, otherAccount } = await loadFixture(deployFabricContract)
            const contributedValue = String(Number(FIFTY_ETH) / 2)
            const deadline = (await time.latest()) + 15;
            await contractInEth.connect(otherAccount).contribute(deadline, contributedValue, { from: otherAccount.address, value: contributedValue })
            await contractInEth.closeCampaign()

            const balanceBefore = await otherAccount.getBalance()
            await contractInEth.connect(otherAccount).claimFounds(true, "0", '0')
            const balanceAfter = await otherAccount.getBalance()
            expect(balanceAfter).greaterThan(balanceBefore)
        })
        it("Should allow contributors get a refound in eth in case of failure", async function () {
            const { contract, WHITELISTED_TOKENS, owner, otherAccount } = await loadFixture(deployFabricContract)
            const DaiContract = await ethers.getContractAt(ERC20ABI.abi, WHITELISTED_TOKENS[1]) as unknown as IERC20
            const contributedValue = ethers.utils.parseEther('900')
            const amount = await contract.callStatic.quotePrice(false, contributedValue, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 30;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            const tx = await contract.connect(otherAccount).contribute(deadline, contributedValue, { from: otherAccount.address, value: String(maxAmount) })
            //we have to wait 1 block until the transaction gets inclued ang we can get the object receipt
            const receipt = tx.wait()
            const balancedAfterFisrtTransaction = await otherAccount.getBalance()
            await contract.closeCampaign()
            const balanceBefore = await otherAccount.getBalance()
            const amounToRefound = await contract.callStatic.quotePrice(true, amount,
                WHITELISTED_TOKENS[1], WETH)
            const deadline2 = (await time.latest()) + 30;
            await contract.connect(otherAccount).claimFounds(true, amounToRefound, deadline2)
            const balanceAfter = await otherAccount.getBalance()
            expect(balanceAfter).greaterThan(balanceBefore)
        })

        it("Should allow refound in the same token", async function () {
            const { contract, WHITELISTED_TOKENS, owner, otherAccount } = await loadFixture(deployFabricContract)
            const DaiContract = await ethers.getContractAt(ERC20ABI.abi, WHITELISTED_TOKENS[1]) as unknown as IERC20
            const contributedValue = String(Number(FIFTY_ETH) / 2)
            const amount = await contract.callStatic.quotePrice(false, contributedValue, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.connect(otherAccount).contribute(deadline, contributedValue, { from: otherAccount.address, value: String(maxAmount) })
            await contract.closeCampaign()
            const balanceBefore = await DaiContract.balanceOf(otherAccount.address)
            await contract.connect(otherAccount).claimFounds(false, '0', '0');
            const balanceAfter = await DaiContract.callStatic.balanceOf(otherAccount.address)
            expect(balanceAfter).greaterThan(balanceBefore);
            expect(balanceAfter).to.equal(contributedValue);
        })
    })
    describe("CrowdfyTokens", function () {
        it('should issue tokens correclty when creating campaign', async function () {
            const { owner, tokenContract, contract } = await loadFixture(deployFabricContract)
            const balance = await tokenContract.balanceOf(owner)
            const tokenContractMaxSupply: BigNumber = await tokenContract.maxSupply()
            // its 120 because in the fixture the {owner} acccount is creating a campaign twice
            expect(balance).to.be.equal(tokenContractMaxSupply.div(100).add(ethers.utils.parseEther('20')))
        })
        it('should issue tokens correclty when contributing a campaign', async function () {
            const { contract, WHITELISTED_TOKENS, tokenContract, otherAccount } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, FIFTY_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.connect(otherAccount).contribute(deadline, FIFTY_ETH, { from: otherAccount.getAddress(), value: String(maxAmount) })
            const balance = await tokenContract.balanceOf(otherAccount.address)
            expect(String(balance)).to.be.equal(ethers.utils.parseEther('5'))
        })
        it("Should minted corerct amount of token to the deployer", async function () {
            const { tokenContract, owner } = await loadFixture(deployFabricContract)
            const balance = await tokenContract.balanceOf(owner)
            const tokenContractMaxSupply: BigNumber = await tokenContract.maxSupply()
            expect(balance).to.be.equal(tokenContractMaxSupply.div(100).add(ethers.utils.parseEther('20')))
        })
        it("Should not be allowed to mint new tokens", async function () {
            const { tokenContract, owner } = await loadFixture(deployFabricContract)
            await expect(tokenContract.mint(owner, "10")).to.be.reverted
        })
    })
})