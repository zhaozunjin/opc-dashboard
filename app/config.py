from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://opc:opc_secret_2024@localhost:5432/opc_dashboard"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # AI Provider
    ai_provider: str = "deepseek"
    deepseek_api_key: str = ""
    openai_api_key: str = ""
    claude_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
