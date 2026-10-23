"""Distribuição de alertas em tempo real para a Central de Alertas (WebSocket)."""
import asyncio
import logging

from fastapi import WebSocket

log = logging.getLogger("metasafe.realtime")


class HubAlertas:
    def __init__(self) -> None:
        self._conexoes: set[WebSocket] = set()
        self.loop: asyncio.AbstractEventLoop | None = None

    @property
    def total_conexoes(self) -> int:
        return len(self._conexoes)

    async def conectar(self, ws: WebSocket) -> None:
        await ws.accept()
        self._conexoes.add(ws)

    def desconectar(self, ws: WebSocket) -> None:
        self._conexoes.discard(ws)

    async def _enviar(self, mensagem: dict) -> None:
        for ws in list(self._conexoes):
            try:
                await ws.send_json(mensagem)
            except Exception:  # conexão caiu: remove sem derrubar as demais
                self._conexoes.discard(ws)

    def publicar(self, mensagem: dict) -> None:
        """Pode ser chamado de rotas síncronas (threadpool) ou assíncronas."""
        if self.loop is None or not self._conexoes:
            return
        try:
            loop_atual = asyncio.get_running_loop()
        except RuntimeError:
            loop_atual = None
        if loop_atual is self.loop:
            self.loop.create_task(self._enviar(mensagem))
        else:
            asyncio.run_coroutine_threadsafe(self._enviar(mensagem), self.loop)


hub = HubAlertas()
