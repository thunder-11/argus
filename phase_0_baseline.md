# SIH26183 Phase 0 Baseline

Baseline date: 2026-09-12 Asia/Calcutta

Source PRD: `PRD_SIH26183_Backend_ML_Updated.md`

Implementation branch: `sih26183/implementation`

## Purpose

This document records the implementation baseline before functional changes begin. It is an inventory and verification record, not a claim that the current application satisfies the PRD.

## Repository Baseline

| Item | Observed state | Phase impact |
| --- | --- | --- |
| Git remote | `origin` points to `https://github.com/thunder-11/argus.git` | All phase pushes target the implementation branch on this remote. |
| Git identity | `Ali <alizamir9992@gmail.com>` | Every project commit must use this configured identity. |
| Working branch | `sih26183/implementation`, tracking `origin/sih26183/implementation` | Phase work remains isolated from `master`. |
| Authoritative PRD | `PRD_SIH26183_Backend_ML_Updated.md`; SHA256 `B1F7376C8E6C7F255104B2E19BEAD1A0A433D63723D6A6A681F4F19D9E09BCAA` | Changes are accepted against this exact baseline until the PRD is intentionally revised. |
| Unrelated working-tree state | Tracked deletions of the old prototype PRD, checklist, and task file existed before Phase 0 | These deletions are excluded from phase commits unless the user explicitly asks to include them. |
| User-authored plan update | `implementation_plan.md` contains the Live Post-Report Transaction Trail addition | Preserved and included in the Phase 0 planning baseline. |

## Current Backend Inventory

The local backend is a synchronous FastAPI and SQLAlchemy application under `backend/`. It uses SQLite by default, creates tables during startup, and runs an idempotent seed routine on every startup.

### HTTP and streaming surface

| Area | Current routes |
| --- | --- |
| Root and schema | `GET /`, `GET /openapi.json`, interactive FastAPI documentation routes |
| Authentication | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| Complaint intake | `POST /api/v1/complaints` |
| Cases | `GET /api/v1/cases`, `GET /api/v1/cases/{case_id}` |
| Tracing and graph | `POST /api/v1/cases/{case_id}/trace`, `GET /api/v1/cases/{case_id}/graph`, `GET /api/v1/cases/{case_id}/related` |
| Alerts | `GET /api/v1/alerts`, `PUT /api/v1/alerts/{alert_id}/read` |
| VASP directory | `GET /api/v1/vasp/directory`, `GET /api/v1/vasp/addresses`, `POST /api/v1/vasp/addresses`, `DELETE /api/v1/vasp/addresses/{address}/{chain}` |
| Documents | `POST /api/v1/cases/{case_id}/generate-freeze-notice`, `POST /api/v1/cases/{case_id}/generate-court-report` |
| Dashboard | `GET /api/v1/dashboard/stats` |
| Streaming | `WS /ws/trace/{case_id}` uses process-local connections and has no authentication at the connection boundary |

The startup smoke test generated OpenAPI successfully with 17 HTTP paths. The current graph GET route may execute and persist a trace when only an origin wallet exists, so it is not read-only. The trace POST route can synthesize a missing origin wallet. Both behaviors conflict with the target PRD and are scheduled for replacement.

### Models and persistence

Current SQLAlchemy models are `User`, `Case`, `Wallet`, `CaseWallet`, `Transaction`, `VaspDirectory`, `VaspAddress`, `MixerBridgeDirectory`, `LegalNotice`, `ForensicReport`, `Alert`, and `AuditTrail`.

Material baseline gaps include: SQLite as the default operational database; schema creation without migrations; complaint and case data combined; no immutable report-event revisions; no durable analysis-run/job state; no graph snapshots; no prediction/review/model lineage; floating-point transaction and USD fields; incomplete event-time/available-time/source/finality fields; and no tenant/case-scope model. These are assigned to Phases 1-3, 5, 7-11, and 13 as defined below.

### Services and provider behavior

