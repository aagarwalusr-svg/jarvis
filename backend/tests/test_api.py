import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"

import pytest
from fastapi.testclient import TestClient

from app import main, providers
from app.config import settings


@pytest.fixture
def client():
    with TestClient(main.app) as test_client:
        yield test_client


def test_health_and_persistent_collections(client):
    assert client.get("/health").json() == {"status": "ok", "database": "connected"}
    task = client.post("/api/tasks", json={"title": "Build JARVIS"}).json()
    assert client.patch(f"/api/tasks/{task['id']}", json={"completed": True}).json()["completed"]
    assert client.get("/api/tasks").json()[0]["title"] == "Build JARVIS"
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
    note = client.post("/api/memory", json={"content": "I prefer Python"}).json()
    assert client.get("/api/memory").json()[0]["content"] == "I prefer Python"
    assert client.delete(f"/api/memory/{note['id']}").status_code == 204
    assert client.post("/api/tasks", json={"title": ""}).status_code == 422
    assert client.patch("/api/tasks/missing", json={"completed": True}).status_code == 404


def test_websocket_chat_persists_and_uses_memory(client, monkeypatch):
    async def fake_generate(provider, model, messages, memories):
        assert provider == "openai"
        assert messages[-1] == {"role": "user", "content": "Hello"}
        assert "My name is Alex" in memories
        return "Hello, Alex. How can I help?"

    monkeypatch.setattr(main, "generate", fake_generate)
    client.post("/api/memory", json={"content": "My name is Alex"})
    conversation = client.post("/api/conversations").json()
    cid = conversation["id"]
    with client.websocket_connect(f"/ws/chat/{cid}") as ws:
        ws.send_json({"token": ""})
        assert ws.receive_json()["type"] == "ready"
        ws.send_json({"content": "Hello", "provider": "openai"})
        assert ws.receive_json()["message"]["role"] == "user"
        assert ws.receive_json()["type"] == "thinking"
        assert ws.receive_json()["message"]["content"] == "Hello, Alex. How can I help?"
        assert ws.receive_json()["type"] == "done"
    messages = client.get(f"/api/conversations/{cid}/messages").json()
    assert [m["role"] for m in messages] == ["user", "assistant"]
    assert client.get("/api/conversations").json()[0]["title"] == "Hello"
    assert client.delete(f"/api/conversations/{cid}").status_code == 204
    assert client.get(f"/api/conversations/{cid}/messages").status_code == 404


def test_missing_provider_key_is_explicit(client, monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "")
    cid = client.post("/api/conversations").json()["id"]
    with client.websocket_connect(f"/ws/chat/{cid}") as ws:
        ws.send_json({})
        assert ws.receive_json()["type"] == "ready"
        ws.send_json({"content": "Hello"})
        assert ws.receive_json()["type"] == "message"
        assert ws.receive_json()["type"] == "thinking"
        error = ws.receive_json()
        assert error["type"] == "error"
        assert "API key is missing" in error["message"]
    assert len(client.get(f"/api/conversations/{cid}/messages").json()) == 1


def test_token_protection(client, monkeypatch):
    monkeypatch.setattr(settings, "jarvis_access_token", "test-token")
    assert client.get("/api/conversations").status_code == 401
    assert (
        client.get("/api/conversations", headers={"Authorization": "Bearer test-token"}).status_code
        == 200
    )
    assert client.get("/health").status_code == 200
    with pytest.raises(Exception) as exc, client.websocket_connect("/ws/chat/missing") as ws:
        ws.send_json({"token": "incorrect"})
        ws.receive_json()
    assert getattr(exc.value, "code", None) == 1008


@pytest.mark.parametrize("provider", ["openai", "claude", "gemini", "groq"])
def test_provider_request_contract(provider, monkeypatch):
    import asyncio

    import httpx

    monkeypatch.setattr(settings, providers.PROVIDERS[provider]["key"], "test-key")
    original = httpx.AsyncClient
    seen = []

    def handle(request):
        import json

        body = json.loads(request.content)
        seen.append(request)
        assert body["model"] == providers.PROVIDERS[provider]["model"]
        assert body["messages"][-1]["content"] == "Hi"
        if provider == "claude":
            assert request.headers["x-api-key"] == "test-key"
            return httpx.Response(200, json={"content": [{"type": "text", "text": "Hello"}]})
        assert request.headers["authorization"] == "Bearer test-key"
        return httpx.Response(200, json={"choices": [{"message": {"content": "Hello"}}]})

    monkeypatch.setattr(
        providers.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs),
    )
    assert (
        asyncio.run(providers.generate(provider, "", [{"role": "user", "content": "Hi"}], []))
        == "Hello"
    )
    assert len(seen) == 1


