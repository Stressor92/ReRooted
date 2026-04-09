from __future__ import annotations

from app.models import Place
from app.services import place_service


def test_get_or_create_deduplicates_places_case_insensitively(db_session) -> None:
    existing = Place(name="Berlin", full_name="Berlin, Germany")
    db_session.add(existing)
    db_session.commit()

    resolved = place_service.get_or_create(db_session, "berlin")

    assert str(resolved.id) == str(existing.id)
    all_matches = db_session.query(Place).filter(Place.name.ilike("berlin")).all()
    assert len(all_matches) == 1


def test_places_autocomplete_searches_full_name(test_client) -> None:
    create_response = test_client.post(
        "/places",
        json={"name": "Springfield", "full_name": "Springfield, Illinois"},
    )
    assert create_response.status_code == 201

    response = test_client.get("/places?q=Illinois")

    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    assert any(place["full_name"] == "Springfield, Illinois" for place in results)
