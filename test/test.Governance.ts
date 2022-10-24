import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as TimelockController from "../artifacts/@openzeppelin/contracts/governance/TimelockController.sol/TimelockController.json";

describe("Crowfy Governance", function () {

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

        const timelockControlerContractFabric = await  ethers.getContractFactoryFromArtifact(TimelockController);
        const timelockControlerContract = await timelockControlerContractFabric.deploy()

        const Fabric = await ethers.getContractFactory("CrowdfyFabric");
        const token = await ethers.getContractFactory("CrowdfyToken");
        const governorFabric = await ethers.getContractFactory("CrowdfyGovernance ");
        const tokenContract = await token.deploy();
        const governorContract = await governorFabric.deploy(tokenContract, timelockControlerContract )
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
        return { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, Fabric, SWAP_ROUTER, QUOTER, WETH, ONE_ETH, TWO_ETH, contract, beneficiaryAccount, governorContract }
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