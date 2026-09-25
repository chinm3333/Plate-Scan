from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models import CaseStatus, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    role: UserRole
    tenant_id: UUID
    tenant_name: str | None = None


class ScanIngestRequest(BaseModel):
    camera_id: str
    plate: str
    vin: str
    latitude: float
    longitude: float
    scanned_at: datetime
    image_url: str | None = None


class ScanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    camera_id: str
    tenant_id: UUID
    plate: str
    vin: str
    latitude: float
    longitude: float
    scanned_at: datetime
    image_url: str | None = None
    matched_case_id: UUID | None = None


class ScanIngestResponse(BaseModel):
    scan: ScanOut
    flow: str
    case_id: UUID | None = None
    message: str


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vin: str
    plate: str | None = None
    status: CaseStatus
    tenant_id: UUID | None = None
    originating_tenant_id: UUID
    assigned_agent_id: UUID | None = None
    created_at: datetime
    claimed_at: datetime | None = None
    closed_at: datetime | None = None
    originating_tenant_name: str | None = None
    tenant_name: str | None = None
    assigned_agent_name: str | None = None
    is_claimable: bool = False


class EligibilityRequest(BaseModel):
    vin: str


class EligibilityResponse(BaseModel):
    vin: str
    still_eligible_for_repo: bool
