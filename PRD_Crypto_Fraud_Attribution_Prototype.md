# Product Requirements Document (PRD)
## Real-Time Crypto Fraud Attribution System (CFAS) — Hackathon Edition

**Document Version:** 3.0 (Comprehensive Hackathon & Production Blueprint)  
**Status:** Approved for Development  
**Target:** Hackathon-Grade Functional Build / Working Prototype for LEA Deployment  
**Domain:** Blockchain Forensics, Cybercrime Investigation, Law Enforcement Tech (I4C / NCRP / SAHYOG)  
**Last Updated:** August 27, 2026  

---

## 0. Executive Summary & Problem Statement Alignment

### 0.1 Problem Statement Breakdown
Cyber fraud victims frequently report cryptocurrency wallet addresses used by fraudsters across investment scams, task-based frauds, sextortion, ransomware, phishing, and organized cyber syndicates.
- **The Core Investigation Bottleneck:** Reported wallets are non-custodial or temporary burner/mule wallets used for rapid layering. Delays in finding the receiving **Exchange / VASP (Virtual Asset Service Provider)** prevent timely asset freezing, evidence preservation, and fund recovery.
- **Technical Complexity:** Fraudsters exploit multi-chain routes (especially TRC-20 USDT, ERC-20, BSC), DeFi bridges, mixers, peeling chains, and rapid automated dispersal.
- **The Proposed Solution:** An automated, real-time **Crypto Fraud Attribution System (CFAS)** that ingests victim complaints, traces on-chain fund flows across chains/tokens, identifies the terminal VASP/exchange (specifically distinguishing **FIU-IND registered entities** for rapid legal action), detects fraud movement patterns using AI/ML & heuristics, cross-correlates multi-victim syndicates, and generates statutory freeze requisitions (**Section 91 CrPC / Section 94 BNSS**) and court-admissible digital forensics reports (**Section 65B IEA / Section 63 BSA**).

---

## 1. Prototype Scope & Architecture Matrix

### 1.1 What the Prototype Proves (Live Demo Capabilities)
1. **Multi-Chain & Token-Aware Ingestion:** Ingests suspect addresses (BTC, ETH, TRON, BSC, Polygon) with native coin and **Token support (USDT TRC-20/ERC-20/BEP-20)** via manual input or simulated **NCRP / 1930 / SAHYOG** complaint payloads.
2. **Intelligent Forward Tracing Engine:** Performs automated, value-weighted BFS forward tracing to identify fund destinations, detecting layering patterns (peeling chains, rapid dispersal).
3. **Hierarchical VASP Attribution:** Identifies terminal exchange wallets across 3 tiers (Direct Hot Wallet, 1-Hop Sweep Consolidation, Cluster Heuristics) with confidence scoring, tagging **FIU-IND compliance status** (CoinDCX, WazirX, CoinSwitch, ZebPay, Binance India, etc.).
4. **Mixer, Bridge & Cross-Chain Detection:** Flags privacy protocols (Tornado Cash, Railgun) and cross-chain bridges/swaps (Stargate, Thorchain, FixedFloat) with cross-chain hop continuity.
5. **AI/ML Fraud Typology & Risk Engine:** Classifies scam narratives (Task fraud, Investment Ponzi, Digital Arrest) via NLP/LLM and computes a composite on-chain risk score (0–100).
6. **Syndicate & Mule Network Correlation:** Graph intersection detecting shared mule wallets and cluster infrastructure across multiple NCRP complaints.
7. **Actionable Legal Freeze & Evidentiary Reports:** 1-Click generation of statutory freeze requisitions (**Sec 91/94 BNSS Notice**) and tamper-evident forensic PDF reports with SHA-256 digital certificate (**Sec 65B/63 BSA**).
8. **Live Investigator Dashboard & Real-Time Alerts:** Interactive Cytoscape/React-Flow visualization, real-time tracing logs (SSE/WebSocket), and priority toast/bell alerts upon VASP detection.

### 1.2 Real vs. Mocked System Matrix

| Component | Prototype Status | Production / Live Detail |
|---|---|---|
| **Blockchain Data (Native & Tokens)** | 🟢 REAL | Live public APIs (Etherscan, TronGrid, BscScan, Blockstream) fetching native and ERC20/TRC20/BEP20 token transfers. |
| **Token Parsing (USDT/USDC)** | 🟢 REAL | Real smart contract `Transfer` event decoding on TRON (TRC-20) and EVM chains. |
| **Graph Traversal & Peeling Logic** | 🟢 REAL | Graph BFS prioritizing transaction paths matching reported loss amount and timestamp. |
| **VASP Address Intelligence** | 🟢 HYBRID REAL | Curated seed database of 300+ known exchange deposit & hot wallets (Binance, CoinDCX, WazirX, KuCoin, OKX, Bybit) + 5 synthetic testnet/demo wallets for guaranteed live demo runs. |
| **Mixer & Bridge Detection** | 🟢 HYBRID REAL | Real contract matching for known mixers (Tornado Cash, etc.) + synthetic cross-chain bridge hop for demo certainty. |
| **NCRP / SAHYOG Ingestion** | 🟡 SIMULATED API | REST endpoint accepting authentic NCRP/1930 JSON schema + Admin "Simulate Complaint" GUI. |
| **AI/ML Typology Classifier** | 🟢 REAL (Hybrid) | Zero-shot NLP / LLM classifier for complaint text + deterministic on-chain structural pattern classifier. |
| **Syndicate Correlation** | 🟢 REAL | Real graph intersection query over case database finding shared intermediary wallets. |
| **Legal Notice Generator (Sec 91/94 BNSS)** | 🟢 REAL | Automated pre-filled formal legal notice PDF with statutory officer fields and designated VASP nodal emails. |
| **Court Evidence Certificate (Sec 65B/63 BSA)** | 🟢 REAL | PDF report embedded with SHA-256 hash, timestamp, API source provenance, and forensic integrity seal. |
| **Alert Delivery** | 🟢 HYBRID | In-app real-time banner & sound alert + simulated SMS/WhatsApp dispatch toast. |
| **Authentication & RBAC** | 🟢 REAL | JWT-based auth with `Investigator`, `Cyber Cell Analyst`, and `Admin` roles. |

---

## 2. User Personas & Workflows

### 2.1 Persona 1: Investigating Officer (IO) / Cyber Police Station
- **Profile:** Non-technical police officer handling urgent 1930 / NCRP complaints.
- **Pain Point:** Cannot read raw blockchain hex or understand bridge transactions; needs to know *which exchange has the funds* and *how to freeze them immediately* before cash-out.
- **Key Need:** Input victim wallet -> Get Exchange Name + Confidence + 1-Click Freeze Notice.

