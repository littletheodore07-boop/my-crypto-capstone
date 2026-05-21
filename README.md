# Coin Flip Crypto Game

Coin Flip Crypto Game is a full-stack capstone project that combines a web login system, a MySQL database ledger, MetaMask wallet support, and an Ethereum smart contract. A player signs in, connects or enters an Ethereum wallet address, chooses heads or tails, enters a wager, and flips the coin. The application records each flip with the wallet address, wager, coin result, win/loss outcome, payout amount, transaction hash when available, and timestamps.

The project can run in two modes:

- Demo mode: the website accepts a wallet address, randomly creates a coin flip result on the Node server, and stores the result in MySQL.
- Live ETH mode: the website uses MetaMask to send Sepolia ETH to the deployed `CoinFlipGame` smart contract. The server verifies the blockchain transaction and then saves the confirmed result in MySQL.

## Project Features

- User registration and login with hashed passwords
- Browser-based coin flip dashboard
- MetaMask wallet connection
- Optional wallet allowlist for class demos
- Sepolia ETH wagering through a Solidity smart contract
- MySQL storage for users and coin flip history
- API routes for game configuration, authentication, and flip history
- Hardhat scripts for compiling, deploying, and testing contract interaction from the terminal

## Tech Stack

- Frontend: HTML, Tailwind CSS through CDN, JavaScript, ethers.js
- Backend: Node.js, Express, Sequelize
- Database: MySQL / MySQL Workbench
- Blockchain: Solidity, Hardhat, ethers.js, Sepolia test network
- Wallet: MetaMask

## Project Structure

```text
my-crypto/
  contracts/
    CoinFlipGame.sol        Smart contract for ETH coin flips
  scripts/
    deploy.js               Deploys the smart contract to Sepolia
    interact.js             Runs a terminal coin flip against the contract
  index.html                Main coin flip dashboard
  login.html                Login page
  register.html             Registration page
  server.js                 Express API, MySQL models, and blockchain verification
  mysql-schema.sql          Creates the project database
  hardhat.config.js         Hardhat network configuration
  package.json              Project scripts and dependencies
  .env.example              Example environment variables
```

## Requirements

Install these before running the project:

- Node.js and npm
- MySQL Server
- MySQL Workbench
- MetaMask browser extension
- A Sepolia RPC URL, such as from Alchemy or Infura, for live ETH mode
- Sepolia ETH in the player wallet and house/deployer wallet for live testing

## Environment Setup

Create a `.env` file in the project root. You can copy `.env.example` and replace the placeholder values.

```env
API_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_house_wallet_private_key
CONTRACT_ADDRESS=your_deployed_coin_flip_game_contract

DB_HOST=localhost
DB_PORT=3306
DB_NAME=coin_flip_game
DB_USER=root
DB_PASSWORD=your_mysql_password

HOUSE_WALLET_ADDRESS=your_house_wallet_address
ALLOWED_WALLETS=0xAllowedWalletOne,0xAllowedWalletTwo

STARTING_HOUSE_ETH=0.02
```

Important notes:

- Do not commit your real `.env` file.
- `PRIVATE_KEY` should belong to the wallet that deploys and funds the house contract.
- `CONTRACT_ADDRESS` can be left empty for demo mode.
- `ALLOWED_WALLETS` is optional. If it is empty, any valid Ethereum wallet address can play.

## MySQL Setup

Open MySQL Workbench and run:

```sql
CREATE DATABASE IF NOT EXISTS coin_flip_game;
```

You can also run the included file:

```sql
SOURCE mysql-schema.sql;
```

The project uses Sequelize in `server.js`. When the server starts, Sequelize connects to MySQL and creates or updates these tables:

- `Users`: stores registered accounts with email and hashed password values.
- `CoinFlips`: stores the wallet address, wager, choice, result, outcome, payout, transaction hash fields, token symbol, and timestamps for each flip.

## Install Dependencies

From the `my-crypto` folder, run:

```shell
npm install
```

## Run the Web App

Start the Node/Express server:

```shell
npm start
```

Open the app in a browser:

```text
http://localhost:3001
```

The default route opens the login page. Create an account on the registration page, sign in, then use the dashboard to play the coin flip game.

