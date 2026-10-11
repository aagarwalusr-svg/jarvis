import asyncio

import pytest

from app import providers
from app.config import settings


@pytest.mark.parametrize(
    "prompt,task",
    [
        ("Debug this Python code", "coding"),
        ("Solve this math problem", "analysis"),
        ("Research latest news", "research"),
        ("Hello there", "conversation"),
    ],
)
def test_classification(prompt, task):
    assert providers.classify([{"role": "user", "content": prompt}]) == task


def test_auto_skips_unconfigured_and_falls_back(monkeypatch):
    for provider, spec in providers.PROVIDERS.items():
        monkeypatch.setattr(settings, spec["key"], "test" if provider in ("openai", "groq") else "")
    monkeypatch.setattr(settings, "auto_fallback", True)
    calls = []

    async def fake(provider, model, messages, memories):
        calls.append(provider)
        if provider == "openai":
            raise providers.ProviderError("unavailable")
        return "answer"

    monkeypatch.setattr(providers, "generate", fake)
    result = asyncio.run(providers.generate_auto([{"role": "user", "content": "solve math"}], []))
    assert calls == ["openai", "groq"]
    assert result["provider"] == "groq"
    assert result["fallback_from"] == ["openai"]
    monkeypatch.setattr(settings, "auto_fallback", False)
    calls.clear()
    with pytest.raises(providers.ProviderError):
        asyncio.run(providers.generate_auto([], [], "analysis"))
    assert calls == ["openai"]


def test_no_keys(monkeypatch):
    for spec in providers.PROVIDERS.values():
        monkeypatch.setattr(settings, spec["key"], "")
    with pytest.raises(providers.ProviderError, match="No AI providers configured"):
        asyncio.run(providers.generate_auto([], []))


def test_auto_websocket(client, monkeypatch):  # noqa: F811
    from app import main

    async def fake(messages, memories, task):
        return {
            "answer": "Routed answer",
            "provider": "claude",
            "model": "test-model",
            "task": "coding",
            "fallback_from": [],
        }

    monkeypatch.setattr(main, "generate_auto", fake)
    cid = client.post("/api/conversations").json()["id"]
    with client.websocket_connect(f"/ws/chat/{cid}") as ws:
        ws.send_json({})
        assert ws.receive_json()["type"] == "ready"
        ws.send_json({"provider": "auto", "content": "Write code"})
        assert ws.receive_json()["type"] == "message"
        assert ws.receive_json()["type"] == "thinking"
        assert ws.receive_json()["provider"] == "claude"
        assert ws.receive_json()["message"]["content"] == "Routed answer"
        assert ws.receive_json()["type"] == "done"


from test_api import client  # noqa: F401
