"""Liveness, readiness, and configuration-safe system endpoints."""

from fastapi import APIRouter, Request

from app.controllers.system import liveness_payload, readiness_payload


router = APIRouter(tags=["System"])


@router.get("/health/live")
def liveness(request: Request):
    return liveness_payload(request.app.state.settings)


@router.get("/health/ready")
def readiness(request: Request):
    return readiness_payload(request.app.state.settings)
