# Coin Flip Game

This project is a coin flip crypto game. A player chooses heads or tails, sends a crypto wager through MetaMask, and wins a 2x payout if the coin lands on their side. The web app also records users and coin flip history in MySQL for viewing in MySQL Workbench.

## Run the Web App

Create the database in MySQL Workbench first:

```sql
CREATE DATABASE IF NOT EXISTS coin_flip_game;
```

Set these database values in `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=coin_flip_game
DB_USER=root
DB_PASSWORD=your_mysql_password
```

Then run:

```shell
npm install
npm start
```

Open:

```text
http://localhost:3001
```

The app stores registered users in the `Users` table and game history in the `CoinFlips` table. Sequelize creates those tables when the server starts.

## MetaMask Betting Mode

For a class demo, you can leave `CONTRACT_ADDRESS` empty and the site will save wallet-tracked flips to MySQL only.

For real MetaMask ETH wagers, deploy the coin flip contract, put its address in `CONTRACT_ADDRESS`, and make sure `HOUSE_WALLET_ADDRESS` matches the wallet controlled by `PRIVATE_KEY`. Winners are paid from the funded contract.

## Deploy the Coin Flip Contract

Set these values in `.env`:

```env
API_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_wallet_private_key
STARTING_HOUSE_ETH=0.02
```

Then deploy:

```shell
npm run deploy
```

Copy the printed `CONTRACT_ADDRESS=...` line into `.env`.

## Flip From the Terminal

Set optional game values in `.env`:

```env
COIN_CHOICE=heads
WAGER_ETH=0.001
```

Then play:

```shell
npm run flip
```

The contract pays `2x` the wager on a win and keeps the wager on a loss.

## Development Checks

```shell
npm run compile
```
