"""
CFAS — Crypto Fraud Attribution System
FastAPI Application Entry Point
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, SessionLocal
from seed_data import seed_all
from auth.router import router as auth_router
from routers.complaints import router as complaints_router
from routers.traces import router as traces_router
from routers.api import (
    cases_router, alerts_router, vasp_router,
    notices_router, reports_router, dashboard_router,
)

app = FastAPI(
    title="CFAS — Crypto Fraud Attribution System",
    description="Real-time blockchain forensic intelligence for Indian law enforcement",
    version="1.0.0",
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════
# WebSocket Connection Manager for Live Graph & Alert Streams
# ═══════════════════════════════════════════════════════════
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, case_id: str, websocket: WebSocket):
        await websocket.accept()
        if case_id not in self.active_connections:
            self.active_connections[case_id] = []
        self.active_connections[case_id].append(websocket)

    def disconnect(self, case_id: str, websocket: WebSocket):
        if case_id in self.active_connections:
            if websocket in self.active_connections[case_id]:
                self.active_connections[case_id].remove(websocket)

    async def broadcast_to_case(self, case_id: str, event_type: str, data: dict):
        if case_id in self.active_connections:
            for connection in self.active_connections[case_id]:
                try:
                    await connection.send_json({"type": event_type, "data": data})
                except Exception:
                    pass

ws_manager = ConnectionManager()

@app.websocket("/ws/trace/{case_id}")
async def websocket_trace_endpoint(websocket: WebSocket, case_id: str):
    await ws_manager.connect(case_id, websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(case_id, websocket)


# Register routers
app.include_router(auth_router)
app.include_router(complaints_router)
app.include_router(traces_router)
app.include_router(cases_router)
app.include_router(alerts_router)
app.include_router(vasp_router)
app.include_router(notices_router)
app.include_router(reports_router)
app.include_router(dashboard_router)


@app.on_event("startup")
def startup():
    init_db()
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "system": "CFAS — Crypto Fraud Attribution System",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "docs": "/docs",
            "auth": "/api/v1/auth/login",
            "complaints": "/api/v1/complaints",
            "cases": "/api/v1/cases",
            "dashboard": "/api/v1/dashboard/stats",
            "websocket": "/ws/trace/{case_id}",
        },
    }
