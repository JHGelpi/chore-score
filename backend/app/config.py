from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings and configuration."""

    # Database settings
    database_url: str = "postgresql://chores_user:chores_password@db:5432/chores_db"

    # Application settings
    secret_key: str = "your-secret-key-change-in-production"
    admin_email: str = "admin@example.com"

    # Server settings
    host: str = "192.168.170.53"
    port: int = 8001

    # Application settings
    week_start_day: str = "monday"
    timezone: str = "America/New_York"  # Eastern timezone

    # Optional email settings
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@chores-app.com"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
