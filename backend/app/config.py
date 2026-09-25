from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./plate_scan.db"
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    eligibility_url: str = "http://127.0.0.1:8000/mock/partner-network/eligibility"

    class Config:
        env_file = ".env"


settings = Settings()
