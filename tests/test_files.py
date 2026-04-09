from __future__ import annotations

from app.core.config import settings

MINIMAL_JPEG = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00"
    + b"\x08"
    * 64
    + b"\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x03\x01\x22\x00\x02\x11\x01\x03\x11\x01"
    b"\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08"
    b"\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    b"\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00?\x00\xd2\xcf \xff\xd9"
)


def test_upload_valid_jpeg_returns_file_urls(test_client) -> None:
    response = test_client.post(
        "/files/upload",
        files={"file": ("avatar.jpg", MINIMAL_JPEG, "image/jpeg")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["filename"] == "avatar.jpg"
    assert payload["content_type"] == "image/jpeg"
    assert payload["url"] == f"/files/{payload['id']}"
    assert payload["thumb_url"] == f"/files/{payload['id']}/thumb"

    file_response = test_client.get(payload["url"])
    assert file_response.status_code == 200

    thumb_response = test_client.get(payload["thumb_url"])
    assert thumb_response.status_code == 200


def test_upload_rejects_oversized_file(test_client) -> None:
    too_large = b"0" * ((settings.max_upload_size_mb * 1024 * 1024) + 1)

    response = test_client.post(
        "/files/upload",
        files={"file": ("huge.jpg", too_large, "image/jpeg")},
    )

    assert response.status_code == 413
    assert response.json()["error"] == "invalid_file"


def test_upload_rejects_non_image_content(test_client) -> None:
    response = test_client.post(
        "/files/upload",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )

    assert response.status_code == 422
    assert response.json()["error"] == "invalid_file"


def test_upload_sanitises_path_like_filename(test_client) -> None:
    response = test_client.post(
        "/files/upload",
        files={"file": ("../nested/avatar.jpg", MINIMAL_JPEG, "image/jpeg")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["filename"] == "avatar.jpg"

    file_response = test_client.get(payload["url"])
    assert file_response.status_code == 200
    assert file_response.headers["content-type"].startswith("image/jpeg")
