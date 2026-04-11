import shutil
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent
DEFAULT_ENV_FILE = PROJECT_ROOT / ".env"
DATA_ROOT = PROJECT_ROOT / "data"
UPLOAD_ROOT = PROJECT_ROOT / "uploads"
PROD_DATA_DIR = DATA_ROOT / "prod"
TEST_DATA_DIR = DATA_ROOT / "test"
DEFAULT_DATABASE_PATH = PROD_DATA_DIR / "rerooted.db"
DEFAULT_TEST_DATABASE_PATH = TEST_DATA_DIR / "rerooted.test.db"
DEFAULT_UPLOAD_DIR = UPLOAD_ROOT / "prod"
DEFAULT_TEST_UPLOAD_DIR = UPLOAD_ROOT / "test"
LEGACY_DATABASE_PATH = PROJECT_ROOT / "rerooted.db"
LEGACY_UPLOAD_DIR = UPLOAD_ROOT


def _sqlite_url_for(path: Path) -> str:
    return f"sqlite:///{path.resolve().as_posix()}"


def _sqlite_path_from_url(url: str) -> Path | None:
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        return None

    raw_path = url.removeprefix(prefix)
    if raw_path.startswith("/") and len(raw_path) > 2 and raw_path[2] == ":":
        raw_path = raw_path[1:]
    return Path(raw_path).resolve()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(DEFAULT_ENV_FILE),
        env_file_encoding="utf-8",
    )

    app_name: str = "ReRooted"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str = _sqlite_url_for(DEFAULT_DATABASE_PATH)
    test_database_url: str = _sqlite_url_for(DEFAULT_TEST_DATABASE_PATH)

    upload_dir: Path = DEFAULT_UPLOAD_DIR
    test_upload_dir: Path = DEFAULT_TEST_UPLOAD_DIR
    max_upload_size_mb: int = 20

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    def __init__(self, **values):
        super().__init__(**values)

        self.upload_dir = self.upload_dir.resolve()
        self.test_upload_dir = self.test_upload_dir.resolve()

        for directory in (
            DATA_ROOT,
            PROD_DATA_DIR,
            TEST_DATA_DIR,
            LEGACY_UPLOAD_DIR,
            self.upload_dir,
            self.test_upload_dir,
        ):
            directory.mkdir(parents=True, exist_ok=True)

        self._copy_legacy_database_if_needed()

    def _copy_legacy_database_if_needed(self) -> None:
        target_path = _sqlite_path_from_url(self.database_url)
        if target_path is None:
            return

        default_target = DEFAULT_DATABASE_PATH.resolve()
        if target_path != default_target or target_path.exists() or not LEGACY_DATABASE_PATH.exists():
            return

        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(LEGACY_DATABASE_PATH, target_path)

        for suffix in ("-wal", "-shm"):
            legacy_sidecar = Path(f"{LEGACY_DATABASE_PATH}{suffix}")
            target_sidecar = Path(f"{target_path}{suffix}")
            if legacy_sidecar.exists() and not target_sidecar.exists():
                shutil.copy2(legacy_sidecar, target_sidecar)


settings = Settings()