### 2.2 Persona 2: Cyber Crime Intelligence Analyst
- **Profile:** Technical investigator mapping cyber syndicates, Chinese task-scam rings, and mule networks.
- **Pain Point:** Manual tracing takes hours per wallet; missing connections between separate FIRs/complaints.
- **Key Need:** Interactive graph visualizer, multi-hop peeling chain analysis, syndicate correlation engine.

### 2.3 Persona 3: System Admin / Nodal Officer
- **Profile:** Supervises agency-wide metrics, updates VASP nodal directory, inspects audit logs.
- **Key Need:** Analytics dashboard (cases by fraud type, total funds tracked, top destination VASPs), VASP database manager.

---

## 3. Functional Requirements (Detailed Specifications)

### FR-1: Multi-Chain & Token-Aware Wallet Ingestion 🟢

#### FR-1.1 Address Validation & Chain Auto-Detection
The system validates and auto-detects chain ecosystems using strict regex and checksum rules:
- **TRON (TRC-20):** `^T[a-zA-Z0-9]{33}$` (Base58check, validates TRX & TRC-20 tokens like USDT).
- **Ethereum / EVM (ETH, BSC, Polygon):** `^0x[a-fA-F0-9]{40}$` (ERC-20 / BEP-20 USDT/USDC).
- **Bitcoin (BTC):** `^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$` (Legacy, SegWit, Bech32).
- **Solana (SOL):** `^[1-9A-HJ-NP-Za-km-z]{32,44}$` (Optional stretch, Base58).

#### FR-1.2 Token-First Architecture
> [!IMPORTANT]
> **Critical Technical Reality:** Over 90% of cyber scam funds in India (Task frauds, fake trading apps) move via **USDT (Tether)** on TRON (TRC-20) and BSC/Ethereum. The ingestion engine MUST parse both native currency transfers AND Smart Contract Token transfers (`Transfer` event logs).

#### FR-1.3 Simulated NCRP / 1930 / SAHYOG API Ingestion
- Endpoint: `POST /api/v1/complaints` (conforms to National Cyber Crime Reporting Portal structure).
- Form-based "Simulate 1930 / NCRP Complaint" UI utility for instant live demonstration.

---

### FR-2: Intelligent Forward Tracing Engine 🟢

#### FR-2.1 Value-Weighted & Chronological BFS Traversal
Traditional BFS causes state explosion on high-activity wallets. The CFAS engine implements a **Value-Weighted Chronological Forward Trace**:
1. Filter outgoing transactions occurring **after** the reported fraud transaction timestamp $T_{incident}$.
2. Trace branches carrying significant value: Amount $\ge 10\%$ of initial loss or $> \$50$ equivalent (configurable threshold).
3. Maximum hop depth: Default **4 hops**, user-configurable from **1 to 6 hops**.

#### FR-2.2 Tracing Algorithm Specification
```python
def trace_wallet_flow(start_address, chain, incident_timestamp=None, min_amount_usd=50, max_hops=4):
    graph = DirectedGraph()
    queue = deque([(start_address, 0, incident_timestamp)])
    visited = set()

    while queue:
        current_addr, current_hop, after_time = queue.popleft()
        if (current_addr, current_hop) in visited or current_hop >= max_hops:
            continue
        visited.add((current_addr, current_hop))

        # 1. Fetch both Native coin & Token transactions (TRC-20/ERC-20 USDT)
        transactions = fetch_all_transfers(current_addr, chain, after_time)

        for tx in transactions:
            if tx.from_addr == current_addr:  # Forward flow only
                graph.add_edge(tx.from_addr, tx.to_addr, tx.amount, tx.token_symbol, tx.tx_hash, tx.timestamp)

                # Check terminal VASP match
                vasp_info = check_vasp_database(tx.to_addr, chain)
                if vasp_info:
                    graph.mark_node(tx.to_addr, type="VASP", details=vasp_info)
                    # Check for 1-hop sweep to hot wallet
                    sweep_tx = check_immediate_sweep(tx.to_addr, chain, tx.timestamp)
                    if sweep_tx:
                        graph.add_edge(tx.to_addr, sweep_tx.to_addr, sweep_tx.amount, sweep_tx.token_symbol, sweep_tx.tx_hash, sweep_tx.timestamp)
                        graph.mark_node(sweep_tx.to_addr, type="VASP_HOT_WALLET", details=lookup_vasp(sweep_tx.to_addr, chain))
                    continue  # Stop branch at VASP terminal node

                # Check Mixer / Bridge
                if is_mixer_contract(tx.to_addr, chain):
                    graph.mark_node(tx.to_addr, type="MIXER", protocol="Tornado Cash/Privacy Pool")
                elif is_bridge_contract(tx.to_addr, chain):
                    graph.mark_node(tx.to_addr, type="BRIDGE", protocol=lookup_bridge(tx.to_addr, chain))
                    # Attempt cross-chain hop continuity lookup
                    cross_tx = lookup_cross_chain_destination(tx, chain)
                    if cross_tx:
                        graph.add_cross_chain_edge(tx.to_addr, cross_tx.to_addr, cross_tx.chain)
                        queue.append((cross_tx.to_addr, current_hop + 1, cross_tx.timestamp))
                        continue

                # Normal intermediate mule/layering node
                queue.append((tx.to_addr, current_hop + 1, tx.timestamp))

    return graph
```

#### FR-2.3 Peeling Chain & Fast Layering Detection
- **Peeling Chain Pattern:** Detects when a wallet receives funds, quickly transfers a large fraction (e.g. 85–95%) to a fresh intermediary wallet, and peels off 5–15% to a separate address (commission/cash-out).
- **Rapid Layering Velocity:** Flags wallets executing $\ge 3$ outgoing transactions within 30 minutes of incoming deposit.

---

### FR-3: Hierarchical VASP Identification & Attribution 🟢

