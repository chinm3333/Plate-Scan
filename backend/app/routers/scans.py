from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import EligibilityRequest, EligibilityResponse, ScanIngestRequest, ScanIngestResponse
from app.services.scans import ingest_scan

router = APIRouter(tags=["scans"])


@router.post("/api/v1/scans", response_model=ScanIngestResponse)
async def create_scan(
    payload: ScanIngestRequest,
    db: Annotated[Session, Depends(get_db)],
):
    return await ingest_scan(db, payload)


@router.post("/mock/partner-network/eligibility", response_model=EligibilityResponse)
def mock_eligibility(payload: EligibilityRequest):
    # VINs ending in "0" are not eligible; all others are.
    return EligibilityResponse(
        vin=payload.vin,
        still_eligible_for_repo=not payload.vin.endswith("0"),
    )
