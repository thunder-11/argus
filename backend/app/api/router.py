"""Single composition root for the current versioned HTTP surface."""

from fastapi import APIRouter

from app.api.routes.system import router as system_router
from auth.router import router as auth_router
from routers.complaints import router as complaints_router
from routers.traces import router as traces_router
from routers.api import alerts_router, cases_router, dashboard_router, notices_router, reports_router, vasp_router


api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(auth_router)
api_router.include_router(complaints_router)
api_router.include_router(traces_router)
api_router.include_router(cases_router)
api_router.include_router(alerts_router)
api_router.include_router(vasp_router)
api_router.include_router(notices_router)
api_router.include_router(reports_router)
api_router.include_router(dashboard_router)
