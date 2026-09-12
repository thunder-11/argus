"""
Composite Forensic Risk Scoring Engine (PRD §3 FR-4).
Deterministic weighted formula producing a 0–100 risk score.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from models import CaseWallet, Transaction
from config import (
    RISK_WEIGHT_MIXER, RISK_WEIGHT_BRIDGE, RISK_WEIGHT_HIGH_VELOCITY,
    RISK_WEIGHT_PEELING, RISK_WEIGHT_BURNER, RISK_WEIGHT_MULTI_COMPLAINT,
)


def compute_risk_score(
    case_id: str,
    risk_flags: list[str],
    wallet_address: str,
    chain: str,
    db: Session,
) -> dict:
    """
    Compute composite risk score from trace results.
    Returns dict with score, tier, and contributing factors.
    """
    score = 0
    factors = []

    # Factor 1: Mixer interaction
    if "MIXER_HOP" in risk_flags:
        score += RISK_WEIGHT_MIXER
        factors.append({
            "factor": "MIXER_INTERACTION",
            "weight": RISK_WEIGHT_MIXER,
            "description": "Funds routed through privacy protocol / mixer",
        })

    # Factor 2: Cross-chain bridge
    if "BRIDGE_SWAP" in risk_flags:
        score += RISK_WEIGHT_BRIDGE
        factors.append({
            "factor": "CROSS_CHAIN_BRIDGE",
            "weight": RISK_WEIGHT_BRIDGE,
            "description": "Funds moved across blockchain via bridge/swap protocol",
        })

    # Factor 3: High velocity layering
    if "HIGH_VELOCITY_LAYERING" in risk_flags:
        score += RISK_WEIGHT_HIGH_VELOCITY
        factors.append({
            "factor": "HIGH_VELOCITY_LAYERING",
            "weight": RISK_WEIGHT_HIGH_VELOCITY,
            "description": "≥3 outgoing transfers within 60 minutes of deposit",
        })

    # Factor 4: Peeling chain detected
    if "PEELING_CHAIN_DETECTED" in risk_flags:
        score += RISK_WEIGHT_PEELING
        factors.append({
            "factor": "PEELING_CHAIN",
            "weight": RISK_WEIGHT_PEELING,
            "description": "Repeated asymmetric value split (>80% / <20%) — classic mule commission pattern",
        })

    # Factor 5: Burner / new wallet (age < 7 days)
    first_tx = db.query(Transaction).filter(
        (Transaction.from_address == wallet_address) | (Transaction.to_address == wallet_address),
        Transaction.chain == chain,
    ).order_by(Transaction.timestamp.asc()).first()

    if first_tx and first_tx.timestamp:
        wallet_age = (datetime.now(timezone.utc) - first_tx.timestamp).days
        if wallet_age < 7:
            score += RISK_WEIGHT_BURNER
            factors.append({
                "factor": "BURNER_WALLET",
                "weight": RISK_WEIGHT_BURNER,
                "description": f"Wallet age: {wallet_age} days (< 7 day threshold)",
            })

    # Factor 6: Multi-complaint link
    linked_cases = db.query(CaseWallet).filter(
        CaseWallet.wallet_address == wallet_address,
        CaseWallet.case_id != case_id,
    ).count()
    if linked_cases >= 2:
        score += RISK_WEIGHT_MULTI_COMPLAINT
        factors.append({
            "factor": "MULTI_COMPLAINT_LINK",
            "weight": RISK_WEIGHT_MULTI_COMPLAINT,
            "description": f"Wallet appears in {linked_cases} other complaint cases",
        })

    # Cap at 100
    score = min(100, score)

    # Determine tier
    if score >= 66:
        tier = "CRITICAL"
    elif score >= 31:
        tier = "HIGH"
    elif score > 0:
        tier = "MEDIUM"
    else:
        tier = "LOW"

    return {
        "composite_risk_score": score,
        "risk_tier": tier,
        "contributing_factors": factors,
        "triggers": [f["factor"] for f in factors],
    }