def test_provider_error_does_not_leak_upstream_response(monkeypatch):
    import asyncio

    import httpx

    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    original = httpx.AsyncClient
    transport = httpx.MockTransport(lambda r: httpx.Response(401, text="SECRET-UPSTREAM-BODY"))
    monkeypatch.setattr(
        providers.httpx, "AsyncClient", lambda **kwargs: original(transport=transport, **kwargs)
    )
    with pytest.raises(providers.ProviderError, match="HTTP 401") as exc:
        asyncio.run(providers.generate("openai", "", [], []))
    assert "SECRET-UPSTREAM-BODY" not in str(exc.value)


def test_fish_audio_configuration_and_adapter(client, monkeypatch):
    import httpx
    import ormsgpack

    from app import speech

    monkeypatch.setattr(settings, "fish_api_key", "test-fish-key")
    monkeypatch.setattr(settings, "fish_voice_id", "test-voice-id")
    original = httpx.AsyncClient

    def handle(request):
        assert str(request.url) == "https://api.fish.audio/v1/tts"
        assert request.headers["authorization"] == "Bearer test-fish-key"
        assert request.headers["model"] == "s2.1-pro"
        payload = ormsgpack.unpackb(request.content)
        assert payload["text"] == "At your service."
        assert payload["reference_id"] == "test-voice-id"
        assert payload["format"] == "mp3"
        return httpx.Response(
            200, content=b"ID3-test-audio", headers={"content-type": "audio/mpeg"}
        )

    monkeypatch.setattr(
        speech.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs),
    )
    assert client.get("/api/voice").json()["engine"] == "fish"
    response = client.post("/api/voice/speak", json={"content": "At your service."})
    assert response.status_code == 200
    assert response.content == b"ID3-test-audio"
    assert response.headers["cache-control"] == "no-store"
    assert "test-fish-key" not in client.get("/api/voice").text


def test_fish_audio_missing_key_is_actionable(client, monkeypatch):
    monkeypatch.setattr(settings, "fish_api_key", "")
    assert client.get("/api/voice").json()["engine"] == "browser"
    response = client.post("/api/voice/speak", json={"content": "Hello"})
    assert response.status_code == 502
    assert "FISH_API_KEY" in response.json()["detail"]


def test_persona_preview_uses_canonical_character_instructions(client, monkeypatch):
    captured = {}

    async def fake_generate(provider, model, messages, memories, system_prompt):
        captured.update(provider=provider, messages=messages, system_prompt=system_prompt)
        return "My turn! Watch this one."

    monkeypatch.setattr(main, "generate", fake_generate)
    cast = client.get("/api/personas").json()
    assert [p["name"] for p in cast["characters"]] == ["Julian Newman", "Jaden Newman"]
    response = client.post(
        "/api/personas/jaden/preview", json={"content": "A friendly contest", "provider": "groq"}
    )
    assert response.json() == {
        "character": "Jaden Newman",
        "reply": "My turn! Watch this one.",
        "fictional": True,
    }
    assert captured["system_prompt"] == cast["characters"][1]["system_prompt"]
    assert captured["messages"] == [{"role": "user", "content": "A friendly contest"}]
    assert client.post("/api/personas/missing/preview", json={"content": "Hi"}).status_code == 404


@pytest.mark.parametrize("provider", ["groq", "claude"])
def test_custom_persona_system_reaches_upstream(provider, monkeypatch):
    import asyncio
    import json

    import httpx

    monkeypatch.setattr(settings, providers.PROVIDERS[provider]["key"], "test-key")
    original = httpx.AsyncClient

    def handle(request):
        body = json.loads(request.content)
        if provider == "claude":
            assert body["system"] == "Fictional character context"
            return httpx.Response(200, json={"content": [{"type": "text", "text": "My turn!"}]})
        assert body["messages"][0] == {"role": "system", "content": "Fictional character context"}
        return httpx.Response(200, json={"choices": [{"message": {"content": "My turn!"}}]})

    monkeypatch.setattr(
        providers.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs),
    )
    assert (
        asyncio.run(
            providers.generate(
                provider,
                "",
                [{"role": "user", "content": "Hi"}],
                [],
                system_prompt="Fictional character context",
            )
        )
        == "My turn!"
    )
