from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")
    database_url: str = (
        "postgresql+asyncpg://jarvis:change-this-local-password@localhost:5432/jarvis"
    )
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    claude_model: str = "claude-sonnet-4-6"
    gemini_model: str = "gemini-2.5-flash"
    groq_model: str = "llama-3.3-70b-versatile"
    auto_fallback: bool = True
    fish_api_key: str = ""
    fish_voice_id: str = ""
    fish_model: str = "s2.1-pro"
    jarvis_access_token: str = ""
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"


settings = Settings()