## Demo Mode

Demo mode is the easiest way to present the project without sending real blockchain transactions.

To use demo mode:

1. Configure the MySQL variables in `.env`.
2. Leave `CONTRACT_ADDRESS` empty or unset.
3. Run `npm start`.
4. Register, log in, enter or connect a wallet address, choose heads or tails, enter a wager, and flip.

In this mode, the backend uses Node's crypto utilities to generate a random heads/tails result. The flip is still saved to MySQL, so MySQL Workbench can show the user and coin flip history.

## Live MetaMask ETH Mode

Live mode uses the deployed `CoinFlipGame` smart contract on Sepolia.

To use live mode:

1. Add `API_URL` and `PRIVATE_KEY` to `.env`.
2. Deploy the contract with `npm run deploy`.
3. Copy the printed contract address into `.env` as `CONTRACT_ADDRESS`.
4. Make sure the contract has enough Sepolia ETH to pay winners.
5. Start the app with `npm start`.
6. Open the app in a browser with MetaMask installed.
7. Connect a wallet, choose heads or tails, enter a wager, and confirm the transaction in MetaMask.

When the transaction confirms, the frontend sends the transaction hash to the backend. The backend reads the transaction receipt, checks that it was sent to the configured contract, finds the `CoinFlipped` event, verifies the player wallet, wager, and choice, and then saves the result to MySQL.

## Deploy the Smart Contract

Set these values in `.env`:

```env
API_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_house_wallet_private_key
STARTING_HOUSE_ETH=0.02
```

Then deploy:

```shell
npm run deploy
```

After deployment, copy the printed address into `.env`:

```env
CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

The deployment script funds the contract with `STARTING_HOUSE_ETH`, which becomes the house balance used to pay winning players.

## Flip From the Terminal

After deploying the contract, you can test a contract flip without the website.

Optional `.env` values:

```env
COIN_CHOICE=heads
WAGER_ETH=0.001
```

Run:

```shell
npm run flip
```

The script sends a Sepolia transaction to the smart contract and prints the result, win/loss status, and payout.

## API Overview

`GET /api/game-config`

Returns whether live contract mode is enabled, the contract address, house wallet address, ETH symbol, house balance, and allowed wallet list.

`POST /api/register`

Creates a user account. The password is hashed with bcrypt before being stored.

`POST /api/login`

Checks the submitted email and password against the stored bcrypt hash.

`POST /api/coin-flips`

Creates a coin flip record. In demo mode, the server generates the result. In live mode, the server verifies the MetaMask transaction hash against the smart contract event.

`GET /api/coin-flips`

Returns the 50 most recent coin flips. It can also filter by wallet address using the `walletAddress` query parameter.

## Smart Contract Summary

`contracts/CoinFlipGame.sol` stores the owner address and total number of flips. The main functions are:

- `fundHouse()`: allows ETH to be added to the contract so winners can be paid.
- `flip(bool choiceHeads)`: accepts the player's wager, generates a heads/tails result, pays 2x the wager on a win, and emits a `CoinFlipped` event.
- `withdraw(uint256 amount)`: lets the owner withdraw ETH from the contract.
- `houseBalance()`: returns the contract's ETH balance.

The contract is designed for a class/demo project. The random result uses blockchain values and is acceptable for demonstration, but a production gambling application would need a stronger verifiable randomness source and additional security review.

## Development Checks

Compile the Solidity contract:

```shell
npm run compile
```

There is currently no automated test suite configured. The `npm test` script is still a placeholder.

## Troubleshooting

- Database connection fails: confirm MySQL Server is running and that `.env` has the correct `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- Login or registration fails: check the server terminal for Sequelize or database errors.
- MetaMask is not detected: open the app in a browser where the MetaMask extension is installed and enabled.
- Wallet is rejected: check `ALLOWED_WALLETS` in `.env`, or leave it empty to allow any valid wallet.
- Live flip fails: confirm the wallet has Sepolia ETH for the wager and gas, the contract has enough house balance, and `CONTRACT_ADDRESS` matches the deployed contract.
- Transaction verification fails: make sure the transaction was sent to the configured contract and used the same wallet, wager, and heads/tails choice shown in the dashboard.
