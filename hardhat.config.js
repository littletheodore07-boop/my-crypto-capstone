require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

const {API_URL, PRIVATE_KEY} = process.env;
const hasPrivateKey = typeof PRIVATE_KEY === "string" && /^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY.trim());

module.exports = {
  solidity: "0.8.24",
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {}, 
    sepolia: {
      url: API_URL || "",
      accounts: hasPrivateKey ? [PRIVATE_KEY.trim()] : []
    }
  }
};
