"""Monitoramento ao vivo (UC03 · UC04 · RF04–RF06 · RF16): ingestão do Edge AI, dispositivos e simulador."""
import random
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import serializers as S
from ..database import get_db
from ..deps import EQUIPE_SEGURANCA, SUPERVISOR, dispositivo_ou_usuario, usuario_atual
from ..models import (
    CLASSIFICACOES,
    NIVEIS_RISCO,
    PERFIS,
    SEVERIDADE_LABEL,
    SITUACOES_VERIFICADAS,
    STATUS_ALERTA,
    STATUS_OPERADOR,
    TIPOS_RISCO,
    TURNOS,
    Alerta,
    Dispositivo,
    EventoMonitoramento,
    Operador,
    Usuario,
    ZonaOperacional,
    utcnow,
)
from ..realtime import hub
from ..regras import ResultadoAvaliacao, atualizar_status_dispositivo, avaliar_evento
from ..schemas import EventoIn, SimulacaoIn, StatusDispositivoIn
from .zonas import conformidade_por_zona

router = APIRouter(prefix="/api", tags=["Monitoramento (Edge AI)"])


def publicar_alerta(alerta: Alerta, novo: bool) -> None:
    hub.publicar({"tipo": "alerta_novo" if novo else "alerta_atualizado", "alerta": S.alerta_resumo(alerta),
                  "notificar_supervisor": novo and alerta.notificou_supervisor})


def _publicar_avaliacao(r: ResultadoAvaliacao) -> dict:
    hub.publicar({"tipo": "evento", "evento": S.evento(r.evento)})
    if r.alerta:
        publicar_alerta(r.alerta, r.alerta_novo)
    return {"evento": S.evento(r.evento), "alerta": S.alerta_resumo(r.alerta) if r.alerta else None,
            "alerta_novo": r.alerta_novo}


@router.get("/referencias", dependencies=[Depends(usuario_atual)])
def referencias():
    """Vocabulários usados pela interface."""
    return {"perfis": PERFIS, "turnos": TURNOS, "status_operador": STATUS_OPERADOR, "niveis_risco": NIVEIS_RISCO,
            "tipos_risco": TIPOS_RISCO, "severidades": SEVERIDADE_LABEL, "status_alerta": STATUS_ALERTA,
            "classificacoes": CLASSIFICACOES, "situacoes_verificadas": SITUACOES_VERIFICADAS}


@router.get("/monitoramento", dependencies=[Depends(EQUIPE_SEGURANCA)])
def painel(db: Session = Depends(get_db)):
    zonas = db.scalars(select(ZonaOperacional).order_by(ZonaOperacional.nome)).all()
    conf = conformidade_por_zona(db)
    pendentes = db.scalars(select(Alerta).where(Alerta.status.in_(("ativo", "em_tratamento"))))
    por_zona: dict[int, dict] = {}
    for a in pendentes.unique():
        d = por_zona.setdefault(a.zona_id, {"comportamentais": 0, "tecnicos": 0})
        d["comportamentais" if a.categoria == "comportamental" else "tecnicos"] += 1
    dispositivos = db.scalars(select(Dispositivo).order_by(Dispositivo.identificador)).all()
    eventos = db.scalars(select(EventoMonitoramento).order_by(EventoMonitoramento.criado_em.desc()).limit(20)).all()
    cams = [d for d in dispositivos if d.tipo == "camera"]
    sens = [d for d in dispositivos if d.tipo == "sensor"]
    return {
        "zonas": [S.zona_resumo(z) | {"conformidade_24h": conf.get(z.id, {}).get("conformidade"),
                                      "eventos_24h": conf.get(z.id, {}).get("eventos", 0),
                                      "alertas": por_zona.get(z.id, {"comportamentais": 0, "tecnicos": 0})} for z in zonas],
        "eventos_recentes": [S.evento(e) for e in eventos],
        "saude": {
            "cameras_online": sum(1 for d in cams if d.status == "online"), "cameras_total": len(cams),
            "sensores_online": sum(1 for d in sens if d.status == "online"), "sensores_total": len(sens),
            "api": "online", "clientes_tempo_real": hub.total_conexoes,
        },
        "dispositivos_com_falha": [S.dispositivo(d) for d in dispositivos if d.status != "online"],
    }


