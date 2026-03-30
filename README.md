# Blue-Star — Quantum Economics Platform

> **Author:** Henry Howard Kennemore III  
> **Vision:** Feed, clothe, and shelter everyone on the planet through an AI-driven quantum economics ecosystem.

---

## Overview

Blue-Star is the code scaffolding for the **Global Operating System (G.O.S.)** — an AI-agentic platform that connects:

| Component | Purpose |
|-----------|---------|
| **QR Store©** | Scan any item with Google Lens → issue a credit + tipping option instantly |
| **G.L.S.©** (Godworld Logistics Systems) | On-chain supply & demand chain built from Google Lens scan data |
| **G.O.S.©** (Global Operating Systems) | AI-agentic orchestration layer powered by Claude AI |
| **Smart Contract Layer** | Solidity contracts for credits, logistics records, and QR Store settlements |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Express.js API Server           │
│  /api/economic  /api/contracts               │
│  /api/qrstore   /api/agent                   │
└────────────┬────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌────────┐     ┌────────────────┐
│Claude  │     │  ethers.js v6  │
│ Agent  │     │  (blockchain)  │
└────────┘     └────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
     QRStore.sol  CreditSystem  GLSLogistics
      (Solidity)    .sol          .sol
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# → Set ANTHROPIC_API_KEY, BLOCKCHAIN_RPC_URL, DEPLOYER_PRIVATE_KEY

# 3. Start the development server
npm run dev

# 4. Run tests
npm test
```

---

## API Endpoints

### Economic Model — `/api/economic`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/model` | Describe the quantum economics model |
| POST | `/credit/issue` | Issue credit for a scanned item |
| POST | `/supply-demand` | Query supply/demand snapshot for a category |
| GET | `/metrics` | Platform-wide economic metrics |

### Smart Contracts — `/api/contracts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/list` | List supported contracts |
| POST | `/deploy` | Deploy a named contract to the configured network |
| POST | `/call` | Call a read-only contract method |
| POST | `/send` | Send a state-changing transaction |
| GET | `/:name/abi` | Fetch the ABI for a named contract |

### QR Store — `/api/qrstore`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/scan` | Submit scanned item data → issue credit |
| POST | `/tip` | Add a tip to an existing transaction |
| GET | `/transaction/:txId` | Fetch a QR Store transaction |
| GET | `/inventory` | List items available via the QR Store |

### AI Agent — `/api/agent`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/run` | Run a free-form agentic task via Claude |
| POST | `/scaffold` | Generate a smart contract, API layer, or economic model |
| GET | `/tasks` | List recent agent task results |
| GET | `/tasks/:id` | Fetch a specific task result |

#### Scaffold example — spin up a new smart contract layer in seconds:
```json
POST /api/agent/scaffold
{
  "type": "smart-contract",
  "description": "An NFT contract for QR Store item receipts with royalty support",
  "options": { "standards": ["ERC-721", "ERC-2981"] }
}
```

#### Scaffold example — generate API endpoints for a new economic model:
```json
POST /api/agent/scaffold
{
  "type": "api-endpoints",
  "description": "CRUD endpoints for a peer-to-peer credit exchange market",
  "options": { "resourceName": "CreditExchange" }
}
```

---

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `QRStore.sol` | Records item scans, issues credits, accepts tips |
| `CreditSystem.sol` | ERC-20-compatible Blue-Star Credit (BSC) token |
| `GLSLogistics.sol` | On-chain supply/demand registry for the G.L.S. chain |

Compile contracts:
```bash
npm run compile-contracts
# Outputs ABI + bytecode to artifacts/
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list.

Key variables:
- `ANTHROPIC_API_KEY` — Claude AI API key
- `BLOCKCHAIN_RPC_URL` — EVM JSON-RPC endpoint
- `DEPLOYER_PRIVATE_KEY` — Wallet private key for contract deployment

---

*QR Store©, G.L.S.©, and G.O.S.© are concepts by Henry Howard Kennemore III.*

