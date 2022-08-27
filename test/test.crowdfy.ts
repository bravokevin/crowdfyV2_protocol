import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";


describe("Crowdfy Campaign", function () {

    const deployFabricContract = async () => {
        const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

        const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
        const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
        // eth, dai, usdt, usdc


        const WHITELISTED_TOKENS: string[] = [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            "0xdac17f958d2ee523a2206206994597c13d831ec7",
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        ];
        const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;
        const ONE_ETH = "1000000000000000000";
        const TWO_ETH = "2000000000000000000";

        const STATE = {
            ongoing: 0,
            failed: 1,
            succed: 2,
            paidOut: 3,
            earlySuccess: 4
        };

        const [owner, beneficiaryAccount, otherAccount, anotherAccount] = await ethers.getSigners();

        const Fabric = await ethers.getContractFactory("CrowdfyFabric");
        const fabricContract = await Fabric.deploy(WHITELISTED_TOKENS);

        await fabricContract.createCampaign(
            "My new Campaign",
            ONE_ETH,
            CREATION_TIME,
            TWO_ETH,
            beneficiaryAccount.address,
            WHITELISTED_TOKENS[1]
        )
        await fabricContract.createCampaign(
            "My new Campaign",
            ONE_ETH,
            CREATION_TIME,
            TWO_ETH,
            beneficiaryAccount.address,
            WHITELISTED_TOKENS[0]
        )
        // type CampaignInitialStateObject = {
        //     campaignName: string;
        //     fundingGoal: BigNumber,
        //     fundingCap: BigNumber;
        //     deadline: BigNumber;
        //     beneficiary: string;
        //     owner: string;
        //     created: BigNumber;
        //     state: number;
        //     selectedToken: string;
        //     amountRised: BigNumber;
        // }

        const campaignInitialStateObject = {
            campaignName: "My new Campaign",
            fundingGoal: ethers.BigNumber.from(ONE_ETH),
            fundingCap: ethers.BigNumber.from(TWO_ETH),
            deadline: ethers.BigNumber.from(CREATION_TIME),
            beneficiary: beneficiaryAccount.address,
            owner: owner.address,
            created: ethers.BigNumber.from(await time.latest()),
            state: STATE.ongoing,
            selectedToken: WHITELISTED_TOKENS[1],
            amountRised: ethers.BigNumber.from(0)
        }

        const separateCampaignObject = (struct: any) => {
            const { campaignName, fundingGoal, fundingCap, deadline, beneficiary, owner, created, state, selectedToken, amountRised } = struct;
            const campaign = { campaignName, fundingGoal, fundingCap, deadline, beneficiary, owner, created, state, amountRised, selectedToken };
            return campaign;
        };
        const destructContribution = (struct: any) => {
            const { sender, value, contributedValues } = struct;
            const contribution = { sender, value, contributedValues };
            return contribution;
        }

        const createConributionObject = (_sender: string, _value: any, _numberOfContribution: number) => {
            const contribution = {
                sender: _sender,
                value: ethers.BigNumber.from(_value),
                numberOfContribution: ethers.BigNumber.from(_numberOfContribution)
            }
            return contribution
        }


        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));
        const contractInEth = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));


        return { contract, CREATION_TIME, WHITELISTED_TOKENS, owner, beneficiaryAccount, SWAP_ROUTER, QUOTER, WETH, ONE_ETH, TWO_ETH, campaignInitialStateObject, separateCampaignObject, destructContribution, createConributionObject, STATE, otherAccount, anotherAccount, fabricContract, contractInEth }
    }
    describe("Inicialization", function () {
        it("should Initialice campain correctly", async function () {
            const { campaignInitialStateObject, contract, separateCampaignObject, } = await loadFixture(deployFabricContract)
            const campaignStruct = await contract.theCampaign()
            expect(separateCampaignObject(campaignStruct)).to.deep.equal(campaignInitialStateObject)
            const isInitialized = await contract.isInitialized()
            expect(isInitialized).to.be.true

        })
        it("should not allowed initialize an already initialized campaign", async function () {
            const { contract, CREATION_TIME, WHITELISTED_TOKENS, owner, beneficiaryAccount, ONE_ETH, TWO_ETH } = await loadFixture(deployFabricContract)
            await expect(contract.initializeCampaign(
                "Campaign",
                ONE_ETH,
                CREATION_TIME,
                TWO_ETH,
                beneficiaryAccount.address,
                owner.address,
                owner.address,
                WHITELISTED_TOKENS[0]

            )).to.be.reverted
        })
        describe("Contributions", function () {
            describe("Contributions in other coins", function () {
                it("should contribute correctly", async function () {
                    const { contract, WHITELISTED_TOKENS, WETH, owner, destructContribution, createConributionObject, ONE_ETH } = await loadFixture(deployFabricContract)
                    const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
                    const deadline = (await time.latest()) + 15;
                    const times = await time.latest()
                    const maxAmount = Math.floor(1.1 * (Number(amount)))
                    await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
                    const contribution = await contract.contributionsByPeople(owner.address)
                    expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner.address, ONE_ETH, 1))
                })
                it("Should not allow to contribute 0", async function () {
                    const { contract, WHITELISTED_TOKENS, WETH, owner, ONE_ETH } = await loadFixture(deployFabricContract)
                    const deadline = (await time.latest()) + 15;
                    await expect(contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: "0" })).to.be.reverted
                })
                it("should not contribute during success state", async function () {
                    const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, TWO_ETH } = await loadFixture(deployFabricContract)
                    const amount = await contract.callStatic.quotePrice(false, TWO_ETH, WETH, WHITELISTED_TOKENS[1])
                    const deadline = (await time.latest()) + 15;
                    const maxAmount = Math.floor(1.1 * (Number(amount)))
                    await contract.contribute(deadline, TWO_ETH, { from: owner.getAddress(), value: String(maxAmount) })
                    await expect(contract.contribute(deadline, TWO_ETH, { from: owner.getAddress(), value: String(maxAmount) })).to.be.reverted
                })
                it("should not contribute after deadline", async function () {
                    const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, TWO_ETH } = await loadFixture(deployFabricContract)
                    await time.increaseTo(CREATION_TIME + CREATION_TIME)
                    const amount = await contract.callStatic.quotePrice(false, TWO_ETH, WETH, WHITELISTED_TOKENS[1])
                    const deadline = (await time.latest()) + 15;
                    const maxAmount = Math.floor(1.1 * (Number(amount)))
                    await expect(contract.contribute(deadline, TWO_ETH, { from: owner.getAddress(), value: String(maxAmount) })).to.be.reverted
                })
                it("should emit contribution Event", async function () {
                    const { contract, WHITELISTED_TOKENS, WETH, owner, destructContribution, createConributionObject, ONE_ETH } = await loadFixture(deployFabricContract)
                    const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
                    const deadline = (await time.latest()) + 15;
                    const times = await time.latest()
                    const maxAmount = Math.floor(1.1 * (Number(amount)))
                    const expectedContribution = createConributionObject(owner.address, ONE_ETH, 1)
                    await expect(contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })).to.emit(contract, "ContributionMade")
                })
            })

            //     it.skip("Should Have Multiple contribution", async function () {
            //         const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, TWO_ETH, destructContribution, createConributionObject } = await loadFixture(deployFabricContract)
            //         for (let i = 5; i > 1; i--) {
            //             const amount = await contract.callStatic.quotePrice(false, '2000000000', WETH, WHITELISTED_TOKENS[1])
            //             const deadline = (await time.latest()) + 15;
            //             const times = await time.latest()
            //             const maxAmount = Math.floor(1.1 * (Number(amount)))
            //             await contract.contribute(deadline, '2000000000', { from: owner.getAddress(), value: String(maxAmount) })
            //         }
            //         const test = async (i: number) => {
            //             const contribution = await contract.contributionsByPeople(owner.address)
            //             expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner.getAddress(), '2000000000', ['2000000000'], [times], 1))
            //         }
            //     })
        })
        describe("Contribution in ETH", async function () {
            it("should contribute correctly", async function () {
                const { WHITELISTED_TOKENS, WETH, owner, destructContribution, createConributionObject, ONE_ETH, contractInEth } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                const times = await time.latest()
                await contractInEth.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: ONE_ETH })
                const contribution = await contractInEth.contributionsByPeople(owner.address)
                expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner.address, ONE_ETH, 1))
            })
            it("Should not allow to contribute 0", async function () {
                const { contractInEth, owner, ONE_ETH } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                await expect(contractInEth.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: "0" })).to.be.reverted
            })
            it("should not contribute during success state", async function () {
                const { contractInEth, WHITELISTED_TOKENS, WETH, owner, TWO_ETH } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                await contractInEth.contribute(deadline, TWO_ETH, { from: owner.getAddress(), value: TWO_ETH })
                await expect(contractInEth.contribute(deadline, TWO_ETH, { from: owner.getAddress(), value: TWO_ETH })).to.be.reverted
            })
            it("should not contribute after deadline", async function () {
                const { contractInEth, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, TWO_ETH } = await loadFixture(deployFabricContract)
                await time.increaseTo(CREATION_TIME + CREATION_TIME)
                const deadline = (await time.latest()) + 15;
                await expect(contractInEth.contribute(deadline, TWO_ETH, { from: owner.getAddress(), value: TWO_ETH })).to.be.reverted
            })
            it("should emit contribution Event", async function () {
                const { contractInEth, WHITELISTED_TOKENS, WETH, owner, createConributionObject, ONE_ETH } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                const times = await time.latest()
                const expectedContribution = createConributionObject(owner.address, ONE_ETH, 1)
                await expect(contractInEth.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: ONE_ETH })).to.emit(contractInEth, "ContributionMade")
            })
        })

        //     it.skip("Should Have Multiple contribution", async function () {
        //         const { contractInEth, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, TWO_ETH, destructContribution, createConributionObject } = await loadFixture(deployFabricContract)
        //         for (let i = 5; i > 1; i--) {
        //             const amount = await contract.callStatic.quotePrice(false, '2000000000', WETH, WHITELISTED_TOKENS[0])
        //             const deadline = (await time.latest()) + 15;
        //             const times = await time.latest()
        //             const maxAmount = Math.floor(1.1 * (Number(amount)))
        //             await contract.contribute(deadline, '2000000000', { from: owner.getAddress(), value: String(maxAmount) })
        //         }
        //         const test = async (i: number) => {
        //             const contribution = await contract.contributionsByPeople(owner.address)
        //             expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner.getAddress(), '2000000000', ['2000000000'], [times], 1))
        //         }
        //     })
    })


    describe("Whitdrawls", async function () {
        it("Should allow the beneficiary withdraw during succes state", async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, TWO_ETH, beneficiaryAccount } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, TWO_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, TWO_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            const balanceBefore = await beneficiaryAccount.getBalance()
            contract.connect(beneficiaryAccount)
            const tx = await contract.withdraw({ from: beneficiaryAccount.address })
            const receipt = tx.wait();
            const balanceAfter = await beneficiaryAccount.getBalance()
            const gasUsed = Number((await receipt).cumulativeGasUsed);
            const gasPrice = Number((await receipt).effectiveGasPrice);
            const finalAmount = (Number(balanceAfter) - Number(balanceBefore)) + gasUsed * gasPrice
            const amountShouldEarn = (Number(TWO_ETH) - (1 / 100)) * (Number(TWO_ETH))
            expect(finalAmount).to.equal(amountShouldEarn)
        })
        it(`should not allow the beneficiary whtidraw during ongoing state`, async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, ONE_ETH, beneficiaryAccount, STATE } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            contract.connect(beneficiaryAccount)
            await expect(contract.withdraw({ from: beneficiaryAccount.address })).to.be.reverted
        })
        it(`should not allow the beneficiary whtidraw during failed state`, async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, ONE_ETH, beneficiaryAccount, STATE } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.closeCampaign()
            contract.connect(beneficiaryAccount)
            await expect(contract.withdraw({ from: beneficiaryAccount.address })).to.be.reverted
        })
        it(`should allow the beneficiary whtidraw during ealry success state`, async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, ONE_ETH, beneficiaryAccount, STATE } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            contract.connect(beneficiaryAccount)
            await contract.withdraw({ from: beneficiaryAccount.address })
        })
        it("should not allow others than the beneficiary to witdraw", async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, ONE_ETH, beneficiaryAccount, STATE, otherAccount, anotherAccount } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            await expect(contract.withdraw({ from: owner.address })).to.be.reverted
            contract.connect(otherAccount)
            await expect(contract.withdraw({ from: otherAccount.address })).to.be.reverted
            contract.connect(anotherAccount)
            await expect(contract.withdraw({ from: anotherAccount.address })).to.be.reverted
        })
    })
    describe("Refound", function () {
        it.skip("Should allow contributors get a refound in case of failure in ETH", async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, destructContribution, createConributionObject, ONE_ETH } = await loadFixture(deployFabricContract)
            const contributedValue = String(Number(ONE_ETH) / 2)
            const deadline = (await time.latest()) + 15;
            await contract.contribute(deadline, contributedValue, { from: owner.getAddress(), value: contributedValue })
            await contract.closeCampaign()
            const balanceBefore = await owner.getBalance()
            const tx = await contract.claimFounds(true, '0')
            const balanceAfter = await owner.getBalance()
            const receipt = tx.wait();
            const gasUsed = Number((await receipt).cumulativeGasUsed);
            const gasPrice = Number((await receipt).effectiveGasPrice);
            const finalAmount = (Number(balanceAfter) - Number(balanceBefore)) + gasUsed * gasPrice
            const amountShouldEarn = (Number(contributedValue))
            expect(finalAmount).to.equal(amountShouldEarn)
        })
        it("Should allow contributors get a refound in case of failure", async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, destructContribution, createConributionObject, ONE_ETH } = await loadFixture(deployFabricContract)
            const contributedValue = String(Number(ONE_ETH) / 2)
            const amount = await contract.callStatic.quotePrice(false, contributedValue, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline,  contributedValue, { from: owner.getAddress(), value: String(maxAmount) })
            await contract.closeCampaign()
            const balanceBefore = await owner.getBalance()
            const tx = await contract.claimFounds(true, '0')
            const balanceAfter = await owner.getBalance()
            const receipt = tx.wait();
            const gasUsed = Number((await receipt).cumulativeGasUsed);
            const gasPrice = Number((await receipt).effectiveGasPrice);
            const finalAmount = (Number(balanceAfter) - Number(balanceBefore)) + gasUsed * gasPrice
            const amountShouldEarn = (Number(contributedValue))
            expect(finalAmount).to.equal(amountShouldEarn)
        })
    })
})