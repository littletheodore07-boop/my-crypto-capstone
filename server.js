const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const { ethers } = require('ethers');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- 1. Blockchain Setup ---
function hasUsablePrivateKey(value) {
    return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value.trim());
}

const provider = process.env.API_URL
    ? new ethers.providers.JsonRpcProvider(process.env.API_URL)
    : null;
const wallet = hasUsablePrivateKey(process.env.PRIVATE_KEY) && provider
    ? new ethers.Wallet(process.env.PRIVATE_KEY.trim(), provider)
    : null;
const contractAddress = normalizeAddress(process.env.CONTRACT_ADDRESS || process.env.TOKEN_CONTRACT_ADDRESS);
const houseWalletAddress = process.env.HOUSE_WALLET_ADDRESS || (wallet ? wallet.address : null);
const allowedWallets = (process.env.ALLOWED_WALLETS || '')
    .split(',')
    .map(address => normalizeAddress(address.trim()))
    .filter(Boolean);

const coinFlipAbi = [
    "function flip(bool choiceHeads) payable",
    "function houseBalance() view returns (uint256)",
    "event CoinFlipped(address indexed player, uint256 wager, bool choiceHeads, bool resultHeads, bool won, uint256 payout)"
];
const coinFlipInterface = new ethers.utils.Interface(coinFlipAbi);
const coinFlipContract = contractAddress && provider
    ? new ethers.Contract(contractAddress, coinFlipAbi, provider)
    : null;

function normalizeAddress(address) {
    if (!address || !ethers.utils.isAddress(address)) {
        return null;
    }

    return ethers.utils.getAddress(address);
}

// --- 2. Database Connection ---
const sequelize = new Sequelize(
    process.env.DB_NAME || process.env.DB_DATABASE,
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false 
    }
);

// --- 3. Database Models ---
const User = sequelize.define('User', {
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.TEXT, allowNull: false }
});

const CoinFlip = sequelize.define('CoinFlip', {
    walletAddress: { type: DataTypes.STRING, allowNull: false },
    wagerAmount: { type: DataTypes.DECIMAL(24, 8), allowNull: false },
    choice: { type: DataTypes.STRING, allowNull: false },
    result: { type: DataTypes.STRING, allowNull: false },
    outcome: { type: DataTypes.STRING, allowNull: false },
    payoutAmount: { type: DataTypes.DECIMAL(24, 8), allowNull: false },
    wagerTxHash: { type: DataTypes.STRING, allowNull: true },
    payoutTxHash: { type: DataTypes.STRING, allowNull: true },
    tokenSymbol: { type: DataTypes.STRING, allowNull: true }
});

function isAllowedWallet(address) {
    return allowedWallets.length === 0 || allowedWallets.some(allowed => {
        return allowed.toLowerCase() === address.toLowerCase();
    });
}

async function getGameInfo() {
    const houseBalance = coinFlipContract
        ? ethers.utils.formatEther(await coinFlipContract.houseBalance())
        : "0";

    return {
        enabled: Boolean(coinFlipContract),
        contractAddress,
        houseWalletAddress: normalizeAddress(houseWalletAddress),
        symbol: 'ETH',
        decimals: 18,
        houseBalance,
        allowedWallets
    };
}

async function verifyCoinFlipTransaction({ txHash, from, wager, choice }) {
    if (!txHash) {
        throw new Error("Coin flip transaction hash is required.");
    }

    if (!coinFlipContract) {
        throw new Error("CONTRACT_ADDRESS and API_URL must be configured for live ETH wagers.");
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
        throw new Error("Coin flip transaction was not confirmed.");
    }

    if (!receipt.to || normalizeAddress(receipt.to) !== contractAddress) {
        throw new Error("Transaction was not sent to the configured CoinFlipGame contract.");
    }

    const wagerWei = ethers.utils.parseEther(wager.toString());
    for (const log of receipt.logs) {
        if (normalizeAddress(log.address) !== contractAddress) {
            continue;
        }

        let parsed;
        try {
            parsed = coinFlipInterface.parseLog(log);
        } catch (error) {
            continue;
        }

        if (parsed.name !== 'CoinFlipped') {
            continue;
        }

        const eventPlayer = normalizeAddress(parsed.args.player);
        const eventChoice = parsed.args.choiceHeads ? 'heads' : 'tails';
        if (
            eventPlayer !== from ||
            eventChoice !== choice ||
            !parsed.args.wager.eq(wagerWei)
        ) {
            continue;
        }

        return {
            result: parsed.args.resultHeads ? 'heads' : 'tails',
            outcome: parsed.args.won ? 'win' : 'loss',
            payoutAmount: ethers.utils.formatEther(parsed.args.payout),
            txHash: receipt.transactionHash
        };
    }

    throw new Error("Could not find a matching CoinFlipped event for that transaction.");
}

