"""Modelos de entrada (validação) da API."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from .models import CLASSIFICACOES, SITUACOES_VERIFICADAS

Classificacao = Literal[CLASSIFICACOES]  # type: ignore[valid-type]
Situacao = Literal[SITUACOES_VERIFICADAS]  # type: ignore[valid-type]


class LoginIn(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1)


class OperadorIn(BaseModel):
    matricula: str = Field(min_length=3, max_length=20, description="Matrícula / crachá")
    nome: str = Field(min_length=3, max_length=160)
    setor: str = Field(min_length=2, max_length=80)
    turno: Literal["A", "B", "C"]
    status_operacional: Literal["em_operacao", "fora_de_area", "inativo"] = "em_operacao"


class RequisitoIn(BaseModel):
    tipo_epi_id: int
    confianca_minima: float = Field(ge=0.5, le=0.99)
    obrigatorio: bool = True


class ZonaIn(BaseModel):
    nome: str = Field(min_length=3, max_length=120)
    setor: str = Field(min_length=2, max_length=80)
    linha: str = ""
    tipo_risco: str = Field(min_length=3, max_length=60)
    nivel_risco: Literal["medio", "alto", "critico"]
    ativa: bool = True
    requisitos: list[RequisitoIn] = Field(min_length=1, description="Matriz de EPIs obrigatórios (RN01)")


class TipoEPIIn(BaseModel):
    nome: str = Field(min_length=3, max_length=120)
    descricao: str = ""
    norma_referencia: str = ""
    codigo_deteccao: str = Field(min_length=3, max_length=40, pattern=r"^[a-z_]+$")


class EncerrarIn(BaseModel):
    classificacao: Classificacao
    situacao_verificada: Situacao
    comentario: str = Field(min_length=5, description="Ação preventiva registrada pelo supervisor")


class EscalarIn(BaseModel):
    classificacao: Classificacao = "Risco recorrente"
    comentario: str = Field(min_length=5, description="Motivo do escalonamento")


class ComentarioIn(BaseModel):
    texto: str = Field(min_length=2)


# --- Ingestão Edge AI / dispositivos ---------------------------------------
class DeteccaoIn(BaseModel):
    epi: str = Field(description="Código da classe detectada, ex.: capacete")
    presente: bool
    confianca: float = Field(ge=0, le=1)


class EventoIn(BaseModel):
    dispositivo: str = Field(description="Identificador da câmera, ex.: CAM-LM02-A")
    matricula: str | None = Field(default=None, description="Crachá lido na entrada da zona (sem reconhecimento facial)")
    momento: datetime | None = None
    deteccoes: list[DeteccaoIn]


class StatusDispositivoIn(BaseModel):
    status: Literal["online", "degradado", "offline"]
    detalhe: str = ""


class SimulacaoIn(BaseModel):
    zona_id: int
    cenario: Literal["conforme", "ausencia_aleatoria", "sem_capacete", "sem_oculos", "varios_epis", "baixa_confianca"] = "ausencia_aleatoria"
    operador_id: int | None = None
