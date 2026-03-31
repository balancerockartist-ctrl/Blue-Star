# Architecture Overview

## System Components

### QR Store©
The user-facing interface that generates dynamic QR codes linked to items for sale. Each QR code opens the hosting platform and invokes the Google Lens integration.

### G.L.S.© — Godworld.org Logistics Systems
The data layer that stores all Google Lens transaction data. It acts as the global supply and demand ledger.

### G.O.S.© — Global Operating Systems
The AI agentic orchestration layer that manages interactions between the QR Store, G.L.S., and end users.

## Data Flow

```
User scans QR code
      │
      ▼
Hosting Platform opens
      │
      ▼
Google Lens captures item
      │
      ├──► Credit issued to buyer
      │
      ├──► Tipping option presented
      │
      └──► Transaction stored in G.L.S.©
```
