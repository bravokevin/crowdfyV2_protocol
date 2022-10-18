import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { IERC20 } from "../typechain-types";


describe("Crowdfy Campaign", function () {

    const deployFabricContract = async () => {
        const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

        const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
        const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
        const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
        // eth, dai, usdt, usdc
        const WHITELISTED_TOKENS = [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
            "0x509ee0d083ddf8ac028f2a56731412edd63223b9",
            "0x4FEB71333c2A9fE81625a5727ab0Ed33dC77B841"
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
            created: ethers.BigNumber.from(await time.latest() - 1),
            state: STATE.ongoing,
            selectedToken: WHITELISTED_TOKENS[1],
            amountRised: ethers.BigNumber.from(0)
        }

        const separateCampaignObject = (struct: any) => {
            const { campaignName, fundingGoal, fundingCap, deadline, beneficiary, owner, created, state, selectedToken, amountRised } = struct;
            const campaign = { campaignName, fundingGoal, fundingCap, deadline, beneficiary, owner, created, state, selectedToken, amountRised };
            return campaign;
        };
        const destructContribution = (struct: any) => {
            const { sender, value, numberOfContributions } = struct;
            const contribution = { sender, value, numberOfContributions };
            return contribution;
        }

        const createConributionObject = (_sender: string, _value: any, _numberOfContribution: number) => {
            const contribution = {
                sender: _sender,
                value: ethers.BigNumber.from(_value),
                numberOfContributions: ethers.BigNumber.from(_numberOfContribution)
            }
            return contribution
        }


        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));
        const contractInEth = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(1));


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
    })


    describe("Whitdrawls", async function () {

        //tomar en cuenta el token del cual estamos haciendo withdraw
        it("Should allow the beneficiary withdraw during succes state", async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, TWO_ETH, beneficiaryAccount } = await loadFixture(deployFabricContract)
            const ERC20ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");

            const DaiContract = await ethers.getContractAtFromArtifact(ERC20ABI, WHITELISTED_TOKENS[1]) as unknown as IERC20
            const amount = await contract.callStatic.quotePrice(false, TWO_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, TWO_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            const balanceBefore = await DaiContract.balanceOf(beneficiaryAccount.address)
            await contract.connect(beneficiaryAccount).withdraw({ from: beneficiaryAccount.address })
            const balanceAfter = await DaiContract.balanceOf(beneficiaryAccount.address)
            expect(balanceAfter).greaterThan(balanceBefore)
            expect(balanceAfter).to.equal(String(Number(TWO_ETH) - (1 / 100) * Number(TWO_ETH)))
        })
        it(`should not allow the beneficiary whtidraw during ongoing state`, async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, ONE_ETH, beneficiaryAccount, STATE } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            await contract.connect(beneficiaryAccount)
            await expect(contract.withdraw()).to.be.reverted
        })
        it(`should not allow the beneficiary whtidraw during failed state`, async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, ONE_ETH, beneficiaryAccount, STATE } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.closeCampaign()
            await expect(contract.connect(beneficiaryAccount).withdraw()).to.be.reverted
        })
        it(`should allow the beneficiary whtidraw during ealry success state`, async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, ONE_ETH, beneficiaryAccount, STATE } = await loadFixture(deployFabricContract)
            const ERC20ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");

            const DaiContract = await ethers.getContractAtFromArtifact(ERC20ABI, WHITELISTED_TOKENS[1]) as unknown as IERC20
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            const balanceBefore = await DaiContract.balanceOf(beneficiaryAccount.address)
            await contract.connect(beneficiaryAccount).withdraw()
            const balanceAfter = await DaiContract.balanceOf(beneficiaryAccount.address)
            expect(balanceAfter).greaterThan(balanceBefore)
            expect(balanceAfter).to.equal(String(Number(ONE_ETH) - (1 / 100) * Number(ONE_ETH)))
        })
        it("should not allow others than the beneficiary to witdraw", async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, CREATION_TIME, ONE_ETH, beneficiaryAccount, STATE, otherAccount, anotherAccount } = await loadFixture(deployFabricContract)
            const amount = await contract.callStatic.quotePrice(false, ONE_ETH, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.contribute(deadline, ONE_ETH, { from: owner.getAddress(), value: String(maxAmount) })
            await expect(contract.withdraw()).to.be.revertedWith('Only the beneficiary can call this function')
            await expect(contract.connect(otherAccount).withdraw()).to.be.revertedWith('Only the beneficiary can call this function')
            await expect(contract.connect(anotherAccount).withdraw()).to.be.revertedWith('Only the beneficiary can call this function')
        })
    })
    describe("Refound", function () {
        it("Should allow contributors get a refound in case of failure in campaign in ETH", async function () {
            const { owner, ONE_ETH, contractInEth, otherAccount } = await loadFixture(deployFabricContract)
            const contributedValue = String(Number(ONE_ETH) / 2)
            const deadline = (await time.latest()) + 15;
            await contractInEth.connect(otherAccount).contribute(deadline, contributedValue, { from: otherAccount.address, value: contributedValue })
            await contractInEth.connect(owner).closeCampaign()

            const balanceBefore = await otherAccount.getBalance()
            await contractInEth.connect(otherAccount).claimFounds(true, "0", '0')
            const balanceAfter = await otherAccount.getBalance()
            expect(balanceAfter).greaterThan(balanceBefore)
        })
        it.skip("Should allow contributors get a refound in eth in case of failure", async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, ONE_ETH, otherAccount } = await loadFixture(deployFabricContract)
            const ERC20ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");

            const DaiContract = await ethers.getContractAtFromArtifact(ERC20ABI,WHITELISTED_TOKENS[1]) as unknown as IERC20

            const contributedValue = String(Number(ONE_ETH) / 2)
            const amount = await contract.callStatic.quotePrice(false, contributedValue, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 30;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.connect(otherAccount).contribute(deadline, contributedValue, { from: otherAccount.address, value: String(maxAmount) })
            await contract.connect(owner).closeCampaign()
            const contractDaiBalance = await DaiContract.balanceOf(contract.address)
            console.log(`Contract dai balance ${contractDaiBalance}`)

            const balanceBefore = await otherAccount.getBalance()
            const amounToRefound = await contract.callStatic.quotePrice(true, contributedValue,
                WHITELISTED_TOKENS[1], WETH)
            console.log(`Quoted Price ${amounToRefound}`)
            const maxAmountToRefound = Math.floor(1.1 * (Number(amounToRefound)))
            console.log(`Quoted Price after increment ${maxAmountToRefound}`)

            const deadline2 = (await time.latest()) + 30;

            await contract.connect(otherAccount).claimFounds(true, amounToRefound, deadline2)
            const balanceAfter = await otherAccount.getBalance()

            expect(balanceAfter).greaterThan(balanceBefore)
        })

        it("Should allow refound in the same token", async function () {
            const { contract, WHITELISTED_TOKENS, WETH, owner, ONE_ETH, otherAccount } = await loadFixture(deployFabricContract)
            const ERC20ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");

            const DaiContract = await ethers.getContractAtFromArtifact(ERC20ABI, WHITELISTED_TOKENS[1]) as unknown as IERC20

            const contributedValue = String(Number(ONE_ETH) / 2)
            const amount = await contract.callStatic.quotePrice(false, contributedValue, WETH, WHITELISTED_TOKENS[1])
            const deadline = (await time.latest()) + 15;
            const maxAmount = Math.floor(1.1 * (Number(amount)))
            await contract.connect(otherAccount).contribute(deadline, contributedValue, { from: otherAccount.address, value: String(maxAmount) })
            await contract.connect(owner).closeCampaign()
            const balanceBefore = await DaiContract.balanceOf(otherAccount.address)
            await contract.connect(otherAccount).claimFounds(false, '0', '0');
            const balanceAfter = await DaiContract.callStatic.balanceOf(otherAccount.address)
            expect(balanceAfter).greaterThan(balanceBefore);
            expect(balanceAfter).to.equal(contributedValue);
        })
    })
})