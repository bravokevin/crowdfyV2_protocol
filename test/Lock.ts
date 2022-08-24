import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";


describe("Crowdfy Fabric", function () {

  const deployFabricContract = async () => {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

    // eth, dai, usdt, usdc
    const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
    const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
    const SWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    const WHITELISTED_TOKENS: string[] = [
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "0x73967c6a0904aa032c103b4104747e88c566b1a2", "0x509ee0d083ddf8ac028f2a56731412edd63223b9", "0x2f3A40A3db8a7e3D09B0adfEfbCe4f6F81927557"
    ];
    const CREATION_TIME = (await time.latest()) + ONE_YEAR_IN_SECS;

    const [owner, otherAccount] = await ethers.getSigners();

    const Fabric = await ethers.getContractFactory("CrowdfyFabric");
    const fabricContract = await Fabric.deploy(WHITELISTED_TOKENS, SWAP_ROUTER, QUOTER, WETH);

    const test = async (i: number) =>{
      // const { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, Fabric } = await loadFixture(deployFabricContract)
      expect(await fabricContract.whitelistedTokensArr(i)).to.equal(ethers.utils.getAddress(WHITELISTED_TOKENS[i]))
      expect(await fabricContract.isWhitelisted(WHITELISTED_TOKENS[i])).to.be.true
    }

    return { fabricContract, CREATION_TIME, WHITELISTED_TOKENS, owner, otherAccount, Fabric, SWAP_ROUTER, QUOTER, WETH, test }
  }

  describe("Deployment", function () {
    it("Should be deployed correctly", async function () {
      const { WHITELISTED_TOKENS, owner, otherAccount, SWAP_ROUTER, QUOTER, WETH } = await loadFixture(deployFabricContract)
      const Fabric = await ethers.getContractFactory("CrowdfyFabric");
      const fabricContract = await Fabric.deploy(WHITELISTED_TOKENS, SWAP_ROUTER, QUOTER, WETH);
      expect(await fabricContract.getTotalTokens()).to.equal(WHITELISTED_TOKENS.length);
      expect(await fabricContract.protocolOwner()).to.equal(owner.address);
      expect(await Fabric.deploy(WHITELISTED_TOKENS, SWAP_ROUTER, QUOTER, WETH))
      .to.emit(fabricContract, "WhitlistedTokensUpdated")
        .withArgs(WHITELISTED_TOKENS)
    })

    it("Should list all tokens correctly", async function () {
      const { WHITELISTED_TOKENS,  test} = await loadFixture(deployFabricContract)
  
      for (let i = 0; i < WHITELISTED_TOKENS.length; i++) {
        test(i)
      }

    })
  })

})


// describe("Lock", function () {
//   // We define a fixture to reuse the same setup in every test.
//   // We use loadFixture to run this setup once, snapshot that state,
//   // and reset Hardhat Network to that snapshot in every test.
//   async function deployOneYearLockFixture() {
//     const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
//     const ONE_GWEI = 1_000_000_000;

//     const lockedAmount = ONE_GWEI;
//     const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

//     // Contracts are deployed using the first signer/account by default
//     const [owner, otherAccount] = await ethers.getSigners();

//     const Lock = await ethers.getContractFactory("Lock");
//     const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

//     return { lock, unlockTime, lockedAmount, owner, otherAccount };
//   }

//   describe("Deployment", function () {
//     it("Should set the right unlockTime", async function () {
//       const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

//       expect(await lock.unlockTime()).to.equal(unlockTime);
//     });

//     it("Should set the right owner", async function () {
//       const { lock, owner } = await loadFixture(deployOneYearLockFixture);

//       expect(await lock.owner()).to.equal(owner.address);
//     });

//     it("Should receive and store the funds to lock", async function () {
//       const { lock, lockedAmount } = await loadFixture(
//         deployOneYearLockFixture
//       );

//       expect(await ethers.provider.getBalance(lock.address)).to.equal(
//         lockedAmount
//       );
//     });

//     it("Should fail if the unlockTime is not in the future", async function () {
//       // We don't use the fixture here because we want a different deployment
//       const latestTime = await time.latest();
//       const Lock = await ethers.getContractFactory("Lock");
//       await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
//         "Unlock time should be in the future"
//       );
//     });
//   });

//   describe("Withdrawals", function () {
//     describe("Validations", function () {
//       it("Should revert with the right error if called too soon", async function () {
//         const { lock } = await loadFixture(deployOneYearLockFixture);

//         await expect(lock.withdraw()).to.be.revertedWith(
//           "You can't withdraw yet"
//         );
//       });

//       it("Should revert with the right error if called from another account", async function () {
//         const { lock, unlockTime, otherAccount } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         // We can increase the time in Hardhat Network
//         await time.increaseTo(unlockTime);

//         // We use lock.connect() to send a transaction from another account
//         await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
//           "You aren't the owner"
//         );
//       });

//       it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
//         const { lock, unlockTime } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         // Transactions are sent using the first signer by default
//         await time.increaseTo(unlockTime);

//         await expect(lock.withdraw()).not.to.be.reverted;
//       });
//     });

//     describe("Events", function () {
//       it("Should emit an event on withdrawals", async function () {
//         const { lock, unlockTime, lockedAmount } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         await time.increaseTo(unlockTime);

//         await expect(lock.withdraw())
//           .to.emit(lock, "Withdrawal")
//           .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
//       });
//     });

//     describe("Transfers", function () {
//       it("Should transfer the funds to the owner", async function () {
//         const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         await time.increaseTo(unlockTime);

//         await expect(lock.withdraw()).to.changeEtherBalances(
//           [owner, lock],
//           [lockedAmount, -lockedAmount]
//         );
//       });
//     });
//   });
// });
