"""
GodWorld.org — QR Store Python Backend
FastAPI application exposing endpoints for item scanning, credit issuance,
and tipping, backed by the QRStore smart contract on Ethereum Sepolia.

Author : Henry Howard Kennemore III
License: CC0 1.0 Universal
"""

from __future__ import annotations

import logging
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from web3 import Web3

load_dotenv()

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

RPC_URL          = os.getenv("SEPOLIA_RPC_URL", "")
CONTRACT_ADDRESS = os.getenv("QRSTORE_ADDRESS", "")
PRIVATE_KEY      = os.getenv("PRIVATE_KEY", "")

# Minimal ABI — only the functions the backend needs to call.
QRSTORE_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "qrHash", "type": "bytes32"},
            {"internalType": "string",  "name": "metadataURI", "type": "string"},
            {"internalType": "uint256", "name": "creditAmount", "type": "uint256"},
        ],
        "name": "scanItem",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32",  "name": "qrHash", "type": "bytes32"},
            {"internalType": "address",  "name": "buyer",  "type": "address"},
        ],
        "name": "issueCredit",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "qrHash", "type": "bytes32"},
        ],
        "name": "tipSeller",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "qrHash", "type": "bytes32"},
        ],
        "name": "getItemRecord",
        "outputs": [
            {
                "components": [
                    {"internalType": "bytes32", "name": "qrHash",       "type": "bytes32"},
                    {"internalType": "address", "name": "seller",        "type": "address"},
                    {"internalType": "string",  "name": "metadataURI",  "type": "string"},
                    {"internalType": "uint256", "name": "creditAmount", "type": "uint256"},
                    {"internalType": "uint256", "name": "scannedAt",    "type": "uint256"},
                    {"internalType": "bool",    "name": "exists",        "type": "bool"},
                ],
                "internalType": "struct QRStore.ItemRecord",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="GodWorld QR Store API",
    description=(
        "Backend for the QR Store© platform. Connects to the QRStore smart "
        "contract on Ethereum Sepolia to scan items, issue credits, and send tips."
    ),
    version="0.1.0",
    license_info={"name": "CC0 1.0 Universal", "url": "https://creativecommons.org/publicdomain/zero/1.0/"},
)

# Lazy-initialise Web3 so the app can start without a live RPC during testing.
_w3: Optional[Web3] = None
_contract = None


def _get_web3() -> Web3:
    global _w3
    if _w3 is None:
        if not RPC_URL:
            raise RuntimeError("SEPOLIA_RPC_URL environment variable not set.")
        _w3 = Web3(Web3.HTTPProvider(RPC_URL))
        if not _w3.is_connected():
            raise RuntimeError(f"Cannot connect to Ethereum node at {RPC_URL}")
    return _w3


def _get_contract():
    global _contract
    if _contract is None:
        w3 = _get_web3()
        if not CONTRACT_ADDRESS:
            raise RuntimeError("QRSTORE_ADDRESS environment variable not set.")
        _contract = w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS),
            abi=QRSTORE_ABI,
        )
    return _contract


def _send_tx(fn, value_wei: int = 0) -> str:
    """Build, sign, and broadcast a transaction; return the tx hash."""
    w3 = _get_web3()
    account = w3.eth.account.from_key(PRIVATE_KEY)
    nonce = w3.eth.get_transaction_count(account.address)

    # Estimate gas and fetch current EIP-1559 fee parameters so the
    # transaction isn't stuck during periods of network congestion.
    gas_estimate = fn.estimate_gas({"from": account.address, "value": value_wei})
    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas", w3.to_wei(1, "gwei"))
    priority_fee = w3.to_wei(1, "gwei")  # 1 gwei tip to miners
    max_fee = base_fee * 2 + priority_fee

    tx = fn.build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "value": value_wei,
            "gas": int(gas_estimate * 1.2),  # 20 % buffer
            "maxFeePerGas": max_fee,
            "maxPriorityFeePerGas": priority_fee,
        }
    )
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()


