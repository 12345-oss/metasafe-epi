"""Modelo de dados do MetaSafe EPI.

Segue o diagrama de classes da Sprint 1 (docs/diagramas/classes.md). Datas/horas são
gravadas em UTC (sem fuso) e convertidas para o fuso da planta na interface.

Decisões de implementação (ver docs/arquitetura.md):
- Operador/Supervisor/Gestor do diagrama viram o campo `perfil` do Usuário; o Operador de
  chão de fábrica também existe como cadastro operacional (matrícula/crachá, RF02).
- AlertaRisco e OcorrenciaSeguranca (relação 1 : 0..1) foram unidos na tabela `alertas`:
  o tratamento da ocorrência acontece sempre sobre o alerta.
- DeteccaoEPI é gravada como JSON dentro do EventoMonitoramento.
- CameraIP e SensorIoT são o mesmo `Dispositivo`, diferenciados pelo campo `tipo`.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Vocabulários do domínio
# ---------------------------------------------------------------------------
PERFIS = {"operador": "Operador de produção", "supervisor": "Supervisor(a) de segurança", "gestor": "Gestor industrial"}
TURNOS = {"A": "Turno A (06h–14h)", "B": "Turno B (14h–22h)", "C": "Turno C (22h–06h)"}
STATUS_OPERADOR = {"em_operacao": "Em operação", "fora_de_area": "Fora de área", "inativo": "Inativo"}
NIVEIS_RISCO = {"medio": "Médio", "alto": "Alto", "critico": "Crítico"}
TIPOS_RISCO = ("Mecânico", "Elétrico", "Químico", "Térmico", "Movimentação de cargas", "Ruído")

SEVERIDADES = ("baixa", "media", "critica")
SEVERIDADE_LABEL = {"baixa": "Baixa", "media": "Média", "critica": "Crítica"}
STATUS_ALERTA = {"ativo": "Ativo", "em_tratamento": "Em tratamento", "encerrado": "Encerrado", "escalado": "Escalado"}
STATUS_PENDENTES = ("ativo", "em_tratamento")
TIPOS_ALERTA = {"EPI_AUSENTE": "EPI obrigatório não detectado", "FALHA_DISPOSITIVO": "Falha de dispositivo"}
CLASSIFICACOES = ("Esquecimento pontual", "Risco recorrente", "Falso positivo", "Falha técnica", "Condição de processo")
SITUACOES_VERIFICADAS = ("EPI corrigido pelo operador", "Operador saiu da área", "Risco ainda presente",
                         "Dispositivo restabelecido", "Não foi possível verificar")
STATUS_DISPOSITIVO = {"online": "Online", "degradado": "Degradado", "offline": "Sem sinal"}


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    perfil: Mapped[str] = mapped_column(String(20))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    operador_id: Mapped[int | None] = mapped_column(ForeignKey("operadores.id"), nullable=True)

    operador: Mapped[Operador | None] = relationship(lazy="joined")


class TipoEPI(Base):
    __tablename__ = "tipos_epi"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    descricao: Mapped[str] = mapped_column(Text, default="")
    norma_referencia: Mapped[str] = mapped_column(String(80), default="")
    # Classe reconhecida pelo modelo de visão computacional no edge (ex.: "capacete").
    codigo_deteccao: Mapped[str] = mapped_column(String(40), unique=True, index=True)


class ZonaOperacional(Base):
    __tablename__ = "zonas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), unique=True)
    setor: Mapped[str] = mapped_column(String(80))
    linha: Mapped[str] = mapped_column(String(80), default="")
    tipo_risco: Mapped[str] = mapped_column(String(60))
    nivel_risco: Mapped[str] = mapped_column(String(10))  # medio | alto | critico
    ativa: Mapped[bool] = mapped_column(Boolean, default=True)

    requisitos: Mapped[list[RequisitoEPI]] = relationship(
        back_populates="zona", cascade="all, delete-orphan", lazy="selectin", order_by="RequisitoEPI.id"
    )
    dispositivos: Mapped[list[Dispositivo]] = relationship(back_populates="zona", lazy="selectin",
                                                           order_by="Dispositivo.identificador")

    def requisitos_obrigatorios(self) -> list[RequisitoEPI]:
        return [r for r in self.requisitos if r.obrigatorio]


class RequisitoEPI(Base):
    """Linha da matriz de EPIs obrigatórios da zona (RN01) com limiar de confiança (RF14)."""

    __tablename__ = "requisitos_epi"
    __table_args__ = (UniqueConstraint("zona_id", "tipo_epi_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    zona_id: Mapped[int] = mapped_column(ForeignKey("zonas.id", ondelete="CASCADE"))
    tipo_epi_id: Mapped[int] = mapped_column(ForeignKey("tipos_epi.id"))
    confianca_minima: Mapped[float] = mapped_column(Float, default=0.85)
    obrigatorio: Mapped[bool] = mapped_column(Boolean, default=True)

    zona: Mapped[ZonaOperacional] = relationship(back_populates="requisitos")
    tipo_epi: Mapped[TipoEPI] = relationship(lazy="joined")


class Operador(Base):
    """Operador de chão de fábrica (RF02). Identificado por matrícula/crachá, nunca por reconhecimento facial (RNF06)."""

    __tablename__ = "operadores"

    id: Mapped[int] = mapped_column(primary_key=True)
    matricula: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(160))
    setor: Mapped[str] = mapped_column(String(80))
    turno: Mapped[str] = mapped_column(String(1))
    status_operacional: Mapped[str] = mapped_column(String(20), default="em_operacao")
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Dispositivo(Base):
    """Câmera IP ou sensor IoT instalado em uma zona."""

    __tablename__ = "dispositivos"

    id: Mapped[int] = mapped_column(primary_key=True)
    identificador: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    tipo: Mapped[str] = mapped_column(String(10))  # camera | sensor
    descricao: Mapped[str] = mapped_column(String(160), default="")
    zona_id: Mapped[int] = mapped_column(ForeignKey("zonas.id"))
    status: Mapped[str] = mapped_column(String(12), default="online")
    ultimo_sinal: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    zona: Mapped[ZonaOperacional] = relationship(back_populates="dispositivos", lazy="joined")


class EventoMonitoramento(Base):
    __tablename__ = "eventos"

    id: Mapped[int] = mapped_column(primary_key=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    zona_id: Mapped[int] = mapped_column(ForeignKey("zonas.id"), index=True)
    dispositivo_id: Mapped[int | None] = mapped_column(ForeignKey("dispositivos.id"), nullable=True)
    operador_id: Mapped[int | None] = mapped_column(ForeignKey("operadores.id"), nullable=True, index=True)
    origem: Mapped[str] = mapped_column(String(20))  # edge_ai | simulador
    status_conformidade: Mapped[str] = mapped_column(String(15), index=True)  # conforme | nao_conforme | inconclusivo
    deteccoes_json: Mapped[str] = mapped_column(Text, default="[]")
    resumo: Mapped[str] = mapped_column(String(255), default="")

    zona: Mapped[ZonaOperacional] = relationship(lazy="joined")
    dispositivo: Mapped[Dispositivo | None] = relationship(lazy="joined")
    operador: Mapped[Operador | None] = relationship(lazy="joined")

    @property
    def codigo(self) -> str:
        return f"EV-{self.id:05d}"

    @property
    def deteccoes(self) -> list[dict]:
        try:
            return json.loads(self.deteccoes_json or "[]")
        except ValueError:
            return []


class Alerta(Base):
    """Alerta de risco + ocorrência de segurança (tratamento pelo supervisor)."""

    __tablename__ = "alertas"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(String(20), index=True)  # EPI_AUSENTE | FALHA_DISPOSITIVO
    categoria: Mapped[str] = mapped_column(String(15))  # comportamental | tecnico (RN07)
    severidade: Mapped[str] = mapped_column(String(10), index=True)
    status: Mapped[str] = mapped_column(String(15), default="ativo", index=True)
    titulo: Mapped[str] = mapped_column(String(200))
    mensagem: Mapped[str] = mapped_column(Text, default="")
    orientacao: Mapped[str] = mapped_column(Text, default="")  # texto exibido ao operador (RF09)
    zona_id: Mapped[int] = mapped_column(ForeignKey("zonas.id"), index=True)
    evento_id: Mapped[int | None] = mapped_column(ForeignKey("eventos.id"), nullable=True)
    dispositivo_id: Mapped[int | None] = mapped_column(ForeignKey("dispositivos.id"), nullable=True)
    operador_id: Mapped[int | None] = mapped_column(ForeignKey("operadores.id"), nullable=True, index=True)
    epis_ausentes: Mapped[str] = mapped_column(String(255), default="")  # códigos de detecção, separados por vírgula
    confianca: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorrente: Mapped[bool] = mapped_column(Boolean, default=False)  # RN05
    reincidencias: Mapped[int] = mapped_column(Integer, default=0)
    notificou_supervisor: Mapped[bool] = mapped_column(Boolean, default=False)  # RF08 / RN03

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    orientacao_confirmada_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    responsavel_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    assumido_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finalizado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    classificacao: Mapped[str] = mapped_column(String(40), default="")
    situacao_verificada: Mapped[str] = mapped_column(String(60), default="")
    comentario_final: Mapped[str] = mapped_column(Text, default="")

    zona: Mapped[ZonaOperacional] = relationship(lazy="joined")
    evento: Mapped[EventoMonitoramento | None] = relationship(lazy="joined")
    dispositivo: Mapped[Dispositivo | None] = relationship(lazy="joined")
    operador: Mapped[Operador | None] = relationship(lazy="joined")
    responsavel: Mapped[Usuario | None] = relationship(lazy="joined")
    historico: Mapped[list[AlertaHistorico]] = relationship(
        back_populates="alerta", order_by="AlertaHistorico.criado_em", cascade="all, delete-orphan"
    )

    @property
    def codigo(self) -> str:
        return f"{'TEC' if self.categoria == 'tecnico' else 'ALT'}-{self.id:04d}"

    @property
    def ausentes(self) -> list[str]:
        return [c for c in self.epis_ausentes.split(",") if c]


class AlertaHistorico(Base):
    """Linha do tempo auditável de cada alerta/ocorrência (RNF07)."""

    __tablename__ = "alerta_historico"

    id: Mapped[int] = mapped_column(primary_key=True)
    alerta_id: Mapped[int] = mapped_column(ForeignKey("alertas.id", ondelete="CASCADE"), index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    autor_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    acao: Mapped[str] = mapped_column(String(30))
    descricao: Mapped[str] = mapped_column(Text, default="")

    alerta: Mapped[Alerta] = relationship(back_populates="historico")
    autor: Mapped[Usuario | None] = relationship(lazy="joined")


class LogAuditoria(Base):
    """Log de auditoria de alterações de cadastro e de regras (RNF07)."""

    __tablename__ = "log_auditoria"

    id: Mapped[int] = mapped_column(primary_key=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    entidade: Mapped[str] = mapped_column(String(40))
    entidade_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    acao: Mapped[str] = mapped_column(String(40))
    detalhes: Mapped[str] = mapped_column(Text, default="")

    usuario: Mapped[Usuario | None] = relationship(lazy="joined")
