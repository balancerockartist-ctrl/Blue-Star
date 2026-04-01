# GodWorld Architecture — Technical Notes

## System Overview

```
User scans QR  ──►  QR Store© front-end  ──►  FastAPI backend
                                                    │
                                         ┌──────────┴──────────┐
                                         │                      │
                                  QRStore.sol               PostgreSQL
                                (Ethereum Sepolia)           G.L.S. Index
                                         │                      │
                                         └──────────┬──────────┘
                                                    │
                                            AI Demand Agent
                                        (G.O.S.© allocation)
```

## Components

| Component | File(s) | Description |
|-----------|---------|-------------|
| Smart contract | `contracts/QRStore.sol` | Solidity — item registry, credit issuance, tipping |
| Deployment script | `scripts/deploy.js` | Hardhat — targets Sepolia testnet |
| Python backend | `backend/main.py` | FastAPI — bridges web requests to on-chain calls |
| Database schema | `db/schema.sql` | PostgreSQL — items, credits, tips, GLS index |
| CI pipeline | `.github/workflows/main.yml` | Compiles and tests the smart contract on every push |

## Testnet Details

- **Network:** Ethereum Sepolia (`chainId: 11155111`)
- **Faucet:** https://sepoliafaucet.com
- **Block explorer:** https://sepolia.etherscan.io

## Data Flow

1. A user scans a product QR code on their phone.
2. The front-end calls `POST /scan` on the FastAPI backend.
3. The backend hashes the QR payload (`keccak256`) and calls `QRStore.scanItem()` on Sepolia.
4. The on-chain record is confirmed; `ItemScanned` event is emitted.
5. The backend writes item metadata to the PostgreSQL `items` table and the `gls_index`.
6. The AI demand agent reads `gls_index` and updates `demand_score` for the relevant region/category.
7. A buyer can redeem their credit via `POST /credit` → `QRStore.issueCredit()`.
8. An optional tip flows through `POST /tip` → `QRStore.tipSeller()` (ETH forwarded directly to seller).
