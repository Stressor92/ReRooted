from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent
DEFAULT_ENV_FILE = PROJECT_ROOT / ".env"
DEFAULT_DATABASE_PATH = PROJECT_ROOT / "rerooted.db"
DEFAULT_UPLOAD_DIR = PROJECT_ROOT / "uploads"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(DEFAULT_ENV_FILE),
        env_file_encoding="utf-8",
    )

    app_name: str = "ReRooted"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str = f"sqlite:///{DEFAULT_DATABASE_PATH.resolve().as_posix()}"

    upload_dir: Path = DEFAULT_UPLOAD_DIR
    max_upload_size_mb: int = 20

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    def __init__(self, **values):
        super().__init__(**values)
        self.upload_dir = self.upload_dir.resolve()
        self.upload_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
