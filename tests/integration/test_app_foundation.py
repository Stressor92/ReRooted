from app.core.config import settings


def test_runtime_paths_default_to_prod_and_keep_test_separate() -> None:
    assert "/data/prod/" in settings.database_url.replace('\\', '/')
    assert settings.upload_dir.as_posix().endswith('/uploads/prod')
    assert settings.test_upload_dir.as_posix().endswith('/uploads/test')
    assert settings.test_upload_dir != settings.upload_dir
    assert settings.test_database_url != settings.database_url


def test_healthcheck_returns_version(test_client) -> None:
    response = test_client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": settings.app_version}


def test_not_found_handler_returns_structured_json(test_client) -> None:
    response = test_client.get("/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {"error": "not_found", "detail": "Not Found"}


def test_image_export_formats_endpoint(test_client) -> None:
    response = test_client.get("/export/image-formats")

    assert response.status_code == 200
    payload = response.json()
    assert payload["default"] == "png"
    assert [entry["id"] for entry in payload["formats"]] == ["png", "jpg", "svg"]
