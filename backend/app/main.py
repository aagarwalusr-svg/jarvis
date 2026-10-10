import asyncio
import hmac
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, text

from .config import settings
from .db import Base, Conversation, Memory, Message, Session, Task, engine
from .providers import PROVIDERS, ProviderError, generate
from .speech import synthesize


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="JARVIS Command Center", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


def authorized(token: str) -> bool:
    return not settings.jarvis_access_token or hmac.compare_digest(
        token.encode("utf-8"), settings.jarvis_access_token.encode("utf-8")
    )


async def auth(authorization: Annotated[str, Header()] = ""):
    if not authorized(authorization.removeprefix("Bearer ")):
        raise HTTPException(401, "Invalid access token")


protected = [Depends(auth)]


class Content(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class TaskInput(BaseModel):
    title: str = Field(min_length=1, max_length=300)


class TaskUpdate(BaseModel):
    completed: bool


class ChatInput(Content):
    provider: str = "openai"
    model: str = Field(default="", max_length=120)


def serialize(item):
    return jsonable_encoder(
        {column.name: getattr(item, column.name) for column in item.__table__.columns}
    )


@app.get("/health")
async def health():
    async with Session() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


@app.get("/api/providers", dependencies=protected)
async def providers():
    return [
        {
            "id": name,
            "label": spec["label"],
            "model": spec["model"],
            "configured": bool(getattr(settings, spec["key"])),
        }
        for name, spec in PROVIDERS.items()
    ]


@app.get("/api/voice", dependencies=protected)
async def voice_status():
    configured = bool(settings.fish_api_key and settings.fish_voice_id)
    return {
        "engine": "fish" if configured else "browser",
        "configured": configured,
        "voice_id": settings.fish_voice_id,
        "model": settings.fish_model,
    }


@app.post("/api/voice/speak", dependencies=protected)
async def speak(data: Content):
    try:
        audio = await synthesize(data.content)
    except ProviderError as exc:
        raise HTTPException(502, str(exc)) from exc
    return Response(audio, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})


@app.get("/api/conversations", dependencies=protected)
async def conversations():
    async with Session() as session:
        rows = await session.scalars(select(Conversation).order_by(Conversation.created_at.desc()))
        return [serialize(row) for row in rows]


@app.post("/api/conversations", dependencies=protected, status_code=201)
async def create_conversation():
    async with Session() as session:
        row = Conversation()
        session.add(row)
        await session.commit()
        return serialize(row)


