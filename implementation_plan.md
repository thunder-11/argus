# SIH26183 Backend Implementation Plan

Source PRD: `PRD_SIH26183_Backend_ML_Updated.md`  
Repository target: `https://github.com/thunder-11/argus.git`  
Working branch: `sih26183/implementation`  
Commit author: use the repository/user Git identity, not an assistant identity.

## Operating Rules

- Follow the updated PRD as the authoritative specification for SIH26183.
- Implement phase by phase. A phase is complete only after its scoped tests pass, `progress.md` is updated with evidence, and the phase commit is pushed to GitHub.
- Preserve valid existing backend behavior unless the PRD requires replacement or stricter behavior.
- Do not reuse, extend, copy, or depend on the existing backend ML. The ML system must be rebuilt from scratch.
- Integrate the existing frontend through API contracts only. Do not redesign or rebuild the frontend.
- Use real blockchain and external APIs in production paths. Demo or fixture data may exist only as isolated development/test fixtures and must never silently replace production retrieval.
- Store all credentials in environment variables. Never hardcode secrets.
- Keep pre-report evidence and post-report activity explicitly separated in data models, APIs, graphs, ML features, explanations, and reports.
- Avoid staging unrelated deletions or generated artifacts. Each commit should include only the phase files and changes required for that phase.

## Phase 0 - Planning and Baseline

Goal: Establish the implementation baseline and make the PRD executable as a tracked plan.

Scope:
- Create this implementation plan and `progress.md`.
- Inventory current backend routes, services, data models, frontend API usage, fixtures, and generated artifacts.
- Record existing startup, lint, test, and build status without treating current failures as completed work.
- Map PRD acceptance criteria and checklist items to implementation phases.
- Confirm GitHub target branch and commit identity.

Tests and checks:
- `git status --short --branch`
- Backend dependency and startup check where available.
- Frontend install/build/lint check where available.
- PRD file existence and checksum record.

Exit criteria:
- `implementation_plan.md` and `progress.md` exist.
- `progress.md` records the repo, branch, PRD source, baseline findings, and Phase 0 evidence.
- Phase 0 commit is pushed to `sih26183/implementation`.

## Phase 1 - Modular Backend Foundation and Test Harness

Goal: Restructure the backend around clear module boundaries while preserving compatible behavior needed by the existing frontend.

Scope:
- Separate API/routes, controllers, services, repositories, provider adapters, analytics/risk engine, jobs, integrations, auth/security, config, and utilities.
- Add a focused test harness for backend API contracts, service units, and integration boundaries.
- Standardize response envelopes, pagination, error objects, correlation IDs, and request IDs.
- Replace implicit production demo fallback with explicit development/test fixture modes.
- Add configuration validation for required provider credentials and runtime modes.
- Add OpenAPI generation checks.

Tests and checks:
- Backend unit tests for config, errors, auth dependency, and route registration.
- Contract tests for existing frontend-facing endpoints.
- Secret redaction tests.
- Frontend build/lint smoke check for unchanged integration compatibility.

Exit criteria:
- Backend starts with validated configuration.
- Existing frontend can still call preserved/compatibility endpoints.
- CI or local equivalent runs the baseline test suite.
- Progress is updated and the phase commit is pushed.

## Phase 2 - Persistence and Durable Processing

Goal: Introduce durable storage and asynchronous processing required for investigations, traces, reports, and ML lineage.

Scope:
- Add PostgreSQL migrations for cases, report events, wallets, addresses, transactions, entities, traces, graph snapshots, risk results, ML predictions, reviews, reports, audit logs, and job state.
- Add immutable evidence, run, graph, report, and prediction revisions.
- Store event time, available time, ingestion time, source provenance, exact decimal amounts, fiat valuation provenance, and chain finality metadata.
- Add Redis/Celery or equivalent queue architecture with outbox/retry semantics.
- Add Neo4j or rebuildable graph persistence if selected by the PRD architecture.
- Keep SQLite only as an explicit local fixture or development option.

Tests and checks:
- Migration upgrade and rollback tests.
- Repository tests for exact amounts, timestamps, revision immutability, and deduplication.
- Queue retry/idempotency tests.
- Cache isolation tests by chain, wallet, provider, and case.

Exit criteria:
- Database schema supports all PRD entities and temporal fields.
- Background jobs are durable and idempotent.
- Progress is updated and the phase commit is pushed.

## Phase 3 - Identity, Intake, and Case Workflow

Goal: Implement secure victim-reported wallet intake and investigation workflow.

