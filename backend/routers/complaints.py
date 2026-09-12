"""Complaint ingestion router — simulates NCRP / 1930 / SAHYOG intake."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Case, Wallet, CaseWallet, User
from auth.utils import get_current_user
from services.typology import classify_typology
from services.blockchain.fetcher import detect_chain, validate_address

router = APIRouter(prefix="/api/v1/complaints", tags=["Complaints"])


class WalletInput(BaseModel):
    address: str
    chain: str | None = None
    token_symbol: str | None = "USDT"


class ComplaintRequest(BaseModel):
    complaint_source: str = "ncrp"
    external_complaint_id: str
    victim_name: str | None = None
    victim_phone: str | None = None
    fraud_typology: str | None = None
    reported_loss_amount: float
    loss_currency: str = "USDT"
    incident_timestamp: str | None = None
    complaint_text: str | None = None
    suspect_wallets: list[WalletInput]


@router.post("")
def ingest_complaint(req: ComplaintRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Check for duplicate
    existing = db.query(Case).filter_by(external_complaint_id=req.external_complaint_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Complaint {req.external_complaint_id} already exists")

    # Auto-classify typology
    typology_result = classify_typology(req.complaint_text, req.fraud_typology)

    # Parse incident timestamp
    incident_ts = None
    if req.incident_timestamp:
        try:
            incident_ts = datetime.fromisoformat(req.incident_timestamp.replace("Z", "+00:00"))
        except ValueError:
            pass

    # Create case
    case = Case(
        complaint_source=req.complaint_source,
        external_complaint_id=req.external_complaint_id,
        victim_name=req.victim_name,
        victim_phone=req.victim_phone,
        reported_loss_amount=req.reported_loss_amount,
        loss_currency=req.loss_currency,
        incident_timestamp=incident_ts,
        complaint_text=req.complaint_text,
        fraud_typology=typology_result["classified_typology"],
        status="NEW",
        assigned_officer_id=user.id,
    )
    db.add(case)
    db.flush()

    # Process wallets
    for wallet_input in req.suspect_wallets:
        chain = wallet_input.chain or detect_chain(wallet_input.address)
        if not chain:
            continue

        if not validate_address(wallet_input.address, chain):
            continue

        # Create wallet record
        existing_wallet = db.query(Wallet).filter_by(address=wallet_input.address, chain=chain).first()
        if not existing_wallet:
            w = Wallet(
                address=wallet_input.address,
                chain=chain,
                node_type="ORIGIN_VICTIM",
                first_seen=datetime.now(timezone.utc),
                risk_flags="[]",
            )
            db.add(w)
            db.flush()

        # Link to case
        cw = CaseWallet(
            case_id=case.id,
            wallet_address=wallet_input.address,
            wallet_chain=chain,
            hop_depth=0,
            is_origin_reported=True,
        )
        db.add(cw)

    db.commit()

    return {
        "success": True,
        "case_id": case.id,
        "external_complaint_id": case.external_complaint_id,
        "status": "INGESTED",
        "ai_typology_classified": typology_result["classified_typology"],
        "typology_confidence": typology_result["confidence"],
        "initial_risk_score": 0,
        "trace_ready": True,
        "message": "Complaint registered. Forward trace initialization ready.",
    }
