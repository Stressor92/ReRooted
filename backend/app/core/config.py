from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "ReRooted"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str = "sqlite:///./rerooted.db"

    upload_dir: Path = Path("uploads")
    max_upload_size_mb: int = 20

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    def __init__(self, **values):
        super().__init__(**values)
        self.upload_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
