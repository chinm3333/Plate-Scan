import httpx

from app.config import settings


async def check_eligibility(vin: str) -> bool:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(settings.eligibility_url, json={"vin": vin})
        response.raise_for_status()
        return bool(response.json().get("still_eligible_for_repo"))
