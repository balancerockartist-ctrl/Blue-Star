-- GodWorld.org · QR Store · PostgreSQL Database Schema
-- Author : Henry Howard Kennemore III
-- License: CC0 1.0 Universal
-- Apply with: psql -d godworld -f schema.sql

BEGIN;

-- ── items ─────────────────────────────────────────────────────────────────────
-- Every item scanned via a QR code gets a row here.
CREATE TABLE IF NOT EXISTS items (
    id          BIGSERIAL    PRIMARY KEY,
    qr_hash     CHAR(66)     NOT NULL UNIQUE,  -- "0x" + 64 hex chars (keccak256)
    image_url   TEXT,                           -- Google Lens / IPFS image URI
    description TEXT,
    seller_addr CHAR(42),                       -- Ethereum address of seller
    credit_wei  NUMERIC(78)  NOT NULL DEFAULT 0,
    tx_hash     CHAR(66),                       -- on-chain scanItem() tx hash
    scanned_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── credits ───────────────────────────────────────────────────────────────────
-- Track every credit issuance event (issueCredit on-chain).
CREATE TABLE IF NOT EXISTS credits (
    id           BIGSERIAL    PRIMARY KEY,
    item_id      BIGINT       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    buyer_addr   CHAR(42)     NOT NULL,
    amount_wei   NUMERIC(78)  NOT NULL,
    tx_hash      CHAR(66),
    issued_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── tips ──────────────────────────────────────────────────────────────────────
-- Optional tips sent by buyers to sellers (tipSeller on-chain).
CREATE TABLE IF NOT EXISTS tips (
    id           BIGSERIAL    PRIMARY KEY,
    item_id      BIGINT       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    buyer_addr   CHAR(42)     NOT NULL,
    seller_addr  CHAR(42)     NOT NULL,
    amount_wei   NUMERIC(78)  NOT NULL,
    tx_hash      CHAR(66),
    sent_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── gls_index ─────────────────────────────────────────────────────────────────
-- G.L.S. (GodWorld Logistics Systems) demand-scoring index.
-- AI agents update demand_score based on scan frequency and regional need.
CREATE TABLE IF NOT EXISTS gls_index (
    id           BIGSERIAL    PRIMARY KEY,
    item_id      BIGINT       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    region       VARCHAR(100),                  -- e.g. "Sub-Saharan Africa"
    category     VARCHAR(100),                  -- e.g. "Food", "Clothing", "Shelter"
    demand_score NUMERIC(10,4) NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_credits_buyer   ON credits(buyer_addr);
CREATE INDEX IF NOT EXISTS idx_tips_seller     ON tips(seller_addr);
CREATE INDEX IF NOT EXISTS idx_gls_region      ON gls_index(region);
CREATE INDEX IF NOT EXISTS idx_gls_category    ON gls_index(category);
CREATE INDEX IF NOT EXISTS idx_gls_score       ON gls_index(demand_score DESC);

COMMIT;
