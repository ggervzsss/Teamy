import pytest


@pytest.mark.asyncio
async def test_user_can_list_and_read_email_backed_notifications(client):
    leader = await client._get_or_create_user("notifications-leader@example.com", "Notifications Leader")
    await client._login_user(leader.email, leader.full_name)
    created = await client.post("/projects", json={"name": "Notification Project"})
    assert created.status_code == 201
    project = created.json()
    client._logout_user()

    member = await client._get_or_create_user("notifications-member@example.com", "Notifications Member")
    await client._login_user(member.email, member.full_name)
    joined = await client.post("/projects/join", json={"teamy_code": project["teamy_code"]})
    assert joined.status_code == 200
    client._logout_user()

    await client._login_user(leader.email, leader.full_name)
    task = await client.post(
        f"/projects/{project['id']}/tasks",
        json={"title": "Read the brief", "assignee_ids": [str(member.id)], "initial_status": "todo"},
    )
    assert task.status_code == 201
    client._logout_user()

    await client._login_user(member.email, member.full_name)
    listed = await client.get("/notifications")
    assert listed.status_code == 200
    body = listed.json()
    assert body["unread_count"] == 1
    assert body["notifications"][0]["title"] == "New task assigned: Read the brief"
    assert body["notifications"][0]["is_email_backed"] is True
    assert body["notifications"][0]["target_path"] == f"/projects/{project['slug']}/task-board"

    marked = await client.patch(f"/notifications/{body['notifications'][0]['id']}/read")
    assert marked.status_code == 200

    relisted = await client.get("/notifications")
    assert relisted.status_code == 200
    assert relisted.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_send_email_uses_brevo_when_configured(monkeypatch):
    from unittest.mock import AsyncMock, MagicMock

    from app.core.config import Settings
    from app.modules.notifications.services import EmailRecipient, send_email

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(return_value=mock_response)
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)

    monkeypatch.setattr("httpx.AsyncClient", MagicMock(return_value=mock_client_instance))

    settings = Settings(
        brevo_api_key="xkeysib-test-key",
        brevo_from_email="Teamy <teamy.app.notifications@gmail.com>",
    )
    recipient = EmailRecipient(email="member@example.com", full_name="Team Member")
    await send_email(settings, [recipient], "Test Subject", "<p>Hello</p>", "Hello")

    assert mock_client_instance.post.call_count == 1
    call_kwargs = mock_client_instance.post.call_args
    payload = call_kwargs.kwargs["json"]
    assert payload["sender"]["email"] == "teamy.app.notifications@gmail.com"
    assert payload["to"] == [{"email": "member@example.com", "name": "Team Member"}]
    assert payload["subject"] == "Test Subject"
    assert payload["htmlContent"] == "<p>Hello</p>"
    assert payload["textContent"] == "Hello"
