import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { IERC20 } from "../typechain-types";
import * as ERC20ABI from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json";
import { FIFTY_ETH, HUNDRED_ETH, ONE_YEAR_IN_SECS, STATE, WETH, QUOTER, SWAP_ROUTER, WHITELISTED_TOKENS } from "../helper-hardhat-config"
import { CampaignStruct } from "../types";
import { destructContribution, separateCampaignObject, createConributionObject } from './utils-test';
import { BigNumber } from "ethers";
import { contributeWithSwap} from "../scripts/core/contribute";

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

        await fabricContract.createCampaign(
            "My new Campaign",
            FIFTY_ETH,
            CREATION_TIME,
            HUNDRED_ETH,
            beneficiaryAccount.address,
            tokenContract.address
        )

        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));
        const contractInEth = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(1));
        const contractwithCrowdfyToken = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(2));
        return { contract, WHITELISTED_TOKENS, owner, beneficiaryAccount, campaignInitialStateObject, otherAccount, anotherAccount, fabricContract, contractInEth, tokenContract, CREATION_TIME, contractwithCrowdfyToken }
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
            const { contract, owner, beneficiaryAccount, CREATION_TIME } = await loadFixture(deployFabricContract)
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
                const { contract,owner } = await loadFixture(deployFabricContract)
                await contributeWithSwap(contract, WETH, WHITELISTED_TOKENS[1], FIFTY_ETH, false, owner);
                const contribution = await contract.contributionsByPeople(owner);
                const campaignStruct = await contract.theCampaign();
                expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner, FIFTY_ETH, 1))
                expect(campaignStruct.amountRised).to.equal(FIFTY_ETH)
            })
            it("Should not allow to contribute 0", async function () {
                const { contract, owner} = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                await expect(contract.contribute(deadline, FIFTY_ETH, WHITELISTED_TOKENS[1], { from: owner, value: "0" })).to.be.reverted
            })
            it("should not contribute during success state", async function () {
                const { contract, owner } = await loadFixture(deployFabricContract)
                await contributeWithSwap(contract, WETH, WHITELISTED_TOKENS[1], HUNDRED_ETH, false, owner);
                await expect(contributeWithSwap(contract, WETH, WHITELISTED_TOKENS[1], HUNDRED_ETH, false, owner)).to.be.reverted
            })
            it("should not contribute after deadline", async function () {
                const { contract, owner, CREATION_TIME } = await loadFixture(deployFabricContract)
                await time.increaseTo(CREATION_TIME + CREATION_TIME)
                await expect(contributeWithSwap(contract, WETH, WHITELISTED_TOKENS[1], HUNDRED_ETH, false, owner)).to.be.reverted
            })
            it("should emit contribution Event", async function () {
                const { contract, owner } = await loadFixture(deployFabricContract)
                const amount = await contract.callStatic.quotePrice(false, FIFTY_ETH, WETH, WHITELISTED_TOKENS[1])
                const deadline = (await time.latest()) + 15;
                const times = await time.latest()
                const maxAmount = Math.floor(1.1 * (Number(amount)))
                const expectedContribution = createConributionObject(owner, FIFTY_ETH, 1)
                await expect(contract.contribute(deadline, maxAmount, WETH, { from: owner, value: String(maxAmount) })).to.emit(contract, "ContributionMade")
            })

            it("Sholud allow the users to contribute in the same token", async function () {
                const { owner, tokenContract, contractwithCrowdfyToken } = await loadFixture(deployFabricContract)
                const toTransfer = ethers.utils.parseEther('10')
                await tokenContract.approve(contractwithCrowdfyToken.address, toTransfer)
                await contributeWithSwap(contractwithCrowdfyToken, tokenContract.address, tokenContract.address, toTransfer, false, owner);
                const contribution = await contractwithCrowdfyToken.contributionsByPeople(owner)
                const campaignStruct = await contractwithCrowdfyToken.theCampaign()
                expect(campaignStruct.amountRised).to.equal(toTransfer)
                expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner, toTransfer, 1))
            })

                it("should have multiple contribution", async function () {
                    const { contract, owner, CREATION_TIME, otherAccount, anotherAccount} = await loadFixture(deployFabricContract)

                  await contributeWithSwap(contract, WETH, WHITELISTED_TOKENS[1], '2000000000', false, owner);
                  const first = await contract.contributionsByPeople(owner)
                  expect(
                    destructContribution(first)
                  ).to.deep.equal(
                    createConributionObject(owner, '2000000000', 1)
                  )

                  await contributeWithSwap(contract.connect(otherAccount), WETH, WHITELISTED_TOKENS[1], '2000000000', false, otherAccount.getAddress());
                  const second = await contract.contributionsByPeople(otherAccount.getAddress())

                   await expect(
                    destructContribution(second)
                  ).to.deep.equal(
                    createConributionObject(await otherAccount.getAddress(), '2000000000', 1)
                  )

                  await contributeWithSwap(contract.connect(anotherAccount), WETH, WHITELISTED_TOKENS[1], '2000000000', false, anotherAccount.getAddress());
                  const third = await contract.contributionsByPeople(anotherAccount.getAddress())

                  await expect(
                    destructContribution(third)
                  ).to.deep.equal(
                    createConributionObject(await anotherAccount.getAddress(), '2000000000', 1)
                  )

                })
        })

        describe("Contribution in ETH", async function () {
            it("should contribute correctly", async function () {
                const {owner, contractInEth } = await loadFixture(deployFabricContract)
                await contributeWithSwap(contractInEth, WHITELISTED_TOKENS[0], WHITELISTED_TOKENS[0], FIFTY_ETH, true, owner);
                const contribution = await contractInEth.contributionsByPeople(owner)
                expect(destructContribution(contribution)).to.deep.equal(createConributionObject(owner, FIFTY_ETH, 1))
            })
            it("Should not allow to contribute 0", async function () {
                const { contractInEth, owner, } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                await expect(contractInEth.contribute(deadline, FIFTY_ETH,  WHITELISTED_TOKENS[0],  { from: owner, value: "0" })).to.be.reverted
            })
            it("should not contribute during success state", async function () {
                const { contractInEth, owner, beneficiaryAccount } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                await contractInEth.connect(beneficiaryAccount).contribute(deadline, HUNDRED_ETH, WHITELISTED_TOKENS[0], { from: beneficiaryAccount.address, value: HUNDRED_ETH })
                await expect(contractInEth.contribute(deadline, FIFTY_ETH, WHITELISTED_TOKENS[0],  { from: owner, value: FIFTY_ETH })).to.be.reverted
            })
            it("should not contribute after deadline", async function () {
                const { contractInEth,  owner, CREATION_TIME } = await loadFixture(deployFabricContract)
                await time.increaseTo(CREATION_TIME + CREATION_TIME)
                const deadline = (await time.latest()) + 15;
                await expect(contractInEth.contribute(deadline, FIFTY_ETH, WHITELISTED_TOKENS[0],  { from: owner, value: FIFTY_ETH })).to.be.reverted
            })
            it("should emit contribution Event", async function () {
                const { contractInEth, owner } = await loadFixture(deployFabricContract)
                const deadline = (await time.latest()) + 15;
                const times = await time.latest()
                const expectedContribution = createConributionObject(owner, FIFTY_ETH, 1)
                await expect(contractInEth.contribute(deadline, FIFTY_ETH,  WHITELISTED_TOKENS[0],  { from: owner, value: FIFTY_ETH })).to.emit(contractInEth, "ContributionMade")
            })
        })
    })


    describe("Whitdrawls", async function () {

        //tomar en cuenta el token del cual estamos haciendo withdraw
        it("Should allow the beneficiary withdraw during succes state", async function () {
            const { contract, owner, beneficiaryAccount } = await loadFixture(deployFabricContract)
            const DaiContract = await ethers.getContractAt(ERC20ABI.abi, WHITELISTED_TOKENS[1]) as unknown as IERC20
            await contributeWithSwap(contract, WETH, WHITELISTED_TOKENS[1], HUNDRED_ETH, false, owner);
            const balanceBefore = await DaiContract.balanceOf(beneficiaryAccount.address)
            await contract.connect(beneficiaryAccount).withdraw({ from: beneficiaryAccount.address })
            const balanceAfter = await DaiContract.balanceOf(beneficiaryAccount.address)
            expect(balanceAfter).greaterThan(balanceBefore)
            // expect(balanceAfter).to.equal(String(maxAmount))
        })
        it(`should not allow the beneficiary whtidraw during ongoing state`, async function () {
            const { contract, owner, beneficiaryAccount } = await loadFixture(deployFabricContract)
            contributeWithSwap(contract, WETH, WHITELISTED_TOKENS[1], FIFTY_ETH, false, owner);
            await contract.connect(beneficiaryAccount)
            await expect(contract.withdraw()).to.be.reverted
        })
        it(`should not allow the beneficiary whtidraw during failed state`, async function () {
            const { contract, beneficiaryAccount} = await loadFixture(deployFabricContract)
            await contract.closeCampaign()
            await expect(contract.connect(beneficiaryAccount).withdraw()).to.be.reverted
        })
        it(`should allow the beneficiary whtidraw during ealry success state`, async function () {
            const { contract, owner, beneficiaryAccount, } = await loadFixture(deployFabricContract)
            const DaiContract = await ethers.getContractAt(ERC20ABI.abi, WHITELISTED_TOKENS[1]) as unknown as IERC20
            contributeWithSwap(contract, WETH, WHITELISTED_TOKENS[1], FIFTY_ETH, false, owner);

            const balanceBefore = await DaiContract.balanceOf(beneficiaryAccount.address)
            await contract.connect(beneficiaryAccount).withdraw()
            const balanceAfter = await DaiContract.balanceOf(beneficiaryAccount.address)
            expect(balanceAfter).greaterThan(balanceBefore)
            // expect(balanceAfter).to.equal(String(Number(maxAmount)))
        })
        it("should not allow others than the beneficiary to witdraw", async function () {
            const { contract,  owner, beneficiaryAccount, otherAccount, anotherAccount } = await loadFixture(deployFabricContract)
            await contributeWithSwap(contract, WETH, WHITELISTED_TOKENS[1], FIFTY_ETH, false, owner);
            await expect(contract.withdraw()).to.be.revertedWith('Only the beneficiary can call this function')
            await expect(contract.connect(otherAccount).withdraw()).to.be.revertedWith('Only the beneficiary can call this function')
            await expect(contract.connect(anotherAccount).withdraw()).to.be.revertedWith('Only the beneficiary can call this function')
        })
        it("Should Allow beneficiary withdraw in eth", async function () {
            const {  owner, contractInEth, beneficiaryAccount} = await loadFixture(deployFabricContract)
            await contributeWithSwap(contractInEth, WHITELISTED_TOKENS[0], WHITELISTED_TOKENS[0], FIFTY_ETH, true, owner);
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
            await contributeWithSwap(contractInEth.connect(otherAccount), WHITELISTED_TOKENS[0], WHITELISTED_TOKENS[0], contributedValue, true, otherAccount.getAddress());
            await contractInEth.closeCampaign()
            const balanceBefore = await otherAccount.getBalance()
            await contractInEth.connect(otherAccount).claimFounds(true, "0", '0')
            const balanceAfter = await otherAccount.getBalance()
            expect(balanceAfter).greaterThan(balanceBefore)
        })
        it.skip("Should allow contributors get a refound in eth in case of failure", async function () {
            const { contract, owner, otherAccount } = await loadFixture(deployFabricContract)
            const DaiContract = await ethers.getContractAt(ERC20ABI.abi, WHITELISTED_TOKENS[1]) as unknown as IERC20
            const contributedValue = String(Number(FIFTY_ETH) / 2)
            const amount = await contract.callStatic.quotePrice(false, contributedValue, WETH, WHITELISTED_TOKENS[1])
            const tx = await contributeWithSwap(contract.connect(otherAccount), WETH, WHITELISTED_TOKENS[1], contributedValue, false, otherAccount.getAddress());
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
            const { contract,owner, otherAccount } = await loadFixture(deployFabricContract)
            const DaiContract = await ethers.getContractAt(ERC20ABI.abi, WHITELISTED_TOKENS[1]) as unknown as IERC20
            const contributedValue = String(Number(FIFTY_ETH) / 2)
            await contributeWithSwap(contract.connect(otherAccount), WETH, WHITELISTED_TOKENS[1], contributedValue, false, otherAccount.getAddress());
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
            // its 130 because in the fixture the {owner} acccount is creating a campaign twice
            expect(balance).to.be.equal(tokenContractMaxSupply.div(100).add(ethers.utils.parseEther('30')))
        })
        it('should issue tokens correclty when contributing a campaign', async function () {
            const { contract,  tokenContract, otherAccount } = await loadFixture(deployFabricContract)
            await contributeWithSwap(contract.connect(otherAccount), WETH, WHITELISTED_TOKENS[1], FIFTY_ETH, false, otherAccount.getAddress());
            const balance = await tokenContract.balanceOf(otherAccount.address)
            expect(String(balance)).to.be.equal(ethers.utils.parseEther('5'))
        })
        it("Should minted corerct amount of token to the deployer", async function () {
            const { tokenContract, owner } = await loadFixture(deployFabricContract)
            const balance = await tokenContract.balanceOf(owner)
            const tokenContractMaxSupply: BigNumber = await tokenContract.maxSupply()
            expect(balance).to.be.equal(tokenContractMaxSupply.div(100).add(ethers.utils.parseEther('30')))
        })
        it("Should not be allowed to mint new tokens", async function () {
            const { tokenContract, owner } = await loadFixture(deployFabricContract)
            await expect(tokenContract.mint(owner, "10")).to.be.reverted
        })
    })
})
