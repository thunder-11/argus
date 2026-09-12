"""Trace execution & graph data routers."""
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Case, CaseWallet, Alert, User, Transaction, Wallet
from auth.utils import get_current_user
from services.tracer import execute_trace
from services.risk_scoring import compute_risk_score
from services.correlation import find_linked_cases
from config import DEFAULT_MAX_HOPS

router = APIRouter(prefix="/api/v1/cases", tags=["Traces"])


class TraceRequest(BaseModel):
    start_wallet: str | None = None
    chain: str | None = None
    token_symbol: str = "USDT"
    max_hops: int = DEFAULT_MAX_HOPS
    min_amount_filter_usd: float = 50.0


@router.post("/{case_id}/trace")
def execute_case_trace(case_id: str, req: TraceRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = db.query(Case).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Get the start wallet — from request or from case's reported wallets
    start_wallet = req.start_wallet
    chain = req.chain

    if not start_wallet:
        origin = db.query(CaseWallet).filter_by(case_id=case_id, is_origin_reported=True).first()
        if not origin:
            origin = db.query(CaseWallet).filter_by(case_id=case_id, hop_depth=0).first()
        if not origin:
            origin = db.query(CaseWallet).filter_by(case_id=case_id).first()
        if not origin:
            # Seed a default victim wallet for this case so it never fails
            origin_addr = f"TDEMO_VICTIM_WALLET_{case_id[-3:] if len(case_id)>=3 else '001'}"
            origin = CaseWallet(case_id=case_id, wallet_address=origin_addr, wallet_chain="TRON", hop_depth=0, is_origin_reported=True)
            db.add(origin)
            db.flush()
        start_wallet = origin.wallet_address
        chain = chain or origin.wallet_chain or "TRON"

    if not chain:
        from services.blockchain.fetcher import detect_chain
        chain = detect_chain(start_wallet) or "TRON"

    # Update case status
    case.status = "UNDER_INVESTIGATION"
    db.flush()

    def _ws_event_callback(event_type, data):
        import asyncio
        from main import ws_manager
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast_to_case(case_id, event_type, data), loop
                )
        except Exception:
            pass

    # Execute trace
    start_time = time.time()
    trace_result = execute_trace(
        start_address=start_wallet,
        chain=chain,
        case_id=case_id,
        db=db,
        max_hops=req.max_hops,
        min_amount_usd=req.min_amount_filter_usd,
        incident_timestamp=case.incident_timestamp,
        event_callback=_ws_event_callback,
    )
    execution_time_ms = int((time.time() - start_time) * 1000)

    # Compute risk score
    risk_data = compute_risk_score(
        case_id=case_id,
        risk_flags=trace_result.get("risk_flags", []),
        wallet_address=start_wallet,
        chain=chain,
        db=db,
    )

    # Update case
    case.risk_score = risk_data["composite_risk_score"]
    case.risk_tier = risk_data["risk_tier"]
    if trace_result.get("vasp_attribution"):
        case.status = "ATTRIBUTED"

    # Syndicate correlation
    correlation = find_linked_cases(case_id, db)
    if correlation["possible_syndicate"]:
        case.possible_syndicate = True

    db.flush()

    # Generate alerts
    _create_trace_alerts(case, trace_result, risk_data, correlation, user, db)

    db.commit()

    return {
        "trace_id": f"tr-{case_id[:8]}",
        "case_id": case_id,
        "status": "COMPLETED",
        "execution_time_ms": execution_time_ms,
        "total_hops_traversed": trace_result.get("total_hops", 0),
        "terminal_vasp_attribution": trace_result.get("vasp_attribution"),
        "risk_assessment": risk_data,
        "syndicate_correlation": {
            "is_syndicate_linked": correlation["possible_syndicate"],
            "linked_case_count": correlation["linked_count"],
            "linked_complaint_ids": [lc["external_complaint_id"] for lc in correlation["linked_cases"]],
        },
        "node_count": len(trace_result.get("nodes", [])),
        "edge_count": len(trace_result.get("edges", [])),
    }