@app.get("/api/conversations/{conversation_id}/messages", dependencies=protected)
async def messages(conversation_id: str):
    async with Session() as session:
        if not await session.get(Conversation, conversation_id):
            raise HTTPException(404, "Conversation not found")
        rows = await session.scalars(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        return [serialize(row) for row in rows]


@app.delete("/api/conversations/{conversation_id}", dependencies=protected, status_code=204)
async def delete_conversation(conversation_id: str):
    async with Session() as session:
        if not await session.get(Conversation, conversation_id):
            raise HTTPException(404, "Conversation not found")
        await session.execute(delete(Message).where(Message.conversation_id == conversation_id))
        await session.execute(delete(Conversation).where(Conversation.id == conversation_id))
        await session.commit()


@app.get("/api/memory", dependencies=protected)
async def memory():
    async with Session() as session:
        return [
            serialize(row)
            for row in await session.scalars(select(Memory).order_by(Memory.created_at.desc()))
        ]


@app.post("/api/memory", dependencies=protected, status_code=201)
async def add_memory(data: Content):
    async with Session() as session:
        row = Memory(content=data.content)
        session.add(row)
        await session.commit()
        return serialize(row)


@app.delete("/api/memory/{memory_id}", dependencies=protected, status_code=204)
async def delete_memory(memory_id: str):
    async with Session() as session:
        if not await session.get(Memory, memory_id):
            raise HTTPException(404, "Memory not found")
        await session.execute(delete(Memory).where(Memory.id == memory_id))
        await session.commit()


@app.get("/api/tasks", dependencies=protected)
async def tasks():
    async with Session() as session:
        return [
            serialize(row)
            for row in await session.scalars(select(Task).order_by(Task.created_at.desc()))
        ]


@app.post("/api/tasks", dependencies=protected, status_code=201)
async def add_task(data: TaskInput):
    async with Session() as session:
        row = Task(title=data.title)
        session.add(row)
        await session.commit()
        return serialize(row)


@app.patch("/api/tasks/{task_id}", dependencies=protected)
async def update_task(task_id: str, data: TaskUpdate):
    async with Session() as session:
        row = await session.get(Task, task_id)
        if not row:
            raise HTTPException(404, "Task not found")
        row.completed = data.completed
        await session.commit()
        return serialize(row)


@app.delete("/api/tasks/{task_id}", dependencies=protected, status_code=204)
async def delete_task(task_id: str):
    async with Session() as session:
        if not await session.get(Task, task_id):
            raise HTTPException(404, "Task not found")
        await session.execute(delete(Task).where(Task.id == task_id))
        await session.commit()


@app.websocket("/ws/chat/{conversation_id}")
async def chat(socket: WebSocket, conversation_id: str):
    origin = socket.headers.get("origin")
    if origin and origin not in settings.cors_origins.split(","):
        await socket.close(code=1008)
        return
    await socket.accept()
    try:
        # Authentication uses the first frame, never a token in a URL or log.
        hello = await asyncio.wait_for(socket.receive_json(), timeout=10)
        if not isinstance(hello, dict) or not authorized(str(hello.get("token", ""))):
            await socket.close(code=1008)
            return
        async with Session() as session:
            if not await session.get(Conversation, conversation_id):
                await socket.send_json({"type": "error", "message": "Conversation not found"})
                await socket.close(code=1008)
                return
        await socket.send_json({"type": "ready"})
        while True:
            raw = await socket.receive_json()
            try:
                data = ChatInput.model_validate(raw)
            except ValueError:
                await socket.send_json(
                    {"type": "error", "message": "Invalid message. Use 1–10000 characters."}
                )
                continue
            if data.provider not in PROVIDERS:
                await socket.send_json({"type": "error", "message": "Unknown AI provider"})
                continue
            async with Session() as session:
                conversation = await session.get(Conversation, conversation_id)
                if not conversation:
                    await socket.send_json({"type": "error", "message": "Conversation was deleted"})
                    return
                row = Message(conversation_id=conversation_id, role="user", content=data.content)
                session.add(row)
                if conversation.title == "New conversation":
                    conversation.title = data.content[:80]
                await session.commit()
                await socket.send_json({"type": "message", "message": serialize(row)}, mode="text")
                # Bound the context sent upstream; full history remains in PostgreSQL.
                recent = list(
                    await session.scalars(
                        select(Message)
                        .where(Message.conversation_id == conversation_id)
                        .order_by(Message.created_at.desc())
                        .limit(40)
                    )
                )
                notes = list(
                    await session.scalars(
                        select(Memory.content).order_by(Memory.created_at.desc()).limit(20)
                    )
                )
                history = [{"role": m.role, "content": m.content} for m in reversed(recent)]
            await socket.send_json({"type": "thinking"})
            try:
                answer = await generate(data.provider, data.model, history, notes)
            except ProviderError as exc:
                await socket.send_json({"type": "error", "message": str(exc)})
                continue
            async with Session() as session:
                if not await session.get(Conversation, conversation_id):
                    await socket.send_json({"type": "error", "message": "Conversation was deleted"})
                    return
                row = Message(conversation_id=conversation_id, role="assistant", content=answer)
                session.add(row)
                await session.commit()
                await socket.send_json({"type": "message", "message": serialize(row)})
                await socket.send_json({"type": "done"})
    except (TimeoutError, WebSocketDisconnect):
        pass
    except ValueError:
        await socket.close(code=1008)