Scope:
- Authentication, token expiry/revocation, roles, case scoping, and analyst permissions.
- Complaint/case creation with wallet validation, chain detection, manual chain selection, victim report timestamp capture, timezone handling, and idempotent duplicate handling.
- Report event model with immutable corrections and revisioning.
- Case lifecycle: new, investigating, escalated to VASP, frozen, closed, with compatibility aliases for existing frontend states if needed.
- Assignment, notes, attachments metadata, status history, and audit logging.
- Automatically queue exactly one analysis run per valid intake unless explicitly retried.

Tests and checks:
- Unauthorized, cross-case, and role-denied tests.
- Invalid wallet, ambiguous wallet, duplicate submission, and timezone tests.
- Report timestamp correction tests.
- Case lifecycle and audit trail tests.

Exit criteria:
- Intake records exact victim report timestamp and primary report event.
- Case operations are scoped and auditable.
- Progress is updated and the phase commit is pushed.

## Phase 4 - Real Blockchain Ingestion

Goal: Retrieve real blockchain data through provider adapters with provenance and resilient limits.

Scope:
- Provider adapter interface for adding chains or providers without rewrites.
- Initial required chains: Bitcoin, Ethereum, Tron, BSC, and Polygon.
- Retrieve native transfers, token transfers, transaction receipts/logs where applicable, balances, timestamps, confirmations/finality, and source metadata.
- Add provider keys via environment variables such as `ETHERSCAN_API_KEY`, `TRONGRID_API_KEY`, `BSCSCAN_API_KEY`, `POLYGONSCAN_API_KEY`, and Bitcoin provider placeholders.
- Implement pagination, backoff, retries, rate-limit handling, source freshness, and provider error normalization.
- Convert values using exact decimal math and record fiat valuation source/time.

Tests and checks:
- Adapter contract tests with recorded fixtures.
- Live smoke tests gated by available API keys.
- Pagination, retry, rate-limit, reorg/finality, and malformed-provider-response tests.
- Precision tests for native and token amounts.

Exit criteria:
- Production path does not fabricate blockchain transactions.
- Provider failures are visible and recoverable.
- Progress is updated and the phase commit is pushed.

## Phase 5 - Tracing and Temporal Transaction Graphs

Goal: Build bounded transaction tracing and graph APIs with exact pre-report/post-report separation.

Scope:
- Bounded multi-hop tracing with default depth 4 and demonstrable support through depth 6.
- Persist trace runs, visited wallets, normalized transactions, paths, and graph snapshots.
- Implement Transaction Graph Post-Report Filtering:
  - The victim report timestamp `T0` is the exact timestamp of the selected immutable report event revision.
  - Store UTC, original timezone/offset, and timestamp precision.
  - Default post-report filter is exclusive: `event_time > T0`.
  - Inclusive mode may be requested explicitly: `event_time >= T0`.
  - Pre-report evidence is `event_time < T0`.
  - Boundary-equal events are excluded from default post-report view unless inclusive mode is requested.
  - Unknown event times are excluded from filtered totals and returned in separate unknown-time metadata.
  - Pre-report context may be returned as contextual nodes/edges but must not be counted in post-report totals.
- Add graph query parameters for temporal view, report event revision, boundary mode, context inclusion, chain/entity filters, amount bounds, depth, and pagination/cursors.
- Ensure graph GET endpoints are read-only and never trigger tracing side effects.

Tests and checks:
- Tests for before, equal, after, inclusive, exclusive, missing `T0`, unknown timestamp, multiple report events, and corrected report revision.
- Tests for contextual pre-report edges excluded from post-report totals.
- 5-hop and 6-hop graph tests with bounded limits.
- Cursor and filter composition tests.

Exit criteria:
- Graph APIs satisfy all temporal filtering acceptance criteria.
- Pre-report evidence and post-report activity remain separate in responses and reports.
- Progress is updated and the phase commit is pushed.

## Phase 6 - Attribution and Deterministic Analytics

Goal: Identify exchanges/VASPs and suspicious activity using deterministic evidence before ML scoring.

Scope:
- VASP/exchange directory model with labels, source provenance, confidence, review status, jurisdiction, service type, and effective dates.
- Wallet/entity clustering rules with explainable evidence and false-positive controls.
- Identify direct deposits, nearest VASP, intermediary wallets, peel chains, fan-in/fan-out, bridges, mixers/tumblers, high-risk services, and cross-victim links.
- Add bridge and mixer boundary handling without making unsupported exit assumptions.
- Add independent deterministic risk rules and typology tags separate from ML outputs.

Tests and checks:
- Label import and provenance tests.
- Nearest VASP path tests.
- Shared-service false-positive tests.
- Mixer/bridge boundary tests.
- Cross-victim correlation tests requiring distinct victims and excluding public service-only matches.