#### FR-3.1 Three-Tier Attribution Hierarchy
Exchange attribution operates across three levels of forensic certainty:

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 1: Direct Known Exchange Wallet Match (Confidence: 95%)│
│  - Exact match in curated FIU-IND / Global VASP directory.   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (If no direct match)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Tier 2: 1-Hop Sweep to Exchange Hot Wallet (Confidence: 85%)│
│  - User deposit address sweeps 100% balance into known       │
│    exchange hot wallet within minutes/hours.                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ (If no sweep match)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Tier 3: Exchange Deposit Clustering Heuristic (Conf: 65%)   │
│  - Address shares deterministic multi-input sweep or receives│
│    deposits from ≥3 distinct scam complaints in database.    │
└─────────────────────────────────────────────────────────────┘
```

#### FR-3.2 VASP Categorization & Nodal Directory
Every identified VASP is categorized to advise immediate legal action:
1. **🇮🇳 FIU-IND Registered VASP (High Priority Actionable):**  
   - Entities: *CoinDCX, WazirX, CoinSwitch (Bitcipher), Mudrex, ZebPay, Binance India, Bybit India*.  
   - Status: Bound by Indian PMLA guidelines; designated Nodal Officer email & statutory response SLA ($< 24$ hours).
2. **🌐 Offshore / Non-FIU VASP (International LEA Channel):**  
   - Entities: *OKX, KuCoin, HTX, Bitget, MEXC, Gate.io, Kraken*.  
   - Status: Requires Interpol / MLAT / International Law Enforcement Request portal.
3. **⚠️ High-Risk / P2P Aggregator / Non-Compliant:**  
   - Instant P2P cashout channels, high-risk swap services (*FixedFloat, ChangeNOW*).

#### FR-3.3 Confidence Scoring Matrix
| Score Range | Confidence Tier | Visual Badge | Recommended Action |
|---|---|---|---|
| **85 – 100%** | **HIGH** | 🟢 Bright Green | Immediate Sec 91/94 Freeze Notice to VASP Nodal Officer |
| **50 – 84%** | **MEDIUM** | 🟡 Amber Yellow | Issue Preservation Order + Subpoena Transaction Logs |
| **20 – 49%** | **LOW** | 🟠 Orange | Expand Trace Depth (5–6 hops) or Monitor Wallet |
| **0%** | **UNATTRIBUTED** | ⚪ Slate Grey | Flag as Unidentified Mule / Non-Custodial Layering |

---

### FR-4: AI/ML Risk Scoring & Fraud Typology Engine 🟢

#### FR-4.1 NLP Fraud Typology Classifier
Classifies the victim's complaint description into 7 standard Indian cybercrime fraud typologies:
1. `TASK_BASED_SCAM` (Telegram YouTube like, prepaid rating tasks)
2. `INVESTMENT_PONZI_SCAM` (Fake institutional crypto trading platforms, WhatsApp investment groups)
3. `DIGITAL_ARREST_EXTORTION` (Impersonation of CBI, Police, ED, Customs)
4. `SEXTORTION_BLACKMAIL` (Video call recording extortion)
5. `RANSOMWARE_PAYMENT` (Cryptolocker / Corporate extortion)
6. `PHISHING_DRAINER` (Malicious smart contract approval / Seed phrase theft)
7. `DARKNET_FINANCIAL_CRIME` (Illicit goods / Underground money laundering)

#### FR-4.2 Composite Forensic Risk Formula (0–100)
$$\text{Risk Score} = \min\left(100, \sum w_i \cdot F_i\right)$$

| Factor ($F_i$) | Weight ($w_i$) | Condition Trigger |
|---|---|---|
| **Mixer Interaction** | **+30** | Direct hop through Tornado Cash, Railgun, or privacy pool |
| **Cross-Chain Bridge Swap** | **+20** | Fund movement through cross-chain bridge / swap protocol |
| **High Velocity Layering** | **+15** | $\ge 3$ outgoing transfers within 60 minutes of deposit |
| **Peeling Chain Signature** | **+15** | Repeated asymmetric value split pattern ($>80\% / <20\%$) |
| **New/Burner Wallet** | **+10** | Wallet age $< 7$ days before receiving illicit funds |
| **Multi-Complaint Link** | **+10** | Wallet overlaps with $\ge 2$ other registered NCRP complaints |

---

### FR-5: Cross-Chain Fund Movement Tracking 🟢

#### FR-5.1 Supported Cross-Chain Gateways
- Protocols: *Stargate Finance, Multichain, Portal (Wormhole), Polygon PoS Bridge, Binance Bridge, THORChain, FixedFloat Swap*.
- Detection: Matching smart contract interaction signatures and cross-chain relay transaction hashes.

#### FR-5.2 Bridge Continuity Resolution
When funds enter a bridge contract on Chain A:
1. Extract bridge transaction parameters: `[Source Chain, Sender, Amount, Token, Timestamp]`.
2. Search destination Chain B for matching release transaction within time window $[T, T + 45\text{ mins}]$ and amount tolerance $[0.95 \cdot A, 1.0 \cdot A]$.
3. *For Hackathon Demo Assurance:* A deterministic bridge test route is pre-configured (e.g. TRON TRC-20 USDT $\rightarrow$ Ethereum ERC-20 USDT via Bridge Contract).

---

### FR-6: Cross-Complaint Correlation & Syndicate Detection 🟢

#### FR-6.1 Multi-Case Graph Intersection
- Continuously indexes all nodes across active case graphs.
- Computes graph overlap:
  $$\text{Overlap}(C_A, C_B) = \text{Nodes}(C_A) \cap \text{Nodes}(C_B)$$
- **Syndicate Flagging:** If $\ge 3$ distinct victim complaints share $\ge 1$ common intermediary mule wallet or deposit address, the system automatically triggers a **"CRITICAL: CYBER SYNDICATE DETECTED"** banner.

---

### FR-7: Actionable Legal Notices & Standardized Forensics Reports 🟢

#### FR-7.1 Automated Section 91 CrPC / Section 94 BNSS Notice Generator
Produces an instantly dispatchable legal notice formatted to Indian statutory requirements:
- **Statutory Authority:** Notice u/s 91 Cr.P.C. (or Section 94 of Bharatiya Nagarik Suraksha Sanhita, 2023).
- **Target Addressee:** Nodal Officer / Legal Compliance Cell of the identified VASP (e.g. `compliance@coindcx.com`).
- **Auto-Populated Evidence:** FIR/Complaint No., Date, Victim Address, Intermediary Hops, Destination Deposit Address, Exact Transaction Hash, Amount (USDT/Crypto), Timestamp (IST & UTC).
- **Direct Order:** Immediate freezing/lien marking of the account, preservation of KYC records (PAN, Aadhaar, IP logs, linked bank accounts).

#### FR-7.2 Court-Admissible Forensics Report (Section 65B IEA / Section 63 BSA)
- Includes:
  1. Executive Summary & Case Metadata
  2. Complete Trace Timeline & Multi-Chain Hop Breakdown
  3. Interactive Fund Flow Graph Snapshot
  4. VASP Attribution & Evidence Score Card
  5. Fraud Typology & Risk Breakdown
  6. Multi-Complaint Syndicate Overlap Table
  7. Full Transaction Audit Trail (Hash, From, To, Value, Block Height)
  8. **Evidentiary Integrity Seal:** Cryptographic SHA-256 hash of report contents + timestamp + fetching engine signature ensuring compliance with **Section 63 of Bharatiya Sakshya Adhiniyam, 2023 / Section 65B Indian Evidence Act**.

---

### FR-8: Real-Time Alerts & Notification Engine 🟢

- **Trigger Conditions:**
  - High-Confidence VASP Attribution Match ($\ge 85\%$).
  - Detection of FIU-IND Registered VASP (triggers immediate freeze SLA countdown).
  - Syndicate Threshold Triggered ($\ge 3$ linked FIRs).
  - High-Risk Mixer / Laundering Hop Detected.
- **Channels:**
  - Real-Time In-App Alert Bell + Floating Banner + Audio ping.
  - Live Server-Sent Events (SSE) stream on active trace screen.
  - Simulated SMS / WhatsApp / SAHYOG LEA Portal Webhook dispatch toast.

---

### FR-9: Authentication, RBAC & Audit Trails 🟢

- **Roles:**
  - `investigator`: Can create cases, execute traces, view linked complaints, download reports & legal notices.
  - `analyst`: All investigator capabilities + access to global syndicate graph & cross-case analytics.
  - `admin`: All analyst capabilities + VASP directory management, user management, audit trail inspection.
- **Audit Log:** Every query, trace execution, and report export is logged with `user_id, timestamp, ip_address, target_wallet, action` to maintain strict chain-of-custody.

---

## 4. Screen-by-Screen UI/UX Specification

### Design Aesthetic (Mandatory Standard)
- **Theme:** Ultra-sleek Dark Cyberpunk / LEA Command Center (Deep Slate `#090d16`, Cyber Cobalt `#0052FF`, Neon Cyan `#00F0FF`, Warning Amber `#FFB800`, Danger Crimson `#FF3B30`).
- **Typography:** Inter & JetBrains Mono (for hashes and addresses).
- **Visuals:** High-contrast nodes, glassmorphic floating cards, glowing status pulses, micro-interactions.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [CFAS] Cyber Fraud Attribution System  |  IO Sharma (Cyber Cell West)  [🔔 3]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ [Dashboard]   [New Trace]   [Syndicate Hub]   [VASP Directory]   [Admin Console] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CASE: NCRP-2026-88421 | VICTIM LOSS: $12,500 (USDT-TRC20) | TYPE: Task Scam    │
│                                                                                  │
│  ┌──────────────────────────────────────────────┐  ┌───────────────────────────┐ │
│  │ 🎯 ATTRIBUTION RESULT:                       │  │ ⚡ RISK SCORE: 88/100     │ │
│  │ Destination: CoinDCX (FIU-IND Registered)    │  │ Tier: CRITICAL HIGH       │ │
│  │ Confidence: 94% [HIGH] | 1-Hop Sweep Match   │  │ Factors: Mixer + Velocity │ │
│  └──────────────────────────────────────────────┘  └───────────────────────────┘ │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ 🕸️ INTERACTIVE FUND FLOW GRAPH (Cytoscape/ReactFlow DAG)                    │ │
│  │                                                                             │ │
│  │  [Victim Wallet] ──(12.5k USDT)──> [Mule 1] ──> [Tornado Cash]               │ │
│  │                                       │               │                     │ │
│  │                                       └──> [Mule 2] ──┴──> [CoinDCX Dep]    │ │
│  │                                                                 │ (Sweep)   │ │
│  │                                                                 ▼           │ │
│  │                                                          [CoinDCX Hot Wallet]│
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌─────────────────────────────┐  ┌───────────────────────────────────────────┐  │
│  │ 🔗 LINKED SYNDICATE (3 Cases)│  │ ⚡ ACTIONABLE LEA OUTPUT                   │  │
│  │ • NCRP-2026-4412 (₹4.2L)    │  │ [📄 Generate Sec 94 BNSS Freeze Notice]   │  │
│  │ • NCRP-2026-7910 (₹8.0L)    │  │ [📑 Download Sec 63 BSA Forensic Report]  │  │
│  │ • NCRP-2026-8842 (Current)  │  │ [✉️ Dispatch to nodal@coindcx.com]        │  │
│  └─────────────────────────────┘  └───────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Key Screen Inventory
1. **Screen 1: Login & Role Selection** (Pre-seeded accounts: IO, Analyst, Admin).
2. **Screen 2: Incident Operations Dashboard** (Metrics, live alert feed, recent cases, urgent freeze countdowns).
3. **Screen 3: New Trace & Complaint Ingestion Console** (Address input, auto-chain selector, token toggle, hop slider, or "Load Sample NCRP Case" 1-click trigger).
4. **Screen 4: Real-Time Blockchain Investigation Workspace (Master Screen)**
   - Top banner: Terminal VASP banner + FIU-IND badge + Risk Gauge.
   - Main viewport: Cytoscape / React-Flow interactive DAG graph (zoom, pan, export PNG, node inspect modal).
   - Live execution drawer: Real-time terminal log showing hop-by-hop discovery.
   - Right drawer: Syndicate correlation matches + On-chain risk factors + VASP compliance contact card.
