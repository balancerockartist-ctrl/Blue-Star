require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // ── Local development ────────────────────────────────────────────────────
    hardhat: {},

    // ── Ethereum Sepolia testnet ─────────────────────────────────────────────
    // Set SEPOLIA_RPC_URL and PRIVATE_KEY in your .env file (never commit them).
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },

    // ── Polygon Mumbai testnet (alternative) ────────────────────────────────
    // Set MUMBAI_RPC_URL in your .env file to use this network instead.
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
    },
  },

  // ── Etherscan verification ───────────────────────────────────────────────
  // Set ETHERSCAN_API_KEY in your .env file to enable `hardhat verify`.
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};
