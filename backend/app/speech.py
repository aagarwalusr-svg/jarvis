"""Server-side Fish Audio adapter using the official SDK's MessagePack contract."""

import httpx
import ormsgpack

from .config import settings
from .providers import ProviderError


async def synthesize(content: str) -> bytes:
    if not settings.fish_api_key or not settings.fish_voice_id:
        raise ProviderError("Fish Audio requires FISH_API_KEY and FISH_VOICE_ID on the backend.")
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                "https://api.fish.audio/v1/tts",
                headers={
                    "Authorization": f"Bearer {settings.fish_api_key}",
                    "Content-Type": "application/msgpack",
                    "model": settings.fish_model,
                },
                content=ormsgpack.packb(
                    {
                        "text": content,
                        "reference_id": settings.fish_voice_id,
                        "format": "mp3",
                        "latency": "balanced",
                        "chunk_length": 200,
                        "normalize": True,
                    }
                ),
            )
        if response.is_error:
            raise ProviderError(
                f"Fish Audio returned HTTP {response.status_code}. Check key, voice access, and quota."
            )
        if not response.content or not response.headers.get("content-type", "").startswith(
            ("audio/", "application/octet-stream")
        ):
            raise ProviderError("Fish Audio returned an invalid audio response.")
        return response.content
    except httpx.HTTPError as exc:
        raise ProviderError(
            "Fish Audio could not be reached. Check backend network access."
        ) from exc