@router.get("/eventos", dependencies=[Depends(EQUIPE_SEGURANCA)])
def listar_eventos(zona_id: int | None = None, status: str | None = None, limite: int = Query(default=30, le=200),
                   db: Session = Depends(get_db)):
    stmt = select(EventoMonitoramento).order_by(EventoMonitoramento.criado_em.desc()).limit(limite)
    if zona_id:
        stmt = stmt.where(EventoMonitoramento.zona_id == zona_id)
    if status:
        stmt = stmt.where(EventoMonitoramento.status_conformidade == status)
    return [S.evento(e) for e in db.scalars(stmt)]


@router.post("/eventos")
def receber_evento(dados: EventoIn, db: Session = Depends(get_db), _=Depends(dispositivo_ou_usuario)):
    """Endpoint do gateway Edge AI (header `X-Device-Key`): um evento por pessoa detectada na zona (RF04)."""
    disp = db.scalar(select(Dispositivo).where(Dispositivo.identificador == dados.dispositivo))
    if not disp:
        raise HTTPException(404, "Dispositivo não cadastrado.")
    if disp.tipo != "camera":
        raise HTTPException(422, "Apenas câmeras enviam detecções de EPI.")
    if not disp.zona.ativa:
        raise HTTPException(409, "A zona deste dispositivo está com o monitoramento desativado.")
    momento = dados.momento.replace(tzinfo=None) if dados.momento else utcnow()
    r = avaliar_evento(db, disp, [d.model_dump() for d in dados.deteccoes], dados.matricula, momento)
    db.commit()
    return _publicar_avaliacao(r)


@router.get("/dispositivos", dependencies=[Depends(EQUIPE_SEGURANCA)])
def listar_dispositivos(db: Session = Depends(get_db)):
    return [S.dispositivo(d) for d in db.scalars(select(Dispositivo).order_by(Dispositivo.identificador))]


@router.post("/dispositivos/{identificador}/status")
def status_dispositivo(identificador: str, dados: StatusDispositivoIn, db: Session = Depends(get_db),
                       usuario: Usuario | None = Depends(dispositivo_ou_usuario)):
    """Heartbeat/saúde do dispositivo (RF16). Falhas geram alerta técnico (RN07)."""
    disp = db.scalar(select(Dispositivo).where(Dispositivo.identificador == identificador))
    if not disp:
        raise HTTPException(404, "Dispositivo não cadastrado.")
    alerta, novo = atualizar_status_dispositivo(db, disp, dados.status, dados.detalhe,
                                                autor_id=usuario.id if usuario else None)
    db.commit()
    hub.publicar({"tipo": "dispositivo", "dispositivo": S.dispositivo(disp)})
    if alerta:
        publicar_alerta(alerta, novo)
    return {"dispositivo": S.dispositivo(disp), "alerta": S.alerta_resumo(alerta) if alerta else None}


# ---------------------------------------------------------------------------
# Simulador (substitui o gateway Edge AI na demonstração)
# ---------------------------------------------------------------------------
def _deteccoes_simuladas(rng: random.Random, zona: ZonaOperacional, cenario: str) -> list[dict]:
    reqs = zona.requisitos_obrigatorios()
    codigos = [r.tipo_epi.codigo_deteccao for r in reqs]
    limiar = {r.tipo_epi.codigo_deteccao: r.confianca_minima for r in reqs}
    ausentes: set[str] = set()
    baixa: set[str] = set()
    if cenario == "ausencia_aleatoria":
        ausentes = {rng.choice(codigos)}
    elif cenario in ("sem_capacete", "sem_oculos"):
        item = "capacete" if cenario == "sem_capacete" else "oculos"
        if item not in codigos:
            nome = "Capacete" if item == "capacete" else "Óculos de proteção"
            raise HTTPException(422, f"{nome} não faz parte da matriz da zona {zona.nome}.")
        ausentes = {item}
    elif cenario == "varios_epis":
        ausentes = set(rng.sample(codigos, k=min(len(codigos), rng.choice([2, 3]))))
    elif cenario == "baixa_confianca":
        baixa = {rng.choice(codigos)}
    deteccoes = []
    for c in codigos:
        if c in ausentes:
            deteccoes.append({"epi": c, "presente": False, "confianca": round(rng.uniform(max(limiar[c], 0.9), 0.98), 2)})
        elif c in baixa:
            deteccoes.append({"epi": c, "presente": False, "confianca": round(limiar[c] - rng.uniform(0.06, 0.15), 2)})
        else:
            deteccoes.append({"epi": c, "presente": True, "confianca": round(rng.uniform(0.9, 0.99), 2)})
    return deteccoes