# ── Request / Response models ─────────────────────────────────────────────────

class ScanRequest(BaseModel):
    qr_payload: str       # Raw QR code string; will be hashed server-side
    metadata_uri: str     # IPFS / Arweave URI
    credit_amount_eth: float  # Credit value in ETH (converted to wei)


class IssueCreditRequest(BaseModel):
    qr_payload: str
    buyer_address: str
    credit_amount_eth: float


class TipRequest(BaseModel):
    qr_payload: str
    tip_amount_eth: float


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "project": "GodWorld QR Store", "version": "0.1.0"}


@app.post("/scan", status_code=status.HTTP_201_CREATED, tags=["items"])
def scan_item(req: ScanRequest):
    """Register a new item on-chain via QRStore.scanItem()."""
    qr_hash = _qr_hash(req.qr_payload)
    credit_wei = Web3.to_wei(req.credit_amount_eth, "ether")
    try:
        contract = _get_contract()
        tx_hash = _send_tx(
            contract.functions.scanItem(qr_hash, req.metadata_uri, credit_wei)
        )
    except Exception as exc:
        logger.exception("scan_item failed for qr_payload=%s", req.qr_payload)
        raise HTTPException(status_code=500, detail="Failed to register item on-chain. Please try again.") from exc
    return {"qr_hash": qr_hash.hex(), "tx_hash": tx_hash}


@app.get("/items/{qr_payload}", tags=["items"])
def get_item(qr_payload: str):
    """Fetch an item record from the blockchain."""
    qr_hash = _qr_hash(qr_payload)
    try:
        record = _get_contract().functions.getItemRecord(qr_hash).call()
    except Exception as exc:
        logger.exception("get_item failed for qr_payload=%s", qr_payload)
        raise HTTPException(status_code=404, detail="Item not found.") from exc
    return {
        "qr_hash":       "0x" + record[0].hex(),
        "seller":        record[1],
        "metadata_uri":  record[2],
        "credit_amount": Web3.from_wei(record[3], "ether"),
        "scanned_at":    record[4],
    }


@app.post("/credit", tags=["credits"])
def issue_credit(req: IssueCreditRequest):
    """Issue a credit to a buyer via QRStore.issueCredit()."""
    qr_hash = _qr_hash(req.qr_payload)
    credit_wei = Web3.to_wei(req.credit_amount_eth, "ether")
    try:
        contract = _get_contract()
        tx_hash = _send_tx(
            contract.functions.issueCredit(
                qr_hash,
                Web3.to_checksum_address(req.buyer_address),
            ),
            value_wei=credit_wei,
        )
    except Exception as exc:
        logger.exception("issue_credit failed for qr_payload=%s buyer=%s", req.qr_payload, req.buyer_address)
        raise HTTPException(status_code=500, detail="Failed to issue credit on-chain. Please try again.") from exc
    return {"tx_hash": tx_hash}


@app.post("/tip", tags=["tips"])
def tip_seller(req: TipRequest):
    """Send an optional tip to the item seller via QRStore.tipSeller()."""
    qr_hash = _qr_hash(req.qr_payload)
    tip_wei = Web3.to_wei(req.tip_amount_eth, "ether")
    try:
        contract = _get_contract()
        tx_hash = _send_tx(
            contract.functions.tipSeller(qr_hash),
            value_wei=tip_wei,
        )
    except Exception as exc:
        logger.exception("tip_seller failed for qr_payload=%s", req.qr_payload)
        raise HTTPException(status_code=500, detail="Failed to send tip on-chain. Please try again.") from exc
    return {"tx_hash": tx_hash}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _qr_hash(qr_payload: str) -> bytes:
    """Convert a raw QR string to the bytes32 used on-chain (keccak256)."""
    return Web3.keccak(text=qr_payload)