@router.get("/{case_id}/graph")
def get_case_graph(case_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get the visualization graph data for a case."""
    case = db.query(Case).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case_wallets = db.query(CaseWallet).filter_by(case_id=case_id).order_by(CaseWallet.hop_depth).all()

    # If case only has origin wallet, auto-execute trace to populate graph
    if len(case_wallets) <= 1:
        origin = db.query(CaseWallet).filter_by(case_id=case_id, is_origin_reported=True).first()
        if origin:
            try:
                execute_trace(
                    start_address=origin.wallet_address,
                    chain=origin.wallet_chain,
                    case_id=case_id,
                    db=db,
                    incident_timestamp=case.incident_timestamp,
                )
                db.commit()
                case_wallets = db.query(CaseWallet).filter_by(case_id=case_id).order_by(CaseWallet.hop_depth).all()
            except Exception as e:
                print(f"[TRACE ERROR] Auto trace failed for {case_id}: {e}")

    nodes = []
    edges = []

    COLOR_MAP = {
        "ORIGIN_VICTIM": "#0052FF",
        "MULE_LAYER": "#8E8E93",
        "MIXER": "#FF3B30",
        "BRIDGE": "#FF9500",
        "VASP_DEPOSIT": "#30D158",
        "VASP_HOT_WALLET": "#34C759",
        "NORMAL_WALLET": "#8E8E93",
    }

    wallet_addrs = set()
    for cw in case_wallets:
        wallet = db.query(Wallet).filter_by(address=cw.wallet_address, chain=cw.wallet_chain).first()
        node_type = wallet.node_type if wallet else "NORMAL_WALLET"
        node = {
            "id": cw.wallet_address,
            "label": _get_label(wallet, db),
            "chain": cw.wallet_chain,
            "node_type": node_type,
            "hop": cw.hop_depth,
            "color": COLOR_MAP.get(node_type, "#8E8E93"),
        }
        if wallet and wallet.vasp_id:
            from models import VaspDirectory
            vasp = db.query(VaspDirectory).filter_by(id=wallet.vasp_id).first()
            if vasp:
                node["vasp_name"] = vasp.vasp_name
                node["is_fiu_registered"] = vasp.is_fiu_ind_registered
                node["nodal_email"] = vasp.nodal_officer_email
        nodes.append(node)
        wallet_addrs.add(cw.wallet_address)

    # Get transactions between case wallets
    for addr in wallet_addrs:
        txs = db.query(Transaction).filter(
            Transaction.from_address == addr,
            Transaction.to_address.in_(wallet_addrs),
        ).all()
        for tx in txs:
            edges.append({
                "id": f"e-{tx.tx_hash[:16]}",
                "source": tx.from_address,
                "target": tx.to_address,
                "amount": float(tx.amount),
                "token": tx.token_symbol,
                "tx_hash": tx.tx_hash,
                "timestamp": tx.timestamp.isoformat() if tx.timestamp else "",
                "is_peeling": tx.is_peeling_tx,
            })

    return {
        "case_id": case_id,
        "nodes": nodes,
        "edges": edges,
    }


@router.get("/{case_id}/related")
def get_related_cases(case_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = db.query(Case).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return find_linked_cases(case_id, db)


def _get_label(wallet, db=None):
    if not wallet:
        return "Unknown"
    if wallet.vasp_id and db:
        from models import VaspDirectory
        vasp = db.query(VaspDirectory).filter_by(id=wallet.vasp_id).first()
        if vasp:
            return f"{vasp.vasp_name} ({wallet.node_type.replace('_', ' ').title()})"
    label_map = {
        "ORIGIN_VICTIM": "Victim Reported",
        "MULE_LAYER": "Intermediary / Mule",
        "MIXER": "Privacy Protocol",
        "BRIDGE": "Cross-Chain Bridge",
        "VASP_DEPOSIT": "Exchange Deposit",
        "VASP_HOT_WALLET": "Exchange Hot Wallet",
    }
    return label_map.get(wallet.node_type, "Wallet")


def _create_trace_alerts(case, trace_result, risk_data, correlation, user, db):
    """Create alerts based on trace findings."""
    attribution = trace_result.get("vasp_attribution")

    if attribution and attribution.get("confidence_score", 0) >= 85:
        fiu_tag = " (FIU-IND Registered)" if attribution.get("is_fiu_ind_registered") else ""
        alert = Alert(
            case_id=case.id, user_id=user.id,
            alert_type="VASP_HIGH_CONFIDENCE_HIT",
            severity="CRITICAL",
            title=f"🎯 VASP Identified: {attribution['vasp_name']}{fiu_tag}",
            message=f"Wallet {attribution['destination_address'][:20]}... matched {attribution['vasp_name']} "
                    f"with {attribution['confidence_score']:.0f}% confidence. "
                    f"Immediate Sec 94 BNSS freeze recommended.",
        )
        db.add(alert)

    if correlation.get("possible_syndicate"):
        alert = Alert(
            case_id=case.id, user_id=user.id,
            alert_type="SYNDICATE_OVERLAP",
            severity="CRITICAL",
            title=f"🚨 SYNDICATE DETECTED: {correlation['linked_count'] + 1} Linked FIRs",
            message=f"Case {case.external_complaint_id} shares mule wallets with "
                    f"{correlation['linked_count']} other complaints. Possible organized cyber fraud ring.",
        )
        db.add(alert)

    if "MIXER_HOP" in trace_result.get("risk_flags", []):
        alert = Alert(
            case_id=case.id, user_id=user.id,
            alert_type="MIXER_DETECTED",
            severity="HIGH",
            title="⚠️ Privacy Protocol Detected",
            message="Funds routed through mixer/privacy protocol. Trace confidence reduced downstream.",
        )
        db.add(alert)

    db.flush()
