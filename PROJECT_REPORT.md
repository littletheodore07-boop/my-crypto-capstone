# Project Report: Coin Flip Crypto Game

## What the Project Does

Coin Flip Crypto Game is a web application where users can register, log in, connect an Ethereum wallet, and play a heads-or-tails coin flip game. The player chooses heads or tails, enters a wager amount, and flips the coin. The app then records the wallet address, wager, player choice, coin result, win/loss outcome, payout amount, and transaction information.

The project was built to demonstrate how a normal web application can connect to both blockchain tools and a traditional database. The blockchain side handles wallet-based ETH wagering through MetaMask and a Solidity smart contract. The database side keeps a readable history of users and game results that can be viewed in MySQL Workbench.

## Main Parts of the Project

- `login.html` and `register.html`: provide account access for users.
- `index.html`: provides the main coin flip dashboard.
- `server.js`: runs the Express server, API routes, MySQL connection, Sequelize models, authentication, and transaction verification.
- `contracts/CoinFlipGame.sol`: contains the Ethereum smart contract used for live ETH wagers.
- `scripts/deploy.js`: deploys the smart contract to Sepolia.
- `scripts/interact.js`: lets the developer run a coin flip from the terminal.
- `mysql-schema.sql`: creates the MySQL database used by the project.

## How MetaMask Is Used

MetaMask is used as the player's Ethereum wallet. On the dashboard, the user can click the wallet button to connect MetaMask. The frontend uses `window.ethereum` and ethers.js to request the connected account from MetaMask. After MetaMask returns the account, the wallet address is placed into the wallet field and saved in browser local storage for convenience.

When the project is running in live ETH mode, MetaMask is also used to approve and send the wager transaction. The player chooses heads or tails and enters a wager amount. The frontend creates an ethers.js contract object for the deployed `CoinFlipGame` contract and calls the contract's `flip` function. MetaMask then opens a confirmation window so the player can approve the transaction.

After the transaction is mined, the frontend sends the transaction hash to the backend. The backend does not blindly trust the browser. Instead, it checks the transaction receipt through the configured Sepolia RPC provider. It confirms that the transaction went to the correct contract and that the contract emitted a matching `CoinFlipped` event for the same player wallet, wager amount, and heads/tails choice.

If the player wins, the smart contract pays 2x the wager from the contract's house balance. If the player loses, the contract keeps the wager. In both cases, the final result is saved to MySQL.

## How MySQL Is Used

MySQL is used as the project's permanent application database. The database name is `coin_flip_game`. The Node server connects to it using the database settings from the `.env` file:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=coin_flip_game
DB_USER=root
DB_PASSWORD=your_mysql_password
```

The project uses Sequelize to define and manage the database tables. When the server starts, `sequelize.sync({ alter: true })` creates or updates the tables automatically.

The `Users` table stores registered accounts. It saves each user's email and a hashed password. The project uses bcrypt, so the plain password is not stored in the database.

The `CoinFlips` table stores the game history. Each record includes the player's wallet address, wager amount, selected choice, actual coin result, outcome, payout amount, transaction hash fields, token symbol, and timestamps. This makes MySQL the ledger for the website's visible history, while the blockchain remains the source for confirmed live ETH transactions.

## Demo Mode and Live Mode

The project supports two ways to run the game.

In demo mode, `CONTRACT_ADDRESS` is left empty. The server creates a random heads-or-tails result and saves the flip to MySQL. This mode is useful for class presentations because it does not require real Sepolia transactions.

In live mode, `CONTRACT_ADDRESS`, `API_URL`, and `PRIVATE_KEY` are configured. The frontend uses MetaMask to send the wager to the deployed smart contract. The backend verifies the transaction and saves the confirmed blockchain result to MySQL.

## Why Both Blockchain and MySQL Are Needed

MetaMask and the smart contract handle the wallet and ETH transaction side of the project. They prove that a player sent a wager and allow the contract to pay winners directly.

MySQL handles the application record-keeping side. It stores user accounts and makes it easy to review game activity in MySQL Workbench. Without MySQL, the app would not have a simple login system or an easy dashboard history. Without MetaMask and the smart contract, the project would only be a normal simulated coin flip app instead of a crypto-based game.

Together, MetaMask, the Solidity contract, Node.js, and MySQL show how a web application can combine decentralized transactions with a traditional backend database.