Exit criteria:
- VASP attribution produces evidence-backed confidence and limitations.
- Rules are explainable and separate from ML predictions.
- Progress is updated and the phase commit is pushed.

## Phase 7 - Fresh ML Data and Feature Platform

Goal: Build a new ML dataset and feature pipeline from scratch with no dependency on existing backend ML.

Scope:
- Define ML tasks: wallet-level fraud-linked risk support, transaction-level risk support, pattern/typology multilabel support, and abstention/unknown outcomes.
- Define label states: positive, negative, unknown, disputed, and censored.
- Collect data from approved sources with provenance, license/usage notes, chain coverage, label rationale, and maturation windows.
- Add dual-review/adjudication workflow for gold labels.
- Build point-in-time preprocessing with event-time and available-time cutoffs.
- Engineer temporal and graph features including velocity windows, counterparties, fan-in/fan-out, asset diversity, splitting entropy, peeling depth, VASP proximity, protocol exposure, historical complaint exposure, and provider coverage.
- Maintain separate feature modes for baseline at `T0`, post-report activity through `T1`, and retrospective analysis.
- Prevent leakage from future transactions, report outcomes, analyst decisions, labels unavailable at prediction time, and graph display filters.

Tests and checks:
- No imports or dependencies from existing backend ML modules/artifacts.
- Feature cutoff tests for event time and available time.
- Grouped chronological split tests.
- Unknown/disputed label handling tests.
- Privacy and poisoning-resistance checks for dataset ingestion.

Exit criteria:
- Versioned dataset and feature definitions are reproducible.
- Pre-report and post-report ML evidence are explicitly separated.
- Progress is updated and the phase commit is pushed.

## Phase 8 - Fresh ML Training, Validation, and Evaluation

Goal: Train and evaluate new ML models with measurable quality gates and no fabricated accuracy claims.

Scope:
- Establish baseline models such as logistic regression and challenger models such as gradient boosted trees or random forests.
- Use chronological train/tune/calibration/test splits with purge/embargo and grouped entities to prevent leakage.
- Handle class imbalance using training-only methods while preserving natural prevalence in validation/test metrics.
- Calibrate probabilities and evaluate confidence quality.
- Track experiments, seeds, package versions, data snapshots, feature definitions, model artifacts, metrics, and lineage.
- Evaluate precision, recall, false positive rate, PR-AUC/average precision, calibration error, Brier/log loss, fairness/cohort gaps where sample sizes permit, and operational latency.

Tests and checks:
- Reproducibility checks for repeated training.
- Split leakage tests.
- Calibration and threshold tests.
- Minimum sample quality gates from the PRD.
- Model card and artifact integrity checks.

Exit criteria:
- A model can be promoted only if it passes PRD quality gates or is explicitly restricted to shadow/advisory mode.
- Progress is updated and the phase commit is pushed.

## Phase 9 - ML Inference, Explainability, and Human Review

Goal: Serve ML predictions as decision support with explainable evidence and analyst review.

Scope:
- Prediction APIs returning risk score, calibrated confidence, contributing signals/features, model version, feature snapshot ID, evidence references, abstention reasons where applicable, and limitations.
- Model status APIs showing active, candidate, shadow, rolled-back, and unavailable states.
- Explainability APIs for local explanations and evidence references.
- Human analyst review/override workflow with immutable reason, reviewer, timestamp, and expiry/review status.
- Model promotion, canary/shadow deployment, rollback, and version pinning for existing investigations.

Tests and checks:
- Prediction response contract tests.
- Abstention and out-of-distribution tests.
- Explanation evidence consistency tests.
- Review/override RBAC and immutability tests.
- Rollback and version pinning tests.

Exit criteria:
- ML is clearly decision support and never definitive proof.
- No existing backend ML is reused.
- Progress is updated and the phase commit is pushed.

## Phase 10 - Real-Time Status, Monitoring, and Alerts

Goal: Provide durable progress tracking, investigator alerts, and operational monitoring.

Scope:
- Analysis job status with queued, running, partial, complete, failed, cancelled, retrying, and unavailable states.
- Durable progress events with replay support for SSE and compatibility WebSocket behavior if the frontend needs it.
- Alert generation for post-report movement, VASP deposits, high-risk paths, repeated victim links, provider failures, and model/risk threshold triggers.
- Notification read/acknowledge states and subscriptions.
- Deposit check endpoints and low-latency partner integration path where available.

Tests and checks:
- SSE reconnect/replay and heartbeat tests.
- Cancel/retry/restart tests.
- Alert deduplication and authorization tests.
- Provider outage and partial-result tests.
- Performance checks for status freshness and deposit lookup where feasible.

