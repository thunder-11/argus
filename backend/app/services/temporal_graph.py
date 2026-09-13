"""Bounded, reproducible transaction graphs for Phase 5.

The relational evidence store remains authoritative.  This module deliberately
does not fetch providers, enqueue jobs, or modify cases: a graph query is a
read-only view over a selected analysis run and its immutable cutoff.
"""

from __future__ import annotations

import hashlib
import json
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApplicationError
from app.persistence.models import AddressRecord, AnalysisRun, Asset, GraphSnapshot, NormalizedTransaction, ReportEvent, TracePath
from app.repositories.phase2 import RevisionRepository


@dataclass(frozen=True, slots=True)
class GraphRequest:
    temporal_view: str = "all"
    boundary: str = "exclusive"
    include_context: bool = False
    chain: str | None = None
    asset: str | None = None
    min_amount: str | None = None
    max_amount: str | None = None
    to_time: datetime | None = None
    trace_id: str | None = None
    report_event_id: str | None = None
    report_revision: int | None = None


def _digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, default=str, separators=(",", ":")).encode()).hexdigest()


def _report_for(case, request: GraphRequest, db: Session) -> ReportEvent | None:
    identifier = request.report_event_id or case.primary_report_event_id
    if identifier is None:
        if request.temporal_view == "all":
            return None
        raise ApplicationError(code="REPORT_REFERENCE_REQUIRED", message="A selected report event is required", status_code=422)
    report = db.get(ReportEvent, identifier)
    if report is None or report.case_id != case.id:
        raise ApplicationError(code="REPORT_REFERENCE_REQUIRED", message="Report event is not part of this case", status_code=422)
    if request.report_revision is not None and request.report_revision != report.revision:
        raise ApplicationError(code="SNAPSHOT_CUTOFF_MISMATCH", message="Report revision does not match the selected event", status_code=409,
                               details={"requested_revision": request.report_revision, "actual_revision": report.revision})
    return report


def _run_for(case_id: str, report: ReportEvent | None, request: GraphRequest, db: Session) -> AnalysisRun | None:
    query = select(AnalysisRun).where(AnalysisRun.case_id == case_id, AnalysisRun.run_type == "trace")
    if request.trace_id:
        run = db.get(AnalysisRun, request.trace_id)
        if run is None or run.case_id != case_id or run.run_type != "trace":
            raise ApplicationError(code="TRACE_NOT_FOUND", message="Trace run not found for case", status_code=404)
    else:
        run = db.execute(query.order_by(AnalysisRun.revision.desc()).limit(1)).scalar_one_or_none()
    if run and report and run.report_event_id != report.id:
        raise ApplicationError(code="SNAPSHOT_CUTOFF_MISMATCH", message="Trace was created for another report revision", status_code=409,
                               details={"trace_report_event_id": run.report_event_id, "selected_report_event_id": report.id})
    return run