function createDemoFlip(wager, choice) {
    const result = crypto.randomInt(2) === 0 ? 'heads' : 'tails';
    const didWin = choice === result;

    return {
        result,
        outcome: didWin ? 'win' : 'loss',
        payoutAmount: didWin ? (wager * 2).toFixed(8) : '0.00000000',
        txHash: null
    };
}

// --- 4. API Routes: Coin Flip Game ---
app.get('/api/game-config', async (req, res) => {
    try {
        const gameInfo = await getGameInfo();
        res.json(gameInfo);
    } catch (error) {
        res.status(500).json({ success: false, error: "Could not load game settings" });
    }
});

app.post('/api/coin-flips', async (req, res) => {
    try {
        const { walletAddress, wagerAmount, choice, wagerTxHash } = req.body;
        const normalizedWalletAddress = normalizeAddress(walletAddress);
        const wager = Number(wagerAmount);
        const normalizedChoice = String(choice || '').trim().toLowerCase();
        const gameInfo = await getGameInfo();

        if (!normalizedWalletAddress) {
            return res.status(400).json({ success: false, error: "Enter a valid Ethereum wallet address." });
        }

        if (!isAllowedWallet(normalizedWalletAddress)) {
            return res.status(403).json({ success: false, error: "This wallet is not allowed to play this demo." });
        }

        if (!Number.isFinite(wager) || wager <= 0) {
            return res.status(400).json({ success: false, error: "Enter a wager amount greater than 0." });
        }

        if (wager > 1000000) {
            return res.status(400).json({ success: false, error: "Wager amount is too large for this demo." });
        }

        if (!['heads', 'tails'].includes(normalizedChoice)) {
            return res.status(400).json({ success: false, error: "Choose heads or tails." });
        }

        const chainResult = gameInfo.enabled
            ? await verifyCoinFlipTransaction({
                txHash: wagerTxHash,
                from: normalizedWalletAddress,
                wager,
                choice: normalizedChoice
            })
            : createDemoFlip(wager, normalizedChoice);

        const flip = await CoinFlip.create({
            walletAddress: normalizedWalletAddress,
            wagerAmount: wager.toFixed(8),
            choice: normalizedChoice,
            result: chainResult.result,
            outcome: chainResult.outcome,
            payoutAmount: Number(chainResult.payoutAmount).toFixed(8),
            wagerTxHash: chainResult.txHash,
            payoutTxHash: chainResult.outcome === 'win' ? chainResult.txHash : null,
            tokenSymbol: gameInfo.symbol
        });

        res.status(201).json({ success: true, flip });
    } catch (error) {
        console.error("Coin flip failed:", error);
        res.status(500).json({ success: false, error: "Coin flip failed" });
    }
});

app.get('/api/coin-flips', async (req, res) => {
    try {
        const { walletAddress } = req.query;
        const where = {};

        if (walletAddress) {
            const normalizedWalletAddress = normalizeAddress(walletAddress);
            if (!normalizedWalletAddress) {
                return res.status(400).json({ success: false, error: "Invalid wallet address" });
            }

            where.walletAddress = normalizedWalletAddress;
        }

        const flips = await CoinFlip.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.json(flips);
    } catch (error) {
        res.status(500).json({ success: false, error: "Could not load coin flips" });
    }
});

// --- 5. API Routes: Authentication (Security Layer) ---
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and password are required." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        await User.create({ 
            email: email, 
            password_hash: hashedPassword 
        });
        
        res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, error: "An account with that email already exists." });
        }

        res.status(500).json({ success: false, error: "Registration failed." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and password are required." });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (isMatch) {
            res.json({ success: true, message: "Access Granted", user: { email: user.email } });
        } else {
            res.status(401).json({ success: false, error: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Login error" });
    }
});

// --- 6. Static File Serving ---
// This handles the "Front Door"
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

// This handles the redirect from register.html
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

// This handles the Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// --- 7. The Engine ---
sequelize.sync({ alter: true }).then(() => {
    console.log("Coin Flip ledger synchronized.");
    app.listen(PORT, () => console.log(`Coin flip server active at http://localhost:${PORT}`));
}).catch(err => {
    console.error("Database sync failed:", err);
});
