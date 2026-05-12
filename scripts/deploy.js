const hre = require("hardhat");

async function main() {
  const startingHouseBalance = process.env.STARTING_HOUSE_ETH || "0.02";
  const CoinFlipGame = await hre.ethers.getContractFactory("CoinFlipGame");

  console.log("Deploying CoinFlipGame...");
  console.log(`Funding house with ${startingHouseBalance} ETH...`);

  const coinFlipGame = await CoinFlipGame.deploy({
    value: hre.ethers.utils.parseEther(startingHouseBalance),
  });

  await coinFlipGame.deployed();

  console.log("-----------------------------------------------");
  console.log("CoinFlipGame deployed to:", coinFlipGame.address);
  console.log("-----------------------------------------------");
  console.log("CRITICAL: Copy this address to your .env file!");
  console.log(`CONTRACT_ADDRESS=${coinFlipGame.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
