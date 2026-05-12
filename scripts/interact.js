const hre = require("hardhat");

async function main() {
  const [sender] = await hre.ethers.getSigners();
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const choice = String(process.env.COIN_CHOICE || "heads").toLowerCase();
  const wagerEth = process.env.WAGER_ETH || "0.001";

  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS is missing from .env");
  }

  if (!["heads", "tails"].includes(choice)) {
    throw new Error("COIN_CHOICE must be heads or tails.");
  }

  const coinFlipGame = await hre.ethers.getContractAt("CoinFlipGame", contractAddress);
  const choiceHeads = choice === "heads";
  const wager = hre.ethers.utils.parseEther(wagerEth);

  console.log("Player:", sender.address);
  console.log(`Flipping ${choice} with ${wagerEth} ETH...`);

  const tx = await coinFlipGame.flip(choiceHeads, {
    value: wager,
    gasLimit: 250000,
  });
  console.log("Transaction sent:", tx.hash);

  const receipt = await tx.wait();
  const event = receipt.events.find((item) => item.event === "CoinFlipped");

  if (!event) {
    console.log("Flip confirmed, but no CoinFlipped event was found.");
    return;
  }

  const { resultHeads, won, payout } = event.args;
  console.log("-----------------------------------------------");
  console.log("Coin landed on:", resultHeads ? "heads" : "tails");
  console.log("Result:", won ? "WIN" : "LOSS");
  console.log("Payout:", hre.ethers.utils.formatEther(payout), "ETH");
  console.log("-----------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
