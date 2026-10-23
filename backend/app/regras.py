"""Motor de regras de EPI (MotorRegrasEPI no diagrama de classes).

Fluxo implementado (diagrama de atividades da Sprint 1):
evento capturado no edge → consulta da matriz de EPIs da zona → conforme? → registra evento
→ não conforme: calcula severidade → cria alerta preventivo → orienta operador e, se a
severidade for média ou crítica, notifica o supervisor (RF07, RF08, RF09, RN02, RN03, RN05, RN07).
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .models import (
    SEVERIDADES,
    STATUS_PENDENTES,
    Alerta,
    AlertaHistorico,
    Dispositivo,
    EventoMonitoramento,
    LogAuditoria,
    Operador,
    TipoEPI,
    utcnow,
)

TZ = ZoneInfo(settings.timezone)

# Ausência destes itens expõe o operador a risco grave (queda de objetos, choque, radiação, inalação).
EPIS_CRITICOS = {"capacete", "luvas_isolantes", "mascara_solda", "respirador"}
# Severidade base pelo nível de risco da zona; sobe um nível se faltar EPI crítico e outro se o caso for recorrente.
SEVERIDADE_BASE = {"medio": "baixa", "alto": "media", "critico": "media"}
# Nova detecção do mesmo problema dentro desta janela reforça o alerta aberto em vez de criar outro.
JANELA_REINCIDENCIA = timedelta(minutes=10)
# RN05: com este número de alertas anteriores na janela, o caso deixa de ser esquecimento pontual.
LIMITE_RECORRENCIA = 2
JANELA_RECORRENCIA = timedelta(days=7)


# ---------------------------------------------------------------------------
# Utilidades de data e texto
# ---------------------------------------------------------------------------
def local(dt_utc: datetime) -> datetime:
    return dt_utc.replace(tzinfo=timezone.utc).astimezone(TZ)


def hoje_local(agora_utc: datetime | None = None) -> date:
    return local(agora_utc or utcnow()).date()


def turno_de(dt_utc: datetime) -> str:
    h = local(dt_utc).hour
    return "A" if 6 <= h < 14 else "B" if 14 <= h < 22 else "C"


def minuscula(nome: str) -> str:
    """Primeira letra minúscula, preservando siglas (ex.: "Respirador PFF2" → "respirador PFF2")."""
    return nome[:1].lower() + nome[1:]


def juntar(nomes: list[str]) -> str:
    if len(nomes) <= 1:
        return "".join(nomes)
    return ", ".join(nomes[:-1]) + " e " + nomes[-1]


def escalar(severidade: str, niveis: int = 1) -> str:
    return SEVERIDADES[min(SEVERIDADES.index(severidade) + niveis, len(SEVERIDADES) - 1)]


def maior(a: str, b: str) -> str:
    return a if SEVERIDADES.index(a) >= SEVERIDADES.index(b) else b


def calcular_severidade(nivel_risco: str, ausentes: set[str], recorrente: bool) -> str:
    sev = SEVERIDADE_BASE[nivel_risco]
    if ausentes & EPIS_CRITICOS:
        sev = escalar(sev)
    if recorrente:
        sev = escalar(sev)
    return sev


def registrar_historico(db: Session, alerta: Alerta, acao: str, descricao: str,
                        autor_id: int | None = None, momento: datetime | None = None) -> None:
    db.add(AlertaHistorico(alerta=alerta, acao=acao, descricao=descricao, autor_id=autor_id,
                           criado_em=momento or utcnow()))


def auditar(db: Session, usuario_id: int | None, entidade: str, entidade_id: int | None, acao: str, detalhes: str) -> None:
    db.add(LogAuditoria(usuario_id=usuario_id, entidade=entidade, entidade_id=entidade_id, acao=acao, detalhes=detalhes))


def precisa_notificar(severidade: str) -> bool:
    """RF08 / RN03: supervisor é notificado em alertas de severidade média ou crítica."""
    return severidade in ("media", "critica")


# ---------------------------------------------------------------------------
# Avaliação de eventos do Edge AI
# ---------------------------------------------------------------------------
@dataclass
class ResultadoAvaliacao:
    evento: EventoMonitoramento
    alerta: Alerta | None = None
    alerta_novo: bool = False
    itens: list[dict] = field(default_factory=list)


def _alertas_recentes_do_operador(db: Session, operador_id: int, momento: datetime) -> int:
    return db.scalar(
        select(func.count()).select_from(Alerta).where(
            Alerta.operador_id == operador_id,
            Alerta.categoria == "comportamental",
            Alerta.criado_em >= momento - JANELA_RECORRENCIA,
            Alerta.classificacao != "Falso positivo",
        )
    ) or 0


def _alerta_pendente(db: Session, zona_id: int, operador_id: int | None, dispositivo_id: int | None,
                     momento: datetime) -> Alerta | None:
    stmt = select(Alerta).where(
        Alerta.tipo == "EPI_AUSENTE",
        Alerta.zona_id == zona_id,
        Alerta.status.in_(STATUS_PENDENTES),
        Alerta.atualizado_em >= momento - JANELA_REINCIDENCIA,
    )
    if operador_id:
        stmt = stmt.where(Alerta.operador_id == operador_id)
    else:
        stmt = stmt.where(Alerta.operador_id.is_(None), Alerta.dispositivo_id == dispositivo_id)
    return db.scalars(stmt.order_by(Alerta.atualizado_em.desc())).first()


def avaliar_evento(db: Session, dispositivo: Dispositivo, deteccoes: list[dict], matricula: str | None = None,
                   momento: datetime | None = None, origem: str = "edge_ai") -> ResultadoAvaliacao:
    """Compara as detecções com a matriz de EPIs da zona e gera/reforça o alerta quando necessário.

    `deteccoes`: [{"epi": "capacete", "presente": bool, "confianca": 0..1}, ...]
    """
    momento = momento or utcnow()
    zona = dispositivo.zona
    dispositivo.ultimo_sinal = momento
    operador = db.scalar(select(Operador).where(Operador.matricula == matricula)) if matricula else None
    por_codigo = {d["epi"]: d for d in deteccoes}

    itens, ausentes, abaixo_limiar = [], [], []
    for req in zona.requisitos_obrigatorios():
        codigo = req.tipo_epi.codigo_deteccao
        det = por_codigo.get(codigo)
        conf = float(det["confianca"]) if det and det.get("confianca") is not None else None
        if det is None:
            resultado = "nao_avaliado"
        elif det.get("presente"):
            resultado = "conforme"
        elif conf is not None and conf >= req.confianca_minima:
            resultado = "ausente"
            ausentes.append(req)
        else:
            resultado = "abaixo_limiar"  # RN02: sem confiança suficiente, não gera alerta
            abaixo_limiar.append(req)
        itens.append({"epi": codigo, "nome": req.tipo_epi.nome, "norma": req.tipo_epi.norma_referencia,
                      "presente": bool(det and det.get("presente")), "confianca": conf,
                      "limiar": req.confianca_minima, "resultado": resultado})

    total = len(itens)
    conformes = sum(1 for i in itens if i["resultado"] == "conforme")
    if ausentes:
        status = "nao_conforme"
        resumo = f"Ausente: {juntar([minuscula(r.tipo_epi.nome) for r in ausentes])} · {conformes}/{total} EPIs"
    elif abaixo_limiar or any(i["resultado"] == "nao_avaliado" for i in itens):
        status = "inconclusivo"
        pend = abaixo_limiar or [r for r in zona.requisitos_obrigatorios()
                                 if por_codigo.get(r.tipo_epi.codigo_deteccao) is None]
        resumo = f"Abaixo do limiar: {juntar([minuscula(r.tipo_epi.nome) for r in pend])} · sem alerta (RN02)"
    else:
        status = "conforme"
        resumo = f"Entrada validada com todos os EPIs · {total}/{total} itens"

    evento = EventoMonitoramento(
        criado_em=momento, zona_id=zona.id, dispositivo_id=dispositivo.id,
        operador_id=operador.id if operador else None, origem=origem,
        status_conformidade=status, deteccoes_json=json.dumps(itens, ensure_ascii=False), resumo=resumo,
    )
    db.add(evento)
    db.flush()
    resultado = ResultadoAvaliacao(evento=evento, itens=itens)
    if not ausentes:
        return resultado

    codigos = {r.tipo_epi.codigo_deteccao for r in ausentes}
    confianca = max(float(por_codigo[c]["confianca"]) for c in codigos)
    pendente = _alerta_pendente(db, zona.id, operador.id if operador else None, dispositivo.id, momento)
    if pendente:
        pendente.reincidencias += 1
        pendente.epis_ausentes = ",".join(sorted(set(pendente.ausentes) | codigos))
        anterior = pendente.severidade
        nova = calcular_severidade(zona.nivel_risco, set(pendente.ausentes), pendente.recorrente)
        if pendente.reincidencias >= 2:  # o risco persiste mesmo após a orientação
            nova = escalar(nova)
        pendente.severidade = maior(anterior, nova)
        pendente.atualizado_em = momento
        msg = f"Nova detecção do mesmo risco ({evento.codigo}). Reincidência nº {pendente.reincidencias} na mesma janela."
        if pendente.severidade != anterior:
            msg += f" Severidade elevada para {pendente.severidade}."
            if precisa_notificar(pendente.severidade) and not pendente.notificou_supervisor:
                pendente.notificou_supervisor = True
                msg += " Supervisor notificado."
        registrar_historico(db, pendente, "reincidencia", msg, momento=momento)
        db.flush()
        resultado.alerta = pendente
        return resultado

    recorrente = bool(operador) and _alertas_recentes_do_operador(db, operador.id, momento) >= LIMITE_RECORRENCIA
    severidade = calcular_severidade(zona.nivel_risco, codigos, recorrente)
    nomes = [r.tipo_epi.nome for r in ausentes]
    titulo = f"Sem {juntar([minuscula(n) for n in nomes])}"
    quem = f"{operador.nome} ({operador.matricula})" if operador else "Operador não identificado"
    orientacao = (f"Esta área exige {juntar([minuscula(n) for n in nomes])}. Coloque o EPI e aguarde uma nova "
                  "validação automática, ou saia da zona antes de retomar a atividade.")
    if recorrente:
        orientacao += " Procure a supervisão de segurança para uma conversa de orientação."
    alerta = Alerta(
        tipo="EPI_AUSENTE", categoria="comportamental", severidade=severidade, status="ativo",
        titulo=titulo, mensagem=f"{zona.nome}: {quem} sem {juntar([minuscula(n) for n in nomes])}.",
        orientacao=orientacao, zona_id=zona.id, evento_id=evento.id, dispositivo_id=dispositivo.id,
        operador_id=operador.id if operador else None, epis_ausentes=",".join(sorted(codigos)),
        confianca=confianca, recorrente=recorrente, notificou_supervisor=precisa_notificar(severidade),
        criado_em=momento, atualizado_em=momento,
    )
    db.add(alerta)
    registrar_historico(db, alerta, "evento", f"Evento {evento.codigo} capturado no edge por {dispositivo.identificador} · "
                                              f"{conformes} de {total} EPIs detectados.", momento=momento)
    registrar_historico(db, alerta, "emitido", f"Alerta preventivo emitido · confiança {round(confianca * 100)}%"
                                               + (" · risco recorrente (RN05)" if recorrente else ""), momento=momento)
    registrar_historico(db, alerta, "notificacao",
                        "Orientação exibida ao operador e supervisor notificado." if alerta.notificou_supervisor
                        else "Orientação exibida ao operador no terminal local (severidade baixa).", momento=momento)
    db.flush()
    resultado.alerta, resultado.alerta_novo = alerta, True
    return resultado


# ---------------------------------------------------------------------------
# Saúde de dispositivos (RF16, RN07)
# ---------------------------------------------------------------------------
def atualizar_status_dispositivo(db: Session, dispositivo: Dispositivo, status: str, detalhe: str = "",
                                 momento: datetime | None = None, autor_id: int | None = None) -> tuple[Alerta | None, bool]:
    """Atualiza o status do dispositivo. Falha gera ALERTA TÉCNICO, nunca alerta comportamental (RN07)."""
    momento = momento or utcnow()
    anterior = dispositivo.status
    dispositivo.status = status
    if status != "offline":
        dispositivo.ultimo_sinal = momento
    pendente = db.scalars(select(Alerta).where(Alerta.dispositivo_id == dispositivo.id, Alerta.tipo == "FALHA_DISPOSITIVO",
                                               Alerta.status.in_(STATUS_PENDENTES))).first()
    nome = "câmera" if dispositivo.tipo == "camera" else "sensor"
    if status in ("degradado", "offline"):
        if pendente:
            if anterior != status:
                registrar_historico(db, pendente, "status_dispositivo", f"Status alterado para {status}. {detalhe}".strip(),
                                    autor_id, momento)
                pendente.atualizado_em = momento
            return pendente, False
        titulo = (f"Perda de sinal da {nome} {dispositivo.identificador}" if status == "offline"
                  else f"{nome.capitalize()} {dispositivo.identificador} em modo degradado")
        alerta = Alerta(
            tipo="FALHA_DISPOSITIVO", categoria="tecnico", severidade="media", status="ativo", titulo=titulo,
            mensagem=f"{dispositivo.zona.nome}: {detalhe or 'falha reportada pelo gateway edge'}. "
                     "Alerta técnico — nenhum operador é associado a esta ocorrência (RN07).",
            zona_id=dispositivo.zona_id, dispositivo_id=dispositivo.id, notificou_supervisor=True,
            criado_em=momento, atualizado_em=momento,
        )
        db.add(alerta)
        registrar_historico(db, alerta, "emitido", f"Falha técnica registrada: {dispositivo.identificador} ({status}).",
                            autor_id, momento)
        db.flush()
        return alerta, True
    if pendente and anterior != status:
        registrar_historico(db, pendente, "status_dispositivo", "Dispositivo voltou a enviar sinal normalmente.",
                            autor_id, momento)
        pendente.atualizado_em = momento
        return pendente, False
    return None, False


def tipos_epi_por_codigo(db: Session) -> dict[str, TipoEPI]:
    return {t.codigo_deteccao: t for t in db.scalars(select(TipoEPI))}
