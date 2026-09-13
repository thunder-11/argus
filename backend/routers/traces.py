"""Trace execution & graph data routers."""
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import Case, CaseWallet, Alert, User, Transaction, Wallet
from auth.utils import get_current_user
from services.tracer import execute_trace
from services.risk_scoring import compute_risk_score
from services.correlation import find_linked_cases
from config import DEFAULT_MAX_HOPS
from app.core.errors import ApplicationError
from app.jobs.contracts import JobState
from app.persistence.models import AddressRecord, AnalysisRun, ReportEvent
from app.repositories.phase2 import DurableJobRepository
from app.repositories.phase3 import WorkflowRepository
from app.security.authorization import get_accessible_case

router = APIRouter(prefix="/api/v1/cases", tags=["Traces"])


class TraceRequest(BaseModel):
    start_wallet: str | None = None
    chain: str | None = None
    token_symbol: str = "USDT"
    max_hops: int = Field(default=DEFAULT_MAX_HOPS, ge=1, le=6)
    min_amount_filter_usd: float = 50.0


@router.post("/{case_id}/trace", status_code=202)
def execute_case_trace(case_id: str, req: TraceRequest, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user),
                       idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    """Compatibility start route over the durable Phase 3 run created at intake."""
    case = get_accessible_case(db, user, case_id, write=True)
    active = db.query(AnalysisRun).filter(
        AnalysisRun.case_id == case.id,
        AnalysisRun.run_type == "trace",
        AnalysisRun.state.in_(["queued", "running", "retrying"]),
    ).order_by(AnalysisRun.revision.desc()).first()
    if active is not None:
        return {"trace_id": active.id, "case_id": case.id, "job_id": _job_id(db, case.id),
                "status": active.state, "status_url": f"/api/v1/traces/{active.id}", "idempotent_replay": True}

    origin = db.query(CaseWallet).filter_by(case_id=case.id, is_origin_reported=True).first()
    if origin is None:
        raise ApplicationError(code="ORIGIN_WALLET_REQUIRED", message="The case has no validated origin wallet",
                               status_code=422, details={"case_id": case.id})
    if req.start_wallet and not req.chain:
        raise ApplicationError(code="NETWORK_REQUIRED", message="The wallet network is ambiguous or unsupported",
                               status_code=422, details={"case_id": case.id})
    start_wallet = req.start_wallet or origin.wallet_address
    chain = (req.chain or origin.wallet_chain or "").upper()
    if start_wallet != origin.wallet_address or chain != origin.wallet_chain:
        raise ApplicationError(code="ROOT_NOT_IN_CASE", message="Trace root must be a validated case wallet", status_code=422)
    report = db.query(ReportEvent).filter(ReportEvent.id == case.primary_report_event_id).first()
    if report is None:
        raise ApplicationError(code="REPORT_TIMESTAMP_REQUIRED", message="A report event is required before tracing", status_code=422)
    address = db.query(AddressRecord).filter(AddressRecord.chain == chain,
                                             AddressRecord.canonical_address == start_wallet).first()
    if address is None:
        raise ApplicationError(code="ORIGIN_WALLET_REQUIRED", message="Validated address record is missing", status_code=422)
    revision = db.query(func.coalesce(func.max(AnalysisRun.revision), 0)).filter(
        AnalysisRun.case_id == case.id, AnalysisRun.run_type == "trace").scalar() + 1
    now = datetime.now(timezone.utc)
    run = AnalysisRun(case_id=case.id, run_type="trace", revision=revision, state="queued", requested_by=user.id,
                      report_event_id=report.id, root_address_ids=[address.id], event_cutoff=now,
                      cutoff_available_time=now, parameters=req.model_dump(), stage="queued", checkpoint={},
                      coverage={"state": "not_requested"})
    db.add(run)
    db.flush()
    job, created = DurableJobRepository(db).enqueue_once(operation="trace.run",
        idempotency_key=idempotency_key or f"trace:{case.id}:{revision}", case_id=case.id,
        payload={"run_id": run.id, "case_id": case.id, "root_address_ids": [address.id]})
    job.actor_id = user.id
    case.status = "investigating"
    workflow = WorkflowRepository(db)
    workflow.append_case_event(case_id=case.id, event_type="trace_queued", actor_id=user.id,
                               payload={"run_id": run.id, "job_id": job.id})
    workflow.audit(actor_id=user.id, case_id=case.id, action="trace.queue", resource_type="analysis_run",
                   resource_id=run.id, details={"job_id": job.id})
    db.commit()
    return {"trace_id": run.id, "case_id": case.id, "job_id": job.id, "status": JobState.QUEUED.value,
            "status_url": f"/api/v1/traces/{run.id}", "idempotent_replay": not created}


def _job_id(db: Session, case_id: str) -> str | None:
    from app.persistence.models import BackgroundJob
    job = db.query(BackgroundJob).filter(BackgroundJob.case_id == case_id,
                                         BackgroundJob.operation == "trace.run").order_by(BackgroundJob.created_at.desc()).first()
    return job.id if job else None


@router.get("/{case_id}/graph")
def get_case_graph(case_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get the visualization graph data for a case."""
    case = get_accessible_case(db, user, case_id)

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
    case = get_accessible_case(db, user, case_id)
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
