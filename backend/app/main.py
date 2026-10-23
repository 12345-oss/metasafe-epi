"""MetaSafe EPI — API principal (FastAPI)."""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text

from .config import settings
from .database import Base, SessionLocal, engine
from .deps import usuario_por_token
from .models import Usuario
from .realtime import hub
from .routers import alertas, auth, indicadores, monitoramento, operadores, zonas

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("metasafe")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    if settings.seed_on_startup:
        from .seed import popular_se_vazio

        with SessionLocal() as db:
            if popular_se_vazio(db):
                log.info("Banco populado com os dados simulados da Metaindústria.")
    hub.loop = asyncio.get_running_loop()
    yield
    hub.loop = None


app = FastAPI(
    title="MetaSafe EPI — API",
    description="Monitoramento proativo de EPIs e riscos operacionais na Metaindústria: ingestão de eventos do "
                "Edge AI, motor de regras por zona, alertas em tempo real (WebSocket), tratamento de ocorrências, "
                "relatórios de conformidade e integração com ERP/MES.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, indicadores, alertas, monitoramento, operadores, zonas):
    app.include_router(r.router)


@app.get("/api/health", tags=["Sistema"])
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok", "banco": engine.dialect.name, "clientes_tempo_real": hub.total_conexoes}


@app.websocket("/ws/alertas")
async def ws_alertas(websocket: WebSocket, token: str = ""):
    with SessionLocal() as db:
        usuario: Usuario | None = usuario_por_token(token, db)
    if not usuario:
        await websocket.close(code=4401)
        return
    await hub.conectar(websocket)
    try:
        await websocket.send_json({"tipo": "conectado", "usuario": usuario.nome})
        while True:
            await websocket.receive_text()  # mantém a conexão (ping do cliente)
    except WebSocketDisconnect:
        pass
    finally:
        hub.desconectar(websocket)