| Current module | Current responsibility | Baseline concern |
| --- | --- | --- |
| `services/blockchain/fetcher.py` | Chain detection, address validation, cache lookup, TRON/EVM/BTC retrieval, directory lookups | Missing credentials globally enable synthetic fallback; API failure can also fall back to demo data; provider logic is not separated into adapters; Polygon is not represented as a first-class provider. |
| `services/tracer.py` | Bounded traversal, graph node/edge creation, sweep and risk-pattern helpers | Runs synchronously in the request path and persists traversal state without durable run revisions. |
| `services/risk_scoring.py` | Deterministic weighted score | Must remain distinct from the new ML subsystem and gain versioned evidence. |
| `services/typology.py` | Keyword-based complaint classification | It is existing heuristic behavior, not an ML design source; the new ML/NLP work may not reuse it as model code, features, labels, weights, or artifacts. |
| `services/correlation.py` | Related-case detection | Requires case scope, distinct-victim, shared-service exclusion, evidence, and qualified confidence controls. |
| `services/report_generator.py` | Freeze-notice and forensic-report PDFs | Requires immutable revisions, evidence manifests, hashes, review gates, and storage controls. |

Configuration currently contains a source-code default JWT secret, wildcard CORS with credentials, fixed provider URLs, and implicit demo mode. Production-safe settings validation and explicit fixture modes are Phase 1 requirements.

## Current Frontend Integration Inventory

The React/Vite frontend already has routes and pages for login, overview, cases, intake, money trail, transaction graph, wallet intelligence, entities, cross-chain activity, alerts, analytics, reports, system status, and settings. Phase 12 may change API clients, contexts, and page bindings only; it must not redesign these screens.

The existing frontend consumes these backend contracts:

- Authentication: login.
- Complaint intake followed by trace creation.
- Case list, case detail, graph, and related cases.
- Dashboard statistics.
- Alerts and read state.
- VASP directory and address list.
- Freeze notice and court-report generation.
- Case trace WebSocket events.

Material integration gaps are a hardcoded `http://localhost:8000` base URL; no refresh/revocation flow; no standardized error envelope; no pagination contract; no durable analysis status; no temporal graph query contract; and no prediction, explanation, model-status, analyst-review, audit, provider-status, or report-history APIs.

Fixture-backed or static behavior is present in the default active case, Cross-Chain page, Reports history, Analytics volumes, System Status claims, generated complaint identifiers, and demo-case fallbacks. Visual particle randomness in the money-trail renderer is presentation-only, but every transaction, path, amount, risk signal, destination, and status must ultimately come from validated backend data.

## Fixtures, Secrets, and Generated Artifacts

| Item | Observed state | Required disposition |
| --- | --- | --- |
| `backend/seed_data.py` | Seeds users, VASPs, demo cases, wallets, transactions, and alerts during startup | Move behind explicit local/test fixture mode; production must never auto-seed. |
| `backend/.env` | Exists locally and is ignored | Never inspect, stage, log, or commit its contents. |
| `backend/.env.example` | Tracked; contains empty provider fields and a change-me secret string | Replace with unambiguous placeholders and complete environment contract in later configuration work. |
| Local SQLite databases | Root and backend database files exist and are ignored | Preserve as local state; do not commit. |
| Python caches and frontend outputs | `__pycache__`, `frontend/node_modules`, and `frontend/dist` are ignored | Build/test by-products remain untracked. |
| PDF outputs | Thirteen PDFs under `backend/reports` and `backend/notices` are tracked | Treat as generated or potentially sensitive artifacts; address retention/removal/migration deliberately in the report/evidence phase. |

