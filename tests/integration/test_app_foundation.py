from app.core.config import settings


def test_healthcheck_returns_version(test_client) -> None:
    response = test_client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": settings.app_version}


def test_not_found_handler_returns_structured_json(test_client) -> None:
    response = test_client.get("/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {"error": "not_found", "detail": "Not Found"}
