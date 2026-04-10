from app.core.config import settings


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
