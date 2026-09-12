# Implementation Plan: Crypto Fraud Attribution System (CFAS)

## Goal
Build a full-stack hackathon prototype of the Real-Time Crypto Fraud Attribution System based on the [PRD v3.0](file:///e:/Ali/Crypto/PRD_Crypto_Fraud_Attribution_Prototype.md). The system traces crypto scam wallets to destination exchanges, generates legal freeze notices, and visualizes fund-flow graphs for Indian law enforcement.

## Tech Stack Decision

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | **FastAPI (Python 3.11+)** | Async, fast, auto-generates OpenAPI docs, perfect for hackathon |
| **Database** | **SQLite** (via SQLAlchemy) | Zero setup, portable, sufficient for prototype (schema mapped from PRD's PostgreSQL) |
| **Frontend** | **React + Vite** | Fast HMR, modern tooling |
| **Graph Viz** | **React Flow** | Best interactive DAG library for fund-flow visualization |
| **Styling** | **Vanilla CSS** (Dark Cyberpunk LEA theme) | Full control, premium aesthetic |
| **PDF Reports** | **ReportLab** (Python) | Pure Python PDF generation, no headless browser needed |
| **Auth** | **JWT (python-jose + bcrypt)** | Simple, stateless auth tokens |

> [!IMPORTANT]
> Using SQLite instead of PostgreSQL for zero-dependency hackathon portability. The schema maps 1:1 — swapping to Postgres later is a config change.

## Proposed Changes

### Phase 1: Backend Core Engine

#### [NEW] `backend/` — FastAPI Backend Structure
```
backend/
├── main.py                    # FastAPI app, CORS, routers
├── requirements.txt           # Dependencies
├── database.py                # SQLAlchemy engine + session
├── models.py                  # SQLAlchemy ORM models (all 12 tables from PRD §6)
├── seed_data.py               # Seeds VASP directory, mixer/bridge list, demo cases
├── auth/
│   ├── router.py              # POST /login, GET /me
│   └── utils.py               # JWT creation, password hashing, role checks
├── routers/
│   ├── complaints.py          # POST /api/v1/complaints (NCRP ingestion)
│   ├── traces.py              # POST /api/v1/cases/{id}/trace (tracing engine)
│   ├── graphs.py              # GET /api/v1/cases/{id}/graph (visualization data)
│   ├── cases.py               # GET/PUT cases, GET related/syndicate
│   ├── alerts.py              # GET /api/v1/alerts
│   ├── vasp.py                # CRUD /api/v1/vasp-directory
│   ├── notices.py             # POST generate-freeze-notice (Sec 94 BNSS)
│   ├── reports.py             # POST generate-court-report (Sec 63 BSA)
│   └── dashboard.py           # GET /api/v1/dashboard/stats
├── services/
│   ├── blockchain/
│   │   ├── tron.py            # TronGrid TRC-20 USDT fetcher
│   │   ├── ethereum.py        # Etherscan ERC-20 fetcher
│   │   ├── bsc.py             # BscScan BEP-20 fetcher
│   │   └── bitcoin.py         # Blockstream BTC fetcher
│   ├── tracer.py              # Value-weighted BFS forward tracing engine
│   ├── attribution.py         # 3-tier VASP attribution logic
│   ├── risk_scoring.py        # Composite risk formula (0–100)
│   ├── correlation.py         # Cross-complaint syndicate detection
│   ├── typology.py            # Fraud typology classifier (heuristic)
│   └── report_generator.py    # PDF generation (legal notices + forensic reports)
└── cfas.db                    # SQLite database (auto-created)
```

---

### Phase 2: React Frontend

#### [NEW] `frontend/` — Vite + React SPA
```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx
│   ├── App.jsx                # Router + layout
│   ├── index.css              # Global dark cyberpunk design system
│   ├── api.js                 # Axios instance + JWT interceptor
│   ├── context/AuthContext.jsx # Auth state management
│   ├── pages/
│   │   ├── LoginPage.jsx              # Screen 1
│   │   ├── DashboardPage.jsx          # Screen 2 (cases + metrics)
│   │   ├── NewTracePage.jsx           # Screen 3 (wallet input + complaint sim)
│   │   ├── TraceResultsPage.jsx       # Screen 4 (MASTER — graph + attribution)
│   │   ├── FreezeNoticePage.jsx       # Screen 5 (Sec 94 BNSS generator)
│   │   ├── VaspDirectoryPage.jsx      # Screen 8 (VASP CRUD)
│   │   └── AdminDashboardPage.jsx     # Screen 7 (analytics)
│   └── components/
│       ├── Navbar.jsx
│       ├── AlertBell.jsx
│       ├── FlowGraph.jsx              # React Flow DAG visualization
│       ├── RiskGauge.jsx              # Animated risk score gauge
│       ├── AttributionBanner.jsx      # VASP match headline
│       ├── SyndicatePanel.jsx         # Linked complaints panel
│       ├── TransactionTable.jsx       # Raw tx evidence table
│       └── CaseCard.jsx              # Dashboard case card
```

---

## Key Implementation Details

### Tracing Engine (Critical Path)
- Implements value-weighted BFS from PRD §3 FR-2.2
- Calls real blockchain APIs (TronGrid for TRC-20, Etherscan for ERC-20)
- Stops at VASP terminal nodes, flags mixer/bridge hops
- Caches API responses in SQLite for 6-hour TTL
- Falls back to demo seed data if API rate-limited

### VASP Attribution (3-Tier)
- Tier 1: Direct match against `vasp_addresses` table
- Tier 2: Check 1-hop outgoing sweep to known VASP hot wallet
- Tier 3: Cluster heuristic — ≥2 complaints sharing same destination

### Seed Data (Guaranteed Demo)
- 15+ real Indian FIU-IND exchange entries (CoinDCX, WazirX, CoinSwitch, ZebPay)
- 20+ global exchanges (Binance, OKX, KuCoin, Bybit)
- 10+ known mixer/bridge contracts (Tornado Cash, Stargate)
- 5 pre-configured demo complaint scenarios with deterministic trace paths

### Legal Document Generation
- Section 94 BNSS freeze notice: pre-filled PDF with officer, FIR, VASP nodal contact
- Section 63 BSA forensic report: full trace timeline + SHA-256 content hash

## Verification Plan

### Automated Tests
- `curl` / Postman tests against all API endpoints
- Verify trace engine returns correct VASP attribution on seeded demo wallets

### Manual Verification
- Run full demo flow: Simulate NCRP complaint → Auto trace → Graph renders → Generate freeze notice → Download report
- Verify PDF outputs contain correct SHA-256 hashes
- Test login for all 3 roles (investigator, analyst, admin)

## Open Questions

> [!IMPORTANT]
> **Blockchain API Keys:** Do you have Etherscan / BscScan / TronGrid API keys? Free tier keys are needed for real blockchain data. If not, I'll build the system with **synthetic demo data that works perfectly without any API keys**, and you can plug in keys later.