5. **Screen 5: Statutory Legal Notice & Freeze Requisition Modal** (Pre-filled Sec 91/94 Notice with copy/download PDF).
6. **Screen 6: Section 63 BSA Tamper-Evident Report Preview & Export** (Embedded SHA-256 hash stamp).
7. **Screen 7: Syndicate & Mule Network Intelligence Graph** (Global cluster visualization showing connected FIRs).
8. **Screen 8: VASP & Mixer Directory Management** (CRUD for known exchange wallets, search, FIU status filter).
9. **Screen 9: NCRP / 1930 Simulation Studio** (Interactive tester to fire realistic mock complaints into CFAS).

---

## 5. System Architecture & Tech Stack

```
                                 ┌──────────────────────────────────────────────┐
                                 │     Investigator Web Portal (React/Vite)     │
                                 │   - Cytoscape.js / React-Flow Graph Visualizer│
                                 │   - Live Tracing Terminal (SSE / WebSocket)   │
                                 │   - Sec 91/94 BNSS Legal Notice Generator    │
                                 │   - Modern Dark Tactical Design System       │
                                 └──────────────────────┬───────────────────────┘
                                                        │ REST / JSON + SSE Stream
                                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CFAS Backend Core Engine (FastAPI)                                   │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ ┌─────────────────────────┐ │
│ │  Ingestion Service   │ │  Multi-Chain Tracer  │ │  Token Parser Engine │ │  VASP Attribution Engine│ │
│ │  - NCRP/1930 Parser  │ │  - Value-Weighted BFS│ │  - TRC20/ERC20/BEP20 │ │  - 3-Tier Hierarchy    │ │
│ │  - Address Validator │ │  - Peeling Detector  │ │  - Smart Contract Logs│ │  - FIU-IND Registry     │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └─────────────────────────┘ │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ ┌─────────────────────────┐ │
│ │  AI/ML Typology &    │ │  Cross-Chain Bridge  │ │  Syndicate & Cluster │ │  Legal Notice & Report  │ │
│ │  Risk Scoring Engine │ │  Continuity Engine   │ │  Correlation Engine  │ │  Generator (Sec 63/65B) │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └─────────────────────────┘ │
└───────────────────────────────────┬───────────────────────────────────┬────────────────────────────────┘
                                    │                                   │
                                    ▼                                   ▼
         ┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
         │       PostgreSQL 15 (Relational)    │     │       Redis 7 (Cache & PubSub)      │
         │ - Cases, Wallets, Graph Edges       │     │ - 6-hour TX API response cache      │
         │ - VASP Directory, Audit Trails      │     │ - Real-time trace event bus (SSE)   │
         └─────────────────────────────────────┘     └─────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   External Blockchain API Connectors                                   │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────┐ │
│  │   TRON (TronGrid)     │ │  Ethereum (Etherscan) │ │   BSC (BscScan)       │ │ Bitcoin (Blockstream│ │
│  │   TRC-20 USDT/TRX     │ │  ERC-20 USDT/ETH      │ │   BEP-20 USDT/BNB     │ │ Native UTXO API     │ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────────┘ └─────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Detailed Data Model (PostgreSQL 15 Schema)

```sql
-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & RBAC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    badge_number VARCHAR(50),
    police_station VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('investigator', 'analyst', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. COMPLAINTS & CASES
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_source VARCHAR(30) DEFAULT 'ncrp', -- 'ncrp', '1930_helpline', 'sahyog', 'manual_fir'
    external_complaint_id VARCHAR(100) UNIQUE NOT NULL, -- e.g. NCRP-2026-88421
    victim_name VARCHAR(150),
    victim_phone VARCHAR(30),
    reported_loss_amount NUMERIC(18, 4) NOT NULL,
    loss_currency VARCHAR(10) DEFAULT 'USDT', -- 'USDT', 'INR', 'BTC', 'ETH'
    incident_timestamp TIMESTAMP WITH TIME ZONE,
    complaint_text TEXT,
    fraud_typology VARCHAR(50) NOT NULL, -- 'TASK_BASED_SCAM', 'INVESTMENT_PONZI_SCAM', 'DIGITAL_ARREST_EXTORTION', etc.
    status VARCHAR(30) DEFAULT 'UNDER_INVESTIGATION', -- 'NEW', 'UNDER_INVESTIGATION', 'ATTRIBUTED', 'FREEZE_ORDER_ISSUED', 'CLOSED'
    risk_score INT DEFAULT 0,
    risk_tier VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    possible_syndicate BOOLEAN DEFAULT FALSE,
    assigned_officer_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. WALLETS (Master Entity Across All Traces)
CREATE TABLE wallets (
    address VARCHAR(120) NOT NULL,
    chain VARCHAR(20) NOT NULL, -- 'TRON', 'ETH', 'BSC', 'BTC', 'POLYGON'
    node_type VARCHAR(30) DEFAULT 'NORMAL_WALLET', -- 'ORIGIN_VICTIM', 'MULE_LAYER', 'MIXER', 'BRIDGE', 'VASP_DEPOSIT', 'VASP_HOT_WALLET'
    vasp_id UUID, -- References vasp_directory if attributed
    attribution_tier VARCHAR(30), -- 'TIER_1_EXACT', 'TIER_2_SWEEP', 'TIER_3_CLUSTER'
    attribution_confidence NUMERIC(5, 2) DEFAULT 0.00,
    attribution_evidence TEXT,
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    total_received_usd NUMERIC(18, 2) DEFAULT 0.00,
    risk_flags TEXT[], -- ARRAY of triggers: ['MIXER_HOP', 'PEELING_CHAIN', 'HIGH_VELOCITY']
    PRIMARY KEY (address, chain)
);

-- 4. CASE_WALLETS (Join Table with Hop Depth & Metadata)
CREATE TABLE case_wallets (
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    wallet_address VARCHAR(120) NOT NULL,
    wallet_chain VARCHAR(20) NOT NULL,
    hop_depth INT NOT NULL DEFAULT 0, -- 0 for victim reported, 1..N for intermediaries
    is_origin_reported BOOLEAN DEFAULT FALSE,
    is_terminal_destination BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (case_id, wallet_address, wallet_chain),
    FOREIGN KEY (wallet_address, wallet_chain) REFERENCES wallets(address, chain)
);

-- 5. TRANSACTIONS & TRANSFERS (Native & Token Level)
CREATE TABLE transactions (
    tx_hash VARCHAR(150) PRIMARY KEY,
    chain VARCHAR(20) NOT NULL,
    from_address VARCHAR(120) NOT NULL,
    to_address VARCHAR(120) NOT NULL,
    token_symbol VARCHAR(20) DEFAULT 'NATIVE', -- 'USDT', 'USDC', 'TRX', 'ETH', 'BNB', 'BTC'
    token_contract VARCHAR(120), -- NULL for native coins
    amount NUMERIC(28, 8) NOT NULL,
    amount_usd NUMERIC(18, 2),
    block_number BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    is_peeling_tx BOOLEAN DEFAULT FALSE,
    is_bridge_tx BOOLEAN DEFAULT FALSE,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. VASP & EXCHANGE DIRECTORY
CREATE TABLE vasp_directory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vasp_name VARCHAR(150) NOT NULL, -- e.g. 'CoinDCX', 'WazirX', 'Binance'
    legal_entity_name VARCHAR(200),
    is_fiu_ind_registered BOOLEAN DEFAULT FALSE,
    fiu_registration_number VARCHAR(100),
    nodal_officer_name VARCHAR(150),
    nodal_officer_email VARCHAR(255) NOT NULL,
    law_enforcement_portal_url VARCHAR(255),
    jurisdiction VARCHAR(100) DEFAULT 'India',
    sla_freeze_hours INT DEFAULT 24,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. VASP KNOWN ADDRESSES (Seed & Reference Table)
CREATE TABLE vasp_addresses (
    address VARCHAR(120) NOT NULL,
    chain VARCHAR(20) NOT NULL,
    vasp_id UUID REFERENCES vasp_directory(id) ON DELETE CASCADE,
    address_tag VARCHAR(100) NOT NULL, -- 'Hot Wallet 1', 'Deposit Consolidation', 'Cold Storage'
    source_provenance VARCHAR(150) DEFAULT 'Etherscan Tag / Public Registry',
    is_verified BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (address, chain)
);

-- 8. MIXER & BRIDGE CONTRACT DIRECTORY
CREATE TABLE mixer_bridge_directory (
    contract_address VARCHAR(120) NOT NULL,
    chain VARCHAR(20) NOT NULL,
    protocol_name VARCHAR(100) NOT NULL, -- 'Tornado.Cash', 'Stargate Finance', 'Railgun'
    entity_type VARCHAR(30) NOT NULL, -- 'MIXER', 'BRIDGE', 'DEX_ROUTER'
    source_chain VARCHAR(20),
    destination_chain VARCHAR(20),
    risk_weight INT DEFAULT 30,
    PRIMARY KEY (contract_address, chain)
);

-- 9. STATUTORY LEGAL NOTICES (Section 91/94 BNSS)
CREATE TABLE legal_notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    vasp_id UUID REFERENCES vasp_directory(id),
    notice_type VARCHAR(50) DEFAULT 'SEC_94_BNSS_FREEZE_REQUISITION', -- or 'SEC_91_CRPC'
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    target_wallet VARCHAR(120) NOT NULL,
    target_tx_hash VARCHAR(150),
    amount_to_freeze NUMERIC(18, 4),
    currency VARCHAR(10),
    status VARCHAR(30) DEFAULT 'DRAFTED', -- 'DRAFTED', 'GENERATED', 'DISPATCHED', 'ACKNOWLEDGED', 'FROZEN'
    pdf_storage_path TEXT,
    dispatched_to_email VARCHAR(255),
    dispatched_at TIMESTAMP WITH TIME ZONE,
    generated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. FORENSIC REPORTS (Section 63 BSA / 65B IEA Certified)
CREATE TABLE forensic_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    report_reference_number VARCHAR(100) UNIQUE NOT NULL,
    sha256_content_hash VARCHAR(64) NOT NULL, -- Court-admissible tamper proof hash
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pdf_storage_path TEXT NOT NULL,
    is_court_certified BOOLEAN DEFAULT TRUE
);

-- 11. REAL-TIME INVESTIGATOR ALERTS
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    alert_type VARCHAR(50) NOT NULL, -- 'VASP_HIGH_CONFIDENCE_HIT', 'FIU_IND_ESCALATION', 'SYNDICATE_OVERLAP', 'MIXER_DETECTED'
    severity VARCHAR(20) DEFAULT 'HIGH', -- 'INFO', 'MEDIUM', 'HIGH', 'CRITICAL'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. AUDIT TRAIL & CHAIN OF CUSTODY
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    case_id UUID,
    action VARCHAR(100) NOT NULL, -- 'WALLET_QUERY', 'TRACE_START', 'NOTICE_EXPORT', 'REPORT_HASH_VERIFY'
    target_entity VARCHAR(100),
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. API Specifications & Data Contracts

### 7.1 Complaint Ingestion (NCRP / 1930 / SAHYOG Format)
`POST /api/v1/complaints`

**Request Payload:**
```json
{
  "complaint_source": "ncrp",
  "external_complaint_id": "NCRP-2026-88421",
  "victim_details": {
    "name": "Rajesh Kumar",
    "phone": "+91-9876543210",
    "city": "Bengaluru",
    "state": "Karnataka"
  },
  "fraud_typology": "TASK_BASED_SCAM",
  "reported_loss_amount": 12500.00,
  "loss_currency": "USDT",
  "incident_timestamp": "2026-08-27T10:15:00Z",
  "complaint_text": "Victim was promised 30% daily return on Telegram for rating hotels on Google Maps. Transferred 12,500 USDT from personal Binance wallet to suspect TRON address.",
  "suspect_wallets": [
    {
      "address": "TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6",
      "chain": "TRON",
      "token_symbol": "USDT"
    }
  ]
}
```

**Response Payload (201 Created):**
```json
{
  "success": true,
  "case_id": "8f2e9c14-53a8-4c17-b72e-d59183491ac2",
  "external_complaint_id": "NCRP-2026-88421",
  "status": "INGESTED",
  "ai_typology_classified": "TASK_BASED_SCAM",
  "initial_risk_score": 75,
  "trace_ready": true,
  "message": "NCRP Complaint registered. Forward trace initialization ready."
}
```

---

### 7.2 Execute Real-Time Multi-Hop Trace
`POST /api/v1/cases/{case_id}/trace`

**Request Payload:**
```json
{
  "start_wallet": "TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6",
  "chain": "TRON",
  "token_symbol": "USDT",
  "max_hops": 4,
  "min_amount_filter_usd": 50.00
}
```

**Response Payload (200 OK):**
```json
{
  "trace_id": "tr-77a8b9c0",
  "case_id": "8f2e9c14-53a8-4c17-b72e-d59183491ac2",
  "status": "COMPLETED",
  "execution_time_ms": 1420,
  "total_hops_traversed": 3,
  "terminal_vasp_attribution": {
    "vasp_id": "v-coindcx-01",
    "vasp_name": "CoinDCX",
    "is_fiu_ind_registered": true,
    "nodal_officer_email": "compliance@coindcx.com",
    "destination_address": "TM1Tz8xQvW9A4z5K1m2L3N4P5Q6R7S8T9U",
    "attribution_tier": "TIER_2_SWEEP",
    "confidence_score": 94.5,
    "evidence": "100% funds swept to CoinDCX Cold/Hot Consolidation cluster within 18 minutes of deposit."
  },
  "risk_assessment": {
    "composite_risk_score": 88,
    "risk_tier": "CRITICAL",
    "triggers": [
      "PEELING_CHAIN_DETECTED",
      "HIGH_VELOCITY_LAYERING",
      "FIU_IND_DESTINATION"
    ]
  },
  "syndicate_correlation": {
    "is_syndicate_linked": true,
    "linked_case_count": 3,
    "linked_complaint_ids": ["NCRP-2026-44120", "NCRP-2026-79105"]
  }
}
```

---

### 7.3 Graph Visualization Contract
`GET /api/v1/cases/{case_id}/graph`

**Response Payload (200 OK):**
```json
{
  "case_id": "8f2e9c14-53a8-4c17-b72e-d59183491ac2",
  "nodes": [
    {
      "id": "TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6",
      "label": "Victim Deposit Mule",
      "chain": "TRON",
      "node_type": "ORIGIN_VICTIM",
      "hop": 0,
      "color": "#0052FF"
    },
    {
      "id": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
      "label": "Layering Wallet (Peeling)",
      "chain": "TRON",
      "node_type": "MULE_LAYER",
      "hop": 1,
      "color": "#8E8E93"
    },
    {
      "id": "0xTornadoRouterOrBridge",
      "label": "Tornado.Cash / Cross-Bridge",
      "chain": "ETH",
      "node_type": "MIXER",
      "hop": 2,
      "color": "#FF3B30"
    },
    {
      "id": "TM1Tz8xQvW9A4z5K1m2L3N4P5Q6R7S8T9U",
      "label": "CoinDCX Deposit Tag",
      "chain": "TRON",
      "node_type": "VASP_DEPOSIT",
      "vasp_name": "CoinDCX",
      "is_fiu_registered": true,
      "hop": 3,
      "color": "#30D158"
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6",
      "target": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
      "amount": 12500.0,
      "token": "USDT",
      "tx_hash": "62e987cfa4a34b21901dd1...",
      "timestamp": "2026-08-27T10:18:20Z"
    },
    {
      "id": "e2",
      "source": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
      "target": "TM1Tz8xQvW9A4z5K1m2L3N4P5Q6R7S8T9U",
      "amount": 11800.0,
      "token": "USDT",
      "tx_hash": "84c1209da33bb45f918ee0...",
      "timestamp": "2026-08-27T10:36:12Z"
    }
  ]
}
```

---

### 7.4 Generate Statutory Freeze Requisition (Sec 91/94 BNSS)
`POST /api/v1/cases/{case_id}/generate-freeze-notice`

**Request Payload:**
```json
{
  "vasp_id": "v-coindcx-01",
  "police_station": "Cyber Crime Police Station, Bengaluru Central",
  "officer_name": "Inspector S. Sharma",
  "fir_cr_number": "Cr. No. 142/2026 u/s 318(4), 319(2) BNS & 66D IT Act"
}
```

**Response Payload (200 OK):**
```json
{
  "notice_id": "not-991204",
  "reference_number": "CYBER/BLR/2026/SEC94/88421",
  "statutory_section": "Section 94 BNSS, 2023 (formerly Sec 91 CrPC) & Sec 106 BNSS",
  "recipient": {
    "vasp_name": "CoinDCX (Primestack Pte Ltd / Neblio Technologies)",
    "nodal_email": "compliance@coindcx.com"
  },
  "freeze_order_details": {
    "target_deposit_wallet": "TM1Tz8xQvW9A4z5K1m2L3N4P5Q6R7S8T9U",
    "tx_hash": "84c1209da33bb45f918ee0...",
    "amount_to_freeze": "11,800.00 USDT",
    "timestamp_utc": "2026-08-27T10:36:12Z"
  },
  "pdf_download_url": "/api/v1/notices/CYBER-BLR-2026-SEC94-88421.pdf"
}
```

---

### 7.5 Section 63 BSA Tamper-Evident Court Report
`POST /api/v1/cases/{case_id}/generate-court-report`

**Response Payload (200 OK):**
```json
{
  "report_id": "rep-88421",
  "report_reference": "CFAS-FORENSIC-2026-88421",
  "sha256_hash": "a4f83b271d4e0e11894d49a7102e3cb982f1b40283c7490212aa89b7104f21e5",
  "tamper_proof_verification_url": "/verify/a4f83b271d4e0e11894d49a7102e3cb982f1b40283c7490212aa89b7104f21e5",
  "pdf_download_url": "/api/v1/reports/CFAS-FORENSIC-2026-88421.pdf",
  "legal_admissibility": "Certified under Section 63 of Bharatiya Sakshya Adhiniyam, 2023"
}
```

---

## 8. External Data Sources & Seed Intelligence Sets

### 8.1 Blockchain Explorers & Free Tier APIs
1. **TRON (TRC-20 USDT / TRX):**
   - API: TronGrid API (`https://api.trongrid.io`).
   - Endpoint: `/v1/accounts/{address}/transactions/trc20` for USDT transfers.
2. **Ethereum (ERC-20 USDT / ETH):**
   - API: Etherscan API (`https://api.etherscan.io/api`).
   - Action: `tokentx` & `txlist`.
3. **Binance Smart Chain (BEP-20 USDT / BNB):**
   - API: BscScan API (`https://api.bscscan.com/api`).
4. **Bitcoin (BTC UTXO):**
   - API: Blockstream Esplora API (`https://blockstream.info/api/`).

### 8.2 Curated VASP Directory (Seed Data: 300+ Entries)
- **Indian FIU Registered:** *CoinDCX, WazirX, CoinSwitch, ZebPay, Mudrex, Binance India, Bybit India*.
- **Global Tier 1 Exchanges:** *Binance Global, OKX, KuCoin, HTX, Bitget, Gate.io, Kraken, Coinbase*.
- **P2P & Instant Swaps:** *FixedFloat, ChangeNOW, SimpleSwap*.
- **Synthetic Guaranteed Demo Addresses:** Pre-configured test keypairs mapped to "CoinDCX Deposit Cluster" and "Binance Hot Wallet #4" for 100% resilient live demonstrations.

### 8.3 Mixer & Bridge Seed Directory
- **Mixers:** Tornado Cash ETH Pools (`0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b`), Railgun Relayers.
- **Bridges:** Stargate Router, Hop Protocol, Polygon PoS Bridge, Binance Token Hub.

---

## 9. Core Algorithmic Framework

### 9.1 Three-Tier VASP Attribution Matcher
```python
def attribute_terminal_vasp(address: str, chain: str, case_history: list) -> dict:
    # 1. Tier 1: Direct Labeled VASP Match
    direct = db.query(VaspAddresses).filter_by(address=address, chain=chain).first()
    if direct:
        return {
            "vasp_name": direct.vasp.vasp_name,
            "is_fiu_ind": direct.vasp.is_fiu_ind_registered,
            "tier": "TIER_1_EXACT",
            "confidence": 96.0,
            "evidence": f"Directly matched known {direct.address_tag} of {direct.vasp.vasp_name}"
        }

    # 2. Tier 2: 1-Hop Sweep Consolidation
    # Check if this address transferred >90% balance to a known VASP within 6 hours
    out_txs = fetch_outgoing_txs(address, chain)
    for tx in out_txs:
        sweep_match = db.query(VaspAddresses).filter_by(address=tx.to_address, chain=chain).first()
        if sweep_match and tx.amount_ratio >= 0.85:
            return {
                "vasp_name": sweep_match.vasp.vasp_name,
                "is_fiu_ind": sweep_match.vasp.is_fiu_ind_registered,
                "tier": "TIER_2_SWEEP",
                "confidence": 91.0,
                "evidence": f"Deposit address swept {int(tx.amount_ratio*100)}% funds into {sweep_match.vasp.vasp_name} Hot Wallet ({tx.to_address[:10]}...)"
            }

    # 3. Tier 3: Co-Deposit Cluster Heuristic
    # If >= 3 separate complaints in DB have routed funds to this exact address
    shared_complaints = db.query(CaseWallets).filter(
        CaseWallets.wallet_address == address,
        CaseWallets.case_id != current_case_id
    ).count()
    if shared_complaints >= 2:
        return {
            "vasp_name": "Unidentified Exchange / Aggregator Cluster",
            "is_fiu_ind": False,
            "tier": "TIER_3_CLUSTER",
            "confidence": 68.0,
            "evidence": f"Address matches deposit consolidation behavior across {shared_complaints + 1} distinct FIR complaints."
        }

    return {"vasp_name": None, "confidence": 0.0, "tier": "UNATTRIBUTED", "evidence": "Non-custodial mule / unclustered"}
```

---

## 10. Day-by-Day Hackathon Sprint Execution Plan

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    3-DAY HACKATHON EXECUTION ROADMAP                       │
├────────────────────────────────────────────────────────────────────────────┤
│ 🚀 DAY 1: Core Backend Engines, Data Models & APIs                        │
│   • Set up PostgreSQL 15 + Redis database containers.                      │
│   • Build multi-chain fetchers (TRC-20 TronGrid + ERC-20 Etherscan).       │
│   • Load VASP seed database (FIU-IND + Global + Synthetic demo wallets).   │
│   • Implement Value-Weighted Forward BFS & Peeling Chain detector.         │
│   • Build 3-Tier VASP Attribution & Composite Risk Scorer.                 │
│   • Expose REST endpoints (NCRP ingestion, trace, graph, alerts).          │
├────────────────────────────────────────────────────────────────────────────┤
│ 🎨 DAY 2: Command Center Frontend, Graph UI & Legal Document Engines       │
│   • Build Investigator UI (Dark LEA theme, Glassmorphic Command Cards).    │
│   • Integrate Cytoscape.js / React-Flow interactive DAG visualizer.        │
│   • Implement Live Trace Terminal with SSE streaming animation.            │
│   • Build Section 91/94 BNSS Legal Notice Generator with 1-click PDF/copy. │
│   • Build Section 63 BSA Forensics Report Engine with SHA-256 seal.        │
│   • Implement Cross-Complaint Syndicate Correlation graph viewer.          │
├────────────────────────────────────────────────────────────────────────────┤
│ 🏆 DAY 3: Polish, Live Demo Rehearsal & Pitch Perfection                   │
│   • Build "Simulate 1930 NCRP Complaint" interactive demo studio.          │
│   • Connect real-time alert toast & notification sound effects.            │
│   • Rehearse end-to-end demo: Task Scam Ingestion -> Auto Trace ->         │
│     Mixer Detection -> CoinDCX Attribution -> Sec 94 BNSS Notice -> Report.│
│   • Add "Investigation Time Saved" live counter (e.g. 4.8 Hours -> 2.1 Sec)│
│   • Final stress test on offline/synthetic fallback modes.                 │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Hackathon Pitch & Live Demo Script (Winning Strategy)

### The 3-Minute Winning Demo Flow
1. **Act 1: The Crisis (0:00 – 0:45)**  
   - "A victim loses ₹10 Lakhs in a Telegram task fraud. By the time police write to the bank, funds have crossed 3 non-custodial crypto wallets. Manual tracing takes 6–12 hours. Scammers cash out in 20 minutes."
2. **Act 2: The CFAS Breakthrough (0:45 – 2:00)**  
   - Ingest the simulated NCRP complaint live.
   - Click **"Initiate Real-Time Attribution"**.
   - Watch the live Cytoscape graph dynamically expand in 2.1 seconds:
     - Hop 0: Victim Mule (TRC-20 USDT)
     - Hop 1: Peeling chain (10% fee split)
     - Hop 2: Privacy protocol obfuscation
     - Hop 3: **Target Identified: CoinDCX (FIU-IND Registered, High Confidence 94%)**
     - Immediate alert fires: **"3 Linked FIRs Found — Syndicate Alert!"**
3. **Act 3: The Actionable Legal Strike (2:00 – 3:00)**  
   - Click **"Generate Section 94 BNSS Freeze Notice"**:
     - Pre-populated legal requisition to CoinDCX Nodal Officer (`compliance@coindcx.com`) with exact deposit hash and frozen amount.
   - Click **"Export Section 63 BSA Forensic Certificate"**:
     - Shows SHA-256 tamper-proof hash and legal evidentiary seal.
   - Show metric: **"Investigation Turnaround reduced from 6 Hours to 3 Seconds."**

---

## 12. Acceptance & Validation Checklist

- [ ] Ingestion validates and parses TRON (TRC-20), EVM (ETH/BSC), and BTC address formats.
- [ ] Token transfers (USDT TRC-20 / ERC-20) are accurately parsed alongside native coins.
- [ ] Forward BFS successfully stops traversal upon hitting terminal exchange nodes.
- [ ] 3-Tier VASP Attribution correctly identifies direct hot wallets and 1-hop sweep patterns.
- [ ] FIU-IND registered entities are clearly badged with designated statutory nodal emails.
- [ ] Peeling chain and velocity layering are flagged with corresponding risk weights.
- [ ] Syndicate correlation engine surfaces linked case IDs when $\ge 2$ complaints share a wallet.
- [ ] Legal Notice modal generates compliant Section 94 BNSS / Section 91 CrPC notice.
- [ ] Court Report generates a valid SHA-256 hash matching the exported PDF data.
- [ ] Cytoscape/React-Flow graph renders directed fund flow with distinct node color coding.
- [ ] Live demo scenario executes reliably without latency hiccups or third-party rate limit failures.

---

*End of PRD — Crypto Fraud Attribution System (CFAS) v3.0*