def _transaction_rows(run: AnalysisRun, request: GraphRequest, db: Session) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return bounded outgoing edges and deterministic root-to-edge paths."""
    cutoff = run.event_cutoff
    if request.to_time and request.to_time > cutoff:
        raise ApplicationError(code="TEMPORAL_SCOPE_VIOLATION", message="The requested end time exceeds the trace cutoff", status_code=422)
    end_time = request.to_time or cutoff
    max_hops = min(6, max(1, int(run.parameters.get("max_hops", 4))))
    try:
        minimum = Decimal(request.min_amount) if request.min_amount is not None else None
        maximum = Decimal(request.max_amount) if request.max_amount is not None else None
    except Exception as exc:
        raise ApplicationError(code="INVALID_AMOUNT_FILTER", message="Amount filters must be exact decimal values", status_code=422) from exc
    if minimum is not None and maximum is not None and minimum > maximum:
        raise ApplicationError(code="INVALID_AMOUNT_FILTER", message="Minimum amount exceeds maximum amount", status_code=422)
    addresses = {row.id: row for row in db.execute(select(AddressRecord)).scalars()}
    assets = {row.id: row for row in db.execute(select(Asset)).scalars()}
    txs = list(db.execute(select(NormalizedTransaction).where(
        NormalizedTransaction.event_time <= end_time,
        NormalizedTransaction.available_time <= run.cutoff_available_time,
    ).order_by(NormalizedTransaction.event_time, NormalizedTransaction.tx_hash, NormalizedTransaction.transfer_index)).scalars())
    outgoing: dict[str, list[NormalizedTransaction]] = {}
    for tx in txs:
        if request.chain and tx.chain.upper() != request.chain.upper():
            continue
        asset = assets.get(tx.asset_id)
        if request.asset and (asset is None or request.asset.upper() not in {asset.symbol.upper(), (asset.contract_address or "").upper()}):
            continue
        if minimum is not None and tx.amount < minimum:
            continue
        if maximum is not None and tx.amount > maximum:
            continue
        outgoing.setdefault(tx.from_address_id, []).append(tx)

    queue = deque((root, 0, []) for root in run.root_address_ids)
    visited_depth: dict[str, int] = {root: 0 for root in run.root_address_ids}
    edges: list[dict[str, Any]] = []
    paths: list[dict[str, Any]] = []
    while queue:
        address_id, depth, prior = queue.popleft()
        if depth >= max_hops:
            continue
        for tx in outgoing.get(address_id, []):
            source, target, asset = addresses.get(tx.from_address_id), addresses.get(tx.to_address_id), assets.get(tx.asset_id)
            if not source or not target or not asset:
                continue
            edge = {"id": tx.id, "transaction_id": tx.id, "chain": tx.chain, "tx_hash": tx.tx_hash,
                    "transfer_index": tx.transfer_index, "source": f"{source.chain}:{source.canonical_address}",
                    "target": f"{target.chain}:{target.canonical_address}", "source_address": source.canonical_address,
                    "target_address": target.canonical_address, "asset": asset.symbol, "asset_contract": asset.contract_address,
                    "amount": str(tx.amount), "raw_amount": tx.raw_amount, "event_time": tx.event_time.isoformat(),
                    "available_time": tx.available_time.isoformat(), "status": tx.status, "finality_state": tx.finality_state,
                    "hop": depth + 1}
            edges.append(edge)
            path = prior + [edge["id"]]
            paths.append({"edge_ids": path, "hop_count": len(path), "terminal_node": edge["target"]})
            next_depth = depth + 1
            known = visited_depth.get(tx.to_address_id)
            if next_depth < max_hops and (known is None or next_depth < known):
                visited_depth[tx.to_address_id] = next_depth
                queue.append((tx.to_address_id, next_depth, path))
    return edges, paths


def _partition(edge: dict[str, Any], report: ReportEvent | None, request: GraphRequest) -> str:
    if edge["status"] not in {"confirmed", "finalized"}:
        return "unknown"
    if report is None:
        return "all_history"
    moment = datetime.fromisoformat(edge["event_time"])
    if moment < report.report_timestamp:
        return "pre_report"
    if moment == report.report_timestamp:
        return "at_report"
    return "post_report"


def graph_payload(case, request: GraphRequest, db: Session) -> dict[str, Any]:
    if request.temporal_view not in {"all", "pre_report", "post_report"}:
        raise ApplicationError(code="INVALID_TEMPORAL_VIEW", message="Unsupported temporal view", status_code=422)
    if request.boundary not in {"exclusive", "inclusive"}:
        raise ApplicationError(code="INVALID_BOUNDARY", message="Boundary must be exclusive or inclusive", status_code=422)
    report = _report_for(case, request, db)
    run = _run_for(case.id, report, request, db)
    if run is None:
        return {"case_id": case.id, "trace_id": None, "report_event": None, "nodes": [], "edges": [], "context_nodes": [], "context_edges": [],
                "summary": {"selected_transfer_count": 0, "context_transfer_count": 0, "boundary_transfer_count": 0, "unknown_time_count": 0},
                "read_only": True, "coverage": {"state": "not_traced"}}
    edges, paths = _transaction_rows(run, request, db)
    selected, context, boundary_count, unknown_count = [], [], 0, 0
    for edge in edges:
        partition = _partition(edge, report, request)
        edge = {**edge, "temporal_partition": partition}
        include = request.temporal_view == "all" or (request.temporal_view == "pre_report" and partition == "pre_report") or (
            request.temporal_view == "post_report" and (partition == "post_report" or (request.boundary == "inclusive" and partition == "at_report")))
        if partition == "at_report":
            boundary_count += 1
        if partition == "unknown":
            unknown_count += 1
        if include:
            selected.append(edge)
        elif request.include_context and partition != "unknown":
            context.append({**edge, "context_only": True})
    def nodes_for(collection):
        values = {entry["source"]: {"id": entry["source"], "address": entry["source_address"], "chain": entry["chain"]} for entry in collection}
        values.update({entry["target"]: {"id": entry["target"], "address": entry["target_address"], "chain": entry["chain"]} for entry in collection})
        return list(values.values())
    summary = {"selected_transfer_count": len(selected), "context_transfer_count": len(context), "boundary_transfer_count": boundary_count,
               "unknown_time_count": unknown_count, "total_reachable_transfer_count": len(edges), "max_hops": min(6, max(1, int(run.parameters.get("max_hops", 4)))),
               "selected_amount": str(sum((Decimal(item["amount"]) for item in selected), Decimal("0")))}
    return {"case_id": case.id, "trace_id": run.id, "trace_revision": run.revision,
            "report_event": None if report is None else {"id": report.id, "revision": report.revision, "reported_at": report.report_timestamp.isoformat()},
            "event_cutoff": run.event_cutoff.isoformat(), "availability_cutoff": run.cutoff_available_time.isoformat(),
            "temporal_view": request.temporal_view, "boundary": request.boundary, "nodes": nodes_for(selected), "edges": selected,
            "context_nodes": nodes_for(context), "context_edges": context, "paths": paths, "summary": summary, "read_only": True, "coverage": run.coverage}


def materialize_trace_graph(session: Session, *, run_id: str) -> GraphSnapshot:
    """Persist an immutable snapshot and path records; callers own the transaction."""
    run = session.get(AnalysisRun, run_id)
    if run is None:
        raise ApplicationError(code="TRACE_NOT_FOUND", message="Trace run not found", status_code=404)
    existing = session.execute(select(GraphSnapshot).where(GraphSnapshot.run_id == run.id).order_by(GraphSnapshot.revision.desc()).limit(1)).scalar_one_or_none()
    if existing is not None:
        return existing
    from models import Case
    case = session.get(Case, run.case_id)
    request = GraphRequest(trace_id=run.id, report_event_id=run.report_event_id)
    payload = graph_payload(case, request, session)
    for index, path in enumerate(payload["paths"], start=1):
        session.add(TracePath(run_id=run.id, path_index=index, hop_count=path["hop_count"], path_payload=path,
                              evidence_digest=_digest(path)))
    snapshot = RevisionRepository(session).append(GraphSnapshot, "case_id", case.id, run_id=run.id,
        report_event_id=run.report_event_id, cutoff_available_time=run.cutoff_available_time,
        node_count=len(payload["nodes"]), edge_count=len(payload["edges"]), content_digest=_digest(payload),
        selected_filters={"temporal_view": "all", "event_cutoff": run.event_cutoff.isoformat()}, membership_digest=_digest(payload["edges"]),
        projection_revision=1, continuity_gaps=[], summary=payload)
    return snapshot
