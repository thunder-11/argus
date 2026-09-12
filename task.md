# CFAS Development Tasks

## Phase 1: Backend Foundation
- [ ] `requirements.txt` + `config.py` (API key slots)
- [ ] `database.py` + `models.py` (SQLAlchemy ORM)
- [ ] `seed_data.py` (VASP directory, mixers, demo cases)
- [ ] `auth/` (JWT login, role checks)

## Phase 2: Core Engines
- [ ] `services/blockchain/` (TronGrid, Etherscan, BscScan, Blockstream — with demo fallback)
- [ ] `services/tracer.py` (Value-weighted BFS)
- [ ] `services/attribution.py` (3-tier VASP)
- [ ] `services/risk_scoring.py` + `services/correlation.py`
- [ ] `services/typology.py` (fraud classifier)
- [ ] `services/report_generator.py` (PDF: Sec 94 BNSS + Sec 63 BSA)

## Phase 3: API Routes
- [ ] All routers (complaints, traces, graphs, cases, alerts, vasp, notices, reports, dashboard)
- [ ] `main.py` (FastAPI app wiring)

## Phase 4: Frontend
- [ ] Vite + React scaffold
- [ ] Dark cyberpunk design system (index.css)
- [ ] Login, Dashboard, New Trace pages
- [ ] Trace Results page (React Flow graph + attribution banner)
- [ ] Freeze Notice + Report pages
- [ ] VASP Directory + Admin pages
- [ ] Alert bell, risk gauge, syndicate panel components