## Verification Baseline

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Git status and identity | Pass | Correct branch and configured author confirmed; three unrelated tracked deletions remain. |
| Python availability | Pass | Python 3.14.3. |
| Installed Python environment | Pass with drift | `pip check` reported no broken requirements. Installed FastAPI 0.141.1, Uvicorn 0.52.4, SQLAlchemy 2.0.52, Pydantic 2.12.5, and HTTPX 0.28.1 differ from exact versions in `backend/requirements.txt`. Reproducible environment work remains open. |
| Backend startup smoke | Pass with warnings | FastAPI `TestClient` used `sqlite:///:memory:` and a test secret; startup seeded the isolated database, `GET /` returned 200, and `/openapi.json` returned 200 with 17 paths. A Starlette warning reported deprecated TestClient use with current HTTPX. No real provider calls were made. |
| Backend automated tests | Not available | No repository test suite, pytest configuration, or CI test workflow was found. Phase 1 establishes the harness. |
| Frontend lint | Pass with warnings | `npm run lint` exited 0 but reported unused variables, render/effect immutability issues, effect dependency issues, and an impure render-time random value. |
| Frontend production build | Pass with warning | Vite 8.2.2 built 256 modules. Main JavaScript output was 576.07 kB (176.81 kB gzip), triggering the chunk-size warning. |
| Frontend automated tests | Not available | No frontend test script or test files were found. Contract smoke coverage begins in Phase 1; full binding validation is Phase 12. |
| Live blockchain smoke | Deferred by scope/credentials | Phase 0 does not use local secret values. Provider adapter live checks are gated and recorded in Phase 4. |

## Acceptance Criteria to Phase Map

| Acceptance IDs | Owning phase(s) |
| --- | --- |
| AC-01 | 3 |
| AC-02, AC-23 | 4 |
| AC-03 | 5 |
| AC-04 | 5, 12 |
| AC-05 | 5, 6 |
| AC-06 | 6 |
| AC-07 | 7, 8, 9 |
| AC-08 | 4, 5, 6 |
| AC-09 | 5, 6 |
| AC-10 | 6, 9, 10 |
| AC-11 | 6, 10 |
| AC-12 | 6, 9, 11 |
| AC-13 | 11, 12 |
| AC-14 | 3, 10, 12 |
| AC-15 | 6, 7 |
| AC-16 | 3, 10, 11 |
| AC-17 | 1, 12 |
| AC-18 | 1, 3, 13 |
| AC-19 | 2, 4, 10, 13 |
| AC-20 | 11, 13 |
| AC-21 | 2, 7, 8, 9, 10, 13 |
| AC-22 | 1, 4, 9, 10, 12 |
| AC-24 | 3, 6, 11 |
| TG-01-TG-14 | 5, with persistence/provider/ML/report dependencies from 2, 4, 9, and 11 |
| ML-01-ML-24 | 7, 8, 9, and 13 |

## Checklist to Phase Map

Every checklist row remains explicitly preserved in the PRD's Checklist to PRD Traceability Matrix. The ranges below assign every listed checklist ID to implementation phases; they do not replace or weaken the item-level PRD wording or acceptance references.

| Checklist IDs | Count | Owning phase(s) |
| --- | ---: | --- |
| CK-01.01-CK-01.06 | 6 | 3, 4 |
| CK-02.01-CK-02.08 | 8 | 4, 5 |
| CK-03.01-CK-03.04 | 4 | 5, 12 |
| CK-04.01-CK-04.06 | 6 | 5, 6 |
| CK-05.01-CK-05.11 | 11 | 4, 6 |
| CK-06.01-CK-06.07 | 7 | 6, 7, 8, 9 |
| CK-07.01-CK-07.04 | 4 | 5, 6, 9 |
| CK-08.01-CK-08.13 | 13 | 6, 9, 10, 12 |
| CK-09.01-CK-09.10 | 10 | 6, 10, 11, 12 |
| CK-10.01-CK-10.20 | 20 | 6, 9, 11, 12 |
| CK-11.01-CK-11.16 | 16 | 11, 12 |
| CK-12.01-CK-12.06 | 6 | 3, 10, 12 |

## Phase 0 Exit Decision

Phase 0 is complete when this baseline, the implementation plan, and the progress tracker are committed and the phase commit is verified on `origin/sih26183/implementation`. Runtime warnings and product gaps above are inputs to later phases and do not prevent planning-baseline completion.
