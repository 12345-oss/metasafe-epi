"""Configurações da API, lidas de variáveis de ambiente (com padrões seguros para desenvolvimento)."""
import os


class Settings:
    def __init__(self) -> None:
        # Sem DATABASE_URL a API usa SQLite local (modo "rodar sem Docker").
        # No Docker Compose a variável aponta para o PostgreSQL.
        self.database_url: str = os.getenv("DATABASE_URL", "sqlite:///./metasafe.db")
        self.jwt_secret: str = os.getenv("JWT_SECRET", "metasafe-dev-secret-troque-em-producao")
        self.jwt_exp_minutes: int = int(os.getenv("JWT_EXP_MINUTES", "480"))
        # Chave usada pelos dispositivos Edge AI (câmeras) para enviar detecções.
        self.edge_api_key: str = os.getenv("EDGE_API_KEY", "edge-dev-key")
        self.cors_origins: list[str] = [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080").split(",")
            if o.strip()
        ]
        # Popula o banco com dados simulados da Metaindústria na primeira execução.
        self.seed_on_startup: bool = os.getenv("SEED_ON_STARTUP", "true").lower() == "true"
        # Intervalo (minutos) da verificação automática de validade dos EPIs entregues.
        self.validade_check_minutes: int = int(os.getenv("VALIDADE_CHECK_MINUTES", "60"))
        self.timezone: str = os.getenv("APP_TIMEZONE", "America/Sao_Paulo")


settings = Settings()