@router.post("/simulador/evento")
def simular_evento(dados: SimulacaoIn, db: Session = Depends(get_db), _=Depends(SUPERVISOR)):
    """Gera um evento como se viesse de uma câmera da zona (usado na demonstração)."""
    zona = db.get(ZonaOperacional, dados.zona_id)
    if not zona:
        raise HTTPException(404, "Zona não encontrada.")
    cameras = [d for d in zona.dispositivos if d.tipo == "camera" and d.status != "offline"]
    if not cameras:
        raise HTTPException(409, "Nenhuma câmera com sinal nesta zona.")
    rng = random.Random()
    operador = db.get(Operador, dados.operador_id) if dados.operador_id else None
    if not operador and rng.random() < 0.8:
        candidatos = db.scalars(select(Operador).where(Operador.setor == zona.setor,
                                                       Operador.status_operacional != "inativo")).all()
        operador = rng.choice(candidatos) if candidatos else None
    deteccoes = _deteccoes_simuladas(rng, zona, dados.cenario)
    r = avaliar_evento(db, rng.choice(cameras), deteccoes, operador.matricula if operador else None, origem="simulador")
    db.commit()
    return _publicar_avaliacao(r) | {"payload_edge": {"dispositivo": r.evento.dispositivo.identificador,
                                                      "matricula": operador.matricula if operador else None,
                                                      "deteccoes": deteccoes}}


@router.post("/simulador/dispositivos/{dispositivo_id}")
def simular_status(dispositivo_id: int, dados: StatusDispositivoIn, db: Session = Depends(get_db),
                   usuario: Usuario = Depends(SUPERVISOR)):
    disp = db.get(Dispositivo, dispositivo_id)
    if not disp:
        raise HTTPException(404, "Dispositivo não encontrado.")
    detalhe = dados.detalhe or {"offline": "Sem sinal há mais de 60 segundos", "degradado": "Taxa de quadros abaixo do mínimo",
                                "online": "Sinal restabelecido"}[dados.status]
    alerta, novo = atualizar_status_dispositivo(db, disp, dados.status, detalhe, autor_id=usuario.id)
    db.commit()
    hub.publicar({"tipo": "dispositivo", "dispositivo": S.dispositivo(disp)})
    if alerta:
        publicar_alerta(alerta, novo)
    return {"dispositivo": S.dispositivo(disp), "alerta": S.alerta_resumo(alerta) if alerta else None}


@router.get("/terminal/{zona_id}", dependencies=[Depends(usuario_atual)])
def terminal(zona_id: int, db: Session = Depends(get_db)):
    """Terminal de campo da zona (UC06 · RF09): orientação preventiva ao operador."""
    zona = db.get(ZonaOperacional, zona_id)
    if not zona:
        raise HTTPException(404, "Zona não encontrada.")
    recentes = db.scalars(
        select(Alerta).where(Alerta.zona_id == zona.id, Alerta.categoria == "comportamental",
                             Alerta.status.in_(("ativo", "em_tratamento")),
                             Alerta.atualizado_em >= utcnow() - timedelta(hours=2))
        .order_by(Alerta.atualizado_em.desc()).limit(5)
    ).all()
    return {"zona": S.zona_resumo(zona), "alertas": [S.alerta_resumo(a) for a in recentes]}
