from urllib.parse import parse_qs, urlparse

import pytest

from app.core.config import Settings
from app.core.security import create_oauth_state


def mock_google_client(
    monkeypatch,
    *,
    email="google@example.com",
    name="Google User",
    picture="https://example.com/google-avatar.png",
    subject="google-subject",
):
    class FakeResponse:
        def __init__(self, payload, status_code=200):
            self._payload = payload
            self.status_code = status_code

        def json(self):
            return self._payload

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, data=None, headers=None):
            return FakeResponse({"access_token": "google-access-token"})

        async def get(self, url, headers=None):
            return FakeResponse({"sub": subject, "email": email, "name": name, "picture": picture})

    monkeypatch.setattr("app.modules.auth.router.httpx.AsyncClient", FakeAsyncClient)


@pytest.mark.asyncio
async def test_google_login_sets_session_and_me(client, monkeypatch):
    mock_google_client(monkeypatch)
    state = create_oauth_state(Settings(secret_key="test-secret-key-that-is-long-enough"))

    callback = await client.get(f"/auth/google/callback?code=test-code&state={state}", follow_redirects=False)
    assert callback.status_code == 307
    location = callback.headers["location"]
    parsed = urlparse(location)
    token = parsed.fragment.split("token=")[-1]

    me_response = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["user"]["email"] == "google@example.com"


@pytest.mark.asyncio
async def test_google_login_uses_secure_cookie_for_samesite_none(client, monkeypatch):
    mock_google_client(monkeypatch)
    state = create_oauth_state(Settings(secret_key="test-secret-key-that-is-long-enough"))

    callback = await client.get(f"/auth/google/callback?code=test-code&state={state}", follow_redirects=False)
    cookie_header = callback.headers.get("set-cookie", "")
    assert "Secure" in cookie_header
    assert "SameSite=none" in cookie_header


@pytest.mark.asyncio
async def test_logout_clears_cookie(client):
    await client._login_user("test@example.com")
    logout = await client.post("/auth/logout")
    assert logout.status_code == 204


@pytest.mark.asyncio
async def test_update_me_changes_profile_fields(client):
    await client._login_user("test@example.com", "Original Name")

    response = await client.patch("/auth/me", json={"full_name": "Updated Name"})
    assert response.status_code == 200
    assert response.json()["user"]["full_name"] == "Updated Name"

    empty_response = await client.patch("/auth/me", json={"full_name": "   "})
    assert empty_response.status_code == 422


@pytest.mark.asyncio
async def test_avatar_upload_and_restore_delete_cloudinary_asset(client, monkeypatch):
    uploaded_public_ids: list[str] = []
    deleted_public_ids: list[str] = []

    async def fake_upload(settings, user_id, file):
        uploaded_public_ids.append(f"teamy/avatars/{user_id}")
        return "https://res.cloudinary.test/avatar.jpg", uploaded_public_ids[-1]

    async def fake_delete(settings, public_id):
        deleted_public_ids.append(public_id)

    monkeypatch.setattr("app.modules.auth.router.upload_profile_avatar", fake_upload)
    monkeypatch.setattr("app.modules.auth.router.delete_profile_avatar", fake_delete)

    await client._login_user("jane@example.com", "Jane Doe")

    upload = await client.post("/auth/me/avatar", files={"file": ("avatar.png", b"image-bytes", "image/png")})
    restore = await client.delete("/auth/me/avatar")

    assert upload.status_code == 200
    assert upload.json()["user"]["avatar_url"] == "https://res.cloudinary.test/avatar.jpg"
    assert restore.status_code == 200
    assert restore.json()["user"]["avatar_url"] is None
    assert deleted_public_ids == uploaded_public_ids


@pytest.mark.asyncio
async def test_google_login_preserves_custom_cloudinary_avatar(client, monkeypatch):
    mock_google_client(monkeypatch, email="jane@example.com", picture="https://example.com/new-google.png")

    async def fake_upload(settings, user_id, file):
        return "https://res.cloudinary.test/custom.jpg", f"teamy/avatars/{user_id}"

    monkeypatch.setattr("app.modules.auth.router.upload_profile_avatar", fake_upload)
    await client._login_user("jane@example.com", "Jane Doe")
    upload = await client.post("/auth/me/avatar", files={"file": ("avatar.png", b"image-bytes", "image/png")})
    assert upload.status_code == 200

    state = create_oauth_state(Settings(secret_key="test-secret-key-that-is-long-enough"))
    callback = await client.get(f"/auth/google/callback?code=test-code&state={state}", follow_redirects=False)
    assert callback.status_code == 307

    token = callback.headers["location"].split("token=")[-1]
    me_response = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    user = me_response.json()["user"]
    assert user["avatar_url"] == "https://res.cloudinary.test/custom.jpg"
    assert user["google_avatar_url"] == "https://example.com/new-google.png"


@pytest.mark.asyncio
async def test_restore_google_avatar_replaces_custom_cloudinary_avatar(client, monkeypatch):
    mock_google_client(monkeypatch, email="jane@example.com", picture="https://example.com/new-google.png")
    state = create_oauth_state(Settings(secret_key="test-secret-key-that-is-long-enough"))

    deleted_public_ids: list[str] = []

    async def fake_upload(settings, user_id, file):
        return "https://res.cloudinary.test/custom.jpg", f"teamy/avatars/{user_id}"

    async def fake_delete(settings, public_id):
        deleted_public_ids.append(public_id)

    monkeypatch.setattr("app.modules.auth.router.upload_profile_avatar", fake_upload)
    monkeypatch.setattr("app.modules.auth.router.delete_profile_avatar", fake_delete)

    callback = await client.get(f"/auth/google/callback?code=test-code&state={state}", follow_redirects=False)
    token = callback.headers["location"].split("token=")[-1]
    auth_header = {"Authorization": f"Bearer {token}"}

    upload = await client.post(
        "/auth/me/avatar", headers=auth_header, files={"file": ("avatar.png", b"image-bytes", "image/png")}
    )
    assert upload.status_code == 200

    restored = await client.post("/auth/me/avatar/google", headers=auth_header)
    assert restored.status_code == 200
    user = restored.json()["user"]
    assert user["avatar_url"] == "https://example.com/new-google.png"
    assert deleted_public_ids == [f"teamy/avatars/{user['id']}"]


@pytest.mark.asyncio
async def test_google_login_redirects_to_frontend(client, monkeypatch):
    mock_google_client(monkeypatch)

    response = await client.get("/auth/google/login", follow_redirects=False)
    assert response.status_code == 307
    location = response.headers["location"]
    assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "client_id=google-client" in location
    assert "response_type=code" in location


@pytest.mark.asyncio
async def test_google_login_url_contains_state(client):
    response = await client.get("/auth/google/login", follow_redirects=False)
    location = response.headers["location"]

    query = parse_qs(urlparse(location).query)
    assert "state" in query
    state_token = query["state"][0]
    assert len(state_token) > 20
