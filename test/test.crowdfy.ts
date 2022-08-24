import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";


describe("Crowdfy Campaign", function () {

    const deployFabricContract = async () => {
        const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

        // eth, dai, usdt, usdc
        const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
        const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
        const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
        const WHITELISTED_TOKENS: string[] = [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            "0x73967c6a0904aa032c103b4104747e88c566b1a2",
            "0x509ee0d083ddf8ac028f2a56731412edd63223b9",
            "0x2f3A40A3db8a7e3D09B0adfEfbCe4f6F81927557"
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

        const [owner, otherAccount] = await ethers.getSigners();

        const Fabric = await ethers.getContractFactory("CrowdfyFabric");
        const fabricContract = await Fabric.deploy(WHITELISTED_TOKENS, SWAP_ROUTER, QUOTER, WETH);

        await fabricContract.createCampaign(
            "My new Campaign",
            ONE_ETH,
            CREATION_TIME,
            TWO_ETH,
            otherAccount.address,
            WHITELISTED_TOKENS[1]
        )

        const campaignInitialStateObject = {
            campaignName: "My new Campaign",
            fundingGoal: ethers.BigNumber.from(ONE_ETH),
            fundingCap:  ethers.BigNumber.from(TWO_ETH),
            deadline:  ethers.BigNumber.from(CREATION_TIME),
            beneficiary: otherAccount.address,
            owner: owner.address,
            created:  ethers.BigNumber.from(await time.latest()),
            state: STATE.ongoing,
            selectedToken: WHITELISTED_TOKENS[1],
            amountRised:  ethers.BigNumber.from(0)
        }

        const contract = await ethers.getContractAt("Crowdfy", await fabricContract.campaignsById(0));


        return { contract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, SWAP_ROUTER, QUOTER, WETH, ONE_ETH, TWO_ETH, campaignInitialStateObject }
    }
    describe("Inicialization", function () {
        it("should Initialice campain correctly", async function () {
            const { campaignInitialStateObject, contract } = await loadFixture(deployFabricContract)
            const campaignStruct = await contract.theCampaign()
            //TODO:
            // expect(campaignStruct).to.deep.equal(campaignInitialStateObject)
             expect( await contract.isInitialized()).to.be.true
        })
        it("should not allowed initialize an already initialized campaign", async function () {
            const { contract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, ONE_ETH, TWO_ETH} = await loadFixture(deployFabricContract)
            await expect(contract.initializeCampaign(
                "Campaign",
                ONE_ETH,
                CREATION_TIME,
                TWO_ETH,
                otherAccount.address,
                owner.address,
                owner.address,
                WHITELISTED_TOKENS[0]

            )).to.be.reverted

        })

    })
})