from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Camera, Case, CaseStatus, Scan
from app.schemas import ScanIngestRequest, ScanIngestResponse, ScanOut
from app.services.cases import get_active_case_for_tenant_vin, get_pending_case_for_vin
from app.services.eligibility import check_eligibility


async def ingest_scan(db: Session, payload: ScanIngestRequest) -> ScanIngestResponse:
    camera = db.get(Camera, payload.camera_id)
    if camera is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown camera_id: {payload.camera_id}",
        )

    tenant_id: UUID = camera.tenant_id
    scan = Scan(
        camera_id=payload.camera_id,
        tenant_id=tenant_id,
        plate=payload.plate,
        vin=payload.vin,
        latitude=payload.latitude,
        longitude=payload.longitude,
        scanned_at=payload.scanned_at,
        image_url=payload.image_url,
    )
    db.add(scan)
    db.flush()

    active = get_active_case_for_tenant_vin(db, tenant_id, payload.vin)
    if active:
        scan.matched_case_id = active.id
        db.commit()
        db.refresh(scan)
        return ScanIngestResponse(
            scan=ScanOut.model_validate(scan),
            flow="existing_case",
            case_id=active.id,
            message="Scan stored and linked to existing active case.",
        )

    eligible = await check_eligibility(payload.vin)
    if not eligible:
        db.commit()
        db.refresh(scan)
        return ScanIngestResponse(
            scan=ScanOut.model_validate(scan),
            flow="new_case_not_eligible",
            case_id=None,
            message="Scan stored. Vehicle not eligible; no case created.",
        )

    existing_pending = get_pending_case_for_vin(db, payload.vin)
    if existing_pending:
        scan.matched_case_id = existing_pending.id
        db.commit()
        db.refresh(scan)
        return ScanIngestResponse(
            scan=ScanOut.model_validate(scan),
            flow="new_case_skipped",
            case_id=existing_pending.id,
            message="Scan stored. A pending_claim case already exists for this VIN.",
        )

    case = Case(
        vin=payload.vin,
        plate=payload.plate,
        status=CaseStatus.pending_claim,
        tenant_id=None,
        originating_tenant_id=tenant_id,
    )
    db.add(case)
    db.flush()
    scan.matched_case_id = case.id
    db.commit()
    db.refresh(scan)
    db.refresh(case)

    return ScanIngestResponse(
        scan=ScanOut.model_validate(scan),
        flow="new_case_created",
        case_id=case.id,
        message="Scan stored. pending_claim case created.",
    )
