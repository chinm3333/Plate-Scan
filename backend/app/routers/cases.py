from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Case, CaseStatus, User
from app.schemas import CaseOut, ScanOut
from app.services.cases import (
    assert_can_view_case,
    claim_case,
    enrich_case,
    get_scans_for_case,
    list_visible_cases,
)

router = APIRouter(prefix="/api/v1/cases", tags=["cases"])


@router.get("", response_model=list[CaseOut])
def list_cases(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status_filter: Annotated[CaseStatus | None, Query(alias="status")] = None,
):
    cases = list_visible_cases(db, current_user, status_filter)
    return [enrich_case(db, c) for c in cases]


@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    case = db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    assert_can_view_case(current_user, case)
    return enrich_case(db, case)


@router.post("/{case_id}/claim", response_model=CaseOut)
def claim(
    case_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    case = db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return enrich_case(db, claim_case(db, case, current_user))


@router.get("/{case_id}/scans", response_model=list[ScanOut])
def case_scans(
    case_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    case = db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    assert_can_view_case(current_user, case)
    return [ScanOut.model_validate(s) for s in get_scans_for_case(db, case)]
