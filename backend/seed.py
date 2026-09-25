from datetime import datetime, timedelta, timezone

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Camera, Case, CaseStatus, Scan, Tenant, User, UserRole

VIN_A = "1FTFW1E51NFA12345"
VIN_B = "5NPE34AF9KH123456"


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Tenant).count() > 0:
            print("Database already seeded — skipping.")
            return

        tenant_a = Tenant(name="Recovery Agency A")
        tenant_b = Tenant(name="Recovery Agency B")
        db.add_all([tenant_a, tenant_b])
        db.flush()

        user_a = User(
            tenant_id=tenant_a.id,
            email="agent.a@agency-a.test",
            full_name="Alex Agent (Tenant A)",
            hashed_password=hash_password("password"),
            role=UserRole.staff,
        )
        user_b = User(
            tenant_id=tenant_b.id,
            email="agent.b@agency-b.test",
            full_name="Blake Agent (Tenant B)",
            hashed_password=hash_password("password"),
            role=UserRole.staff,
        )
        db.add_all([user_a, user_b])
        db.flush()

        db.add_all(
            [
                Camera(id="cam_1001", tenant_id=tenant_a.id, label="Truck 1 — Agency A"),
                Camera(id="cam_2050", tenant_id=tenant_b.id, label="Truck 1 — Agency B"),
            ]
        )
        db.flush()

        case_a = Case(
            vin=VIN_A,
            plate="7XYZ123",
            status=CaseStatus.active,
            tenant_id=tenant_a.id,
            originating_tenant_id=tenant_a.id,
            assigned_agent_id=user_a.id,
            claimed_at=datetime.now(timezone.utc) - timedelta(days=5),
        )
        db.add(case_a)
        db.flush()

        now = datetime.now(timezone.utc)
        db.add_all(
            [
                Scan(
                    camera_id="cam_1001",
                    tenant_id=tenant_a.id,
                    plate="7XYZ123",
                    vin=VIN_A,
                    latitude=33.7490,
                    longitude=-84.3880,
                    scanned_at=now - timedelta(days=4, hours=2),
                    image_url="https://example.com/scans/img_older_1.jpg",
                    matched_case_id=case_a.id,
                ),
                Scan(
                    camera_id="cam_1001",
                    tenant_id=tenant_a.id,
                    plate="7XYZ123",
                    vin=VIN_A,
                    latitude=33.7701,
                    longitude=-84.3900,
                    scanned_at=now - timedelta(days=2, hours=5),
                    image_url="https://example.com/scans/img_older_2.jpg",
                    matched_case_id=case_a.id,
                ),
                Scan(
                    camera_id="cam_1001",
                    tenant_id=tenant_a.id,
                    plate="7XYZ123",
                    vin=VIN_A,
                    latitude=33.7555,
                    longitude=-84.4001,
                    scanned_at=now - timedelta(days=1, hours=1),
                    image_url="https://example.com/scans/img_older_3.jpg",
                    matched_case_id=case_a.id,
                ),
            ]
        )
        db.commit()

        print("Seed complete.")
        print("  Tenant A: agent.a@agency-a.test / password")
        print("  Tenant B: agent.b@agency-b.test / password")
        print(f"  Existing-case VIN (cam_1001): {VIN_A}")
        print(f"  New-case VIN (cam_2050):      {VIN_B}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
