from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Case, CaseStatus, Scan, Tenant, User
from app.schemas import CaseOut


def enrich_case(db: Session, case: Case) -> CaseOut:
    origin = db.get(Tenant, case.originating_tenant_id)
    tenant = db.get(Tenant, case.tenant_id) if case.tenant_id else None
    agent = db.get(User, case.assigned_agent_id) if case.assigned_agent_id else None
    return CaseOut(
        id=case.id,
        vin=case.vin,
        plate=case.plate,
        status=case.status,
        tenant_id=case.tenant_id,
        originating_tenant_id=case.originating_tenant_id,
        assigned_agent_id=case.assigned_agent_id,
        created_at=case.created_at,
        claimed_at=case.claimed_at,
        closed_at=case.closed_at,
        originating_tenant_name=origin.name if origin else None,
        tenant_name=tenant.name if tenant else None,
        assigned_agent_name=agent.full_name if agent else None,
        is_claimable=case.status == CaseStatus.pending_claim,
    )


def get_active_case_for_tenant_vin(db: Session, tenant_id: UUID, vin: str) -> Case | None:
    return (
        db.query(Case)
        .filter(
            Case.tenant_id == tenant_id,
            Case.vin == vin,
            Case.status == CaseStatus.active,
        )
        .first()
    )


def get_pending_case_for_vin(db: Session, vin: str) -> Case | None:
    return (
        db.query(Case)
        .filter(Case.vin == vin, Case.status == CaseStatus.pending_claim)
        .first()
    )


def list_visible_cases(
    db: Session,
    viewer: User,
    status_filter: CaseStatus | None = None,
) -> list[Case]:
    query = db.query(Case).filter(
        or_(
            Case.tenant_id == viewer.tenant_id,
            Case.status == CaseStatus.pending_claim,
        )
    )
    if status_filter is not None:
        query = query.filter(Case.status == status_filter)
    return query.order_by(Case.created_at.desc()).all()


def assert_can_view_case(viewer: User, case: Case) -> None:
    if case.status == CaseStatus.pending_claim or case.tenant_id == viewer.tenant_id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You cannot view this case",
    )


def claim_case(db: Session, case: Case, user: User) -> Case:
    if case.status != CaseStatus.pending_claim:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Case is not claimable (status={case.status.value})",
        )

    if get_active_case_for_tenant_vin(db, user.tenant_id, case.vin):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your tenant already has an active case for this VIN",
        )

    case.tenant_id = user.tenant_id
    case.assigned_agent_id = user.id
    case.status = CaseStatus.active
    case.claimed_at = datetime.now(timezone.utc)
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def get_scans_for_case(db: Session, case: Case) -> list[Scan]:
    return (
        db.query(Scan)
        .filter(Scan.vin == case.vin)
        .order_by(Scan.scanned_at.asc())
        .all()
    )
