# ✅ Prototype Must-Have Checklist

## 1. 🔍 Wallet Investigation — CORE

- Enter a **wallet address** as input.
- Identify basic wallet/transaction information.
- Automatically start tracing from the entered wallet.
- Show **transaction timestamps, amounts, sender/receiver**.
- Trace at least **5–6 hops**.
- Show the flow visually as a **graph**.

## 2. 🕸️ Automated Fund-Flow Graph

- Interactive transaction graph.
- Direction of money flow clearly visible.
- Each node represents a wallet/address.
- Each edge represents a transaction.
- Display amount + timestamp on transactions.
- Automatically expand connected wallets.
- Highlight suspicious/high-risk nodes.
- **Live money-trail animation** showing funds moving hop-by-hop.

## 3. 🧩 Wallet Clustering

- Group related wallets into clusters.
- Show when multiple addresses appear connected.
- Identify common transaction/fund-flow patterns.
- Visually distinguish different clusters.

## 4. 🏦 VASP / Exchange Identification — VERY IMPORTANT

- Identify when funds reach an **exchange/VASP**.
- Show the suspected VASP/exchange deposit address.
- Display a flow such as:
  **Wallet → Wallet → Mixer → Wallet → Binance/VASP**
- Flag the **off-ramp/deposit point**.
- Show risk level of the VASP interaction.

## 5. 🤖 AI/ML Risk Detection

The prototype should not just show a graph — it should actually **classify suspicious behavior**.

- Suspicious transaction detection.
- Risk score, e.g. **87% HIGH RISK**.
- Detect patterns such as:
  - Rapid fund movement.
  - Multiple hops.
  - Structuring/splitting.
  - Mixer/tumbler interaction.
  - Bridge transactions.
  - Rapid movement toward exchanges.
- Clearly label **why the wallet/transaction is suspicious**.

## 6. 🌉 Cross-Chain Analysis

Since the slide explicitly claims this:

- Support/show at least **2 blockchains**.
- Show a bridge/cross-chain transaction.
- Connect transactions across chains into **one unified graph**.
- Example:
  **Ethereum → Bridge → Polygon → Exchange**

> Even if the prototype uses simulated/demo data, the cross-chain flow should be visible.

## 7. 🌀 Mixer / Tumbler / Bridge Detection

- Identify suspicious mixer/tumbler interaction.
- Identify bridge transactions.
- Flag them in the graph.
- Explain why that interaction increases risk.

## 8. 🚨 Real-Time Deposit Check

This is one of the strongest USPs.

- Incoming wallet/deposit monitoring.
- Check incoming wallet/address.
- Calculate risk.
- Display result in real time.
- Show a **<200 ms** response *only if the prototype can genuinely demonstrate it*.
- Generate alert before funds are credited.
- Example:

> **⚠ HIGH-RISK DEPOSIT DETECTED**
>
> Risk Score: 94/100  
> Source: 5-hop stolen-fund trail  
> Action: BLOCK / REVIEW

## 9. 👥 Cross-Victim Correlation

This is a **very important differentiator**.

Create a demo with multiple victims:

- Victim A reports wallet X.
- Victim B reports wallet X.
- Victim C reports wallet X.
- System automatically detects the common wallet.
- Automatically links the complaints.
- Flag as **High-Confidence Fraud**.
- Show:

> **3 Victims → Same Wallet → Common Fund Trail → HIGH CONFIDENCE FRAUD**

## 10. 🧠 Explainable Evidence Trail

Don't just show:

> Risk Score = 92%

Show **why**.

- Timestamp.
- Transaction hash/ID.
- Amount.
- Wallet addresses.
- Number of hops.
- Suspicious patterns detected.
- Mixer/bridge interaction.
- VASP destination.
- AI reasoning.

Example:

> **Why flagged?**
>
> - 5-hop fund movement.
> - ₹8.4L transferred within 4 minutes.
> - Interaction with mixer.
> - Funds reached VASP deposit address.
> - Same wallet linked to 3 complaints.

## 11. 📄 One-Click Investigation Report

This should definitely exist in the prototype.

- **Generate Report** button.
- Automatically create investigation report.
- Include:
  - Case ID.
  - Victim details.
  - Wallet addresses.
  - Transaction history.
  - Fund-flow graph.
  - Risk score.
  - Suspicious patterns.
  - VASP attribution.
  - Timeline.
  - Evidence.
- Export as **PDF**.
- Make it look like an actual **LEA/investigation report**.

## 12. 👮 LEA / SAHYOG / NCRP Integration

For the prototype:

- Show NCRP/SAHYOG case ingestion.
- Case ID / complaint ID.
- Wallet address extracted from complaint.
- Investigation automatically initiated.

If real APIs aren't accessible, **mock the API response**, but make the workflow look real.