Exit criteria:
- Existing frontend can show analysis progress and alerts without polling blind spots.
- Progress is updated and the phase commit is pushed.

## Phase 11 - Reports, Evidence, and Investigator Operations

Goal: Generate standardized, auditable investigation outputs and operational tools.

Scope:
- Report generation with immutable report revisions, evidence manifests, source citations, graph snapshots, risk results, ML model/version details, analyst review/override status, and temporal separation.
- Draft VASP preservation/freezing notices with authorized dispatch workflow where applicable.
- Case search, history, filtering, pagination, exports, and report download.
- Audit log search and operational dashboard metrics.
- Admin settings for providers, labels, models, thresholds, roles, and retention policies.

Tests and checks:
- Report completeness and digest/hash tests.
- Source manifest and immutable revision tests.
- Search/filter/pagination tests.
- Authorized notice workflow tests.
- Audit log coverage tests.

Exit criteria:
- Reports are reproducible from stored evidence revisions.
- Progress is updated and the phase commit is pushed.

## Phase 12 - Existing Frontend Integration

Goal: Wire the existing frontend to the backend contracts without redesigning or rebuilding the UI.

Scope:
- Update existing API clients, contexts, and page bindings only where required by the PRD contracts.
- Replace fabricated findings with real backend responses, explicit loading states, empty states, partial-data states, provider-unavailable states, failed states, and ML-abstained states.
- Preserve current routing and visual design unless minimal contract integration requires small copy/state adjustments.
- Validate flows for login, intake, investigation status, graph filtering, transactions, risk results, entities/exchanges, alerts, reports, and audit/status pages.

Tests and checks:
- Frontend build/lint.
- Contract tests or mocked API tests for key pages.
- Browser smoke path: login to intake to progress to graph to risk to review to report.
- Error, auth expiry, pagination, and unavailable-provider state checks.

Exit criteria:
- Existing frontend works against the implemented backend contracts.
- No frontend redesign is introduced.
- Progress is updated and the phase commit is pushed.

## Phase 13 - Operational Hardening and Release

Goal: Prepare the system for SIH demonstration and maintainable operation.

Scope:
- Monitoring, structured logs, metrics, traces, alerts, drift detection, retraining workflow, fairness monitoring, adversarial robustness checks, backup/restore, rollback, and deployment runbooks.
- API documentation, environment templates, Docker/compose or deployment manifests, health/readiness checks, and operational dashboards.
- End-to-end SIH demo data path using real APIs where credentials are available and isolated fixtures only where explicitly marked.

Tests and checks:
- Full regression suite.
- Security tests for auth, role scope, secret leakage, and audit coverage.
- Load/performance checks against PRD non-functional targets.
- Backup/restore and rollback drills.
- OpenAPI documentation validation.

Exit criteria:
- All PRD acceptance criteria and traceability rows are marked passed, blocked with reason, or deferred with explicit approval.
- Final release commit is pushed to GitHub.

## API Contract Areas to Preserve and Expand

- Authentication: login, refresh/revoke where implemented, current user, role and case scope.
- Investigation intake: case creation, victim report timestamp, wallet validation, chain detection, duplicate handling.
- Status and progress: investigation status, analysis run status, durable progress stream, retries, cancellation.
- Transactions: normalized transaction history with chain, asset, amounts, direction, counterparties, event time, available time, source, and pagination.
- Graphs: graph snapshots, temporal filters, post-report filtering, context edges, paths, entities, clusters, and export references.
- Risk: deterministic rules, ML predictions, confidence, explanations, contributing signals, model version, analyst review, and overrides.
- Entities and exchanges: VASP identification, evidence, labels, confidence, directory metadata, and nearest exchange paths.
- Alerts: alert listing, read/acknowledge, subscriptions, source events, and deduplication keys.
- Reports: report creation, status, revision metadata, download, evidence manifest, and freezing notice draft workflow.
- Search/history: cases, wallets, transactions, entities, alerts, reports, and audit logs with filtering, sorting, and pagination.
- Errors: consistent error code, message, details, trace ID, retryability, and user-safe frontend state.

## Phase Completion Checklist

For every phase:

1. Mark the phase as `in_progress` in `progress.md`.
2. Implement only the scoped work for that phase.
3. Run required tests and checks.
4. Record commands, outcomes, evidence, skipped checks, blockers, and risks in `progress.md`.
5. Mark acceptance criteria as passed, blocked, or deferred with a concrete reason.
6. Stage only intended files.
7. Commit using the configured user identity.
8. Push to `origin sih26183/implementation`.
9. Verify the remote commit SHA.
10. Update `progress.md` with the verified SHA before starting the next phase.

