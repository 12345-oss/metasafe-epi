"""Operadores & EPIs (RF02 · UC03 · UC04 · RF06): cadastro e consulta de conformidade por colaborador."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .. import serializers as S
from ..database import get_db
from ..deps import EQUIPE_SEGURANCA, SUPERVISOR
from ..models import STATUS_PENDENTES, Alerta, EventoMonitoramento, Operador, Usuario, ZonaOperacional, utcnow
from ..regras import auditar
from ..schemas import OperadorIn

router = APIRouter(prefix="/api/operadores", tags=["Operadores & EPIs"], dependencies=[Depends(EQUIPE_SEGURANCA)])


def _taxa(conformes: int, total: int) -> float | None:
    return round(conformes / total * 100, 1) if total else None


@router.get("")
def listar(
    q: str | None = None,
    setor: str | None = None,
    turno: str | None = Query(default=None, pattern="^[ABC]$"),
    situacao: str | None = Query(default=None, pattern="^(acao_necessaria|conforme|sem_evento)$"),
    db: Session = Depends(get_db),
):
    stmt = select(Operador).order_by(Operador.nome)
    if q:
        termo = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Operador.nome).like(termo), func.lower(Operador.matricula).like(termo),
                              func.lower(Operador.setor).like(termo)))
    if setor:
        stmt = stmt.where(Operador.setor == setor)
    if turno:
        stmt = stmt.where(Operador.turno == turno)
    operadores = db.scalars(stmt).all()

    desde = utcnow() - timedelta(days=30)
    eventos = db.execute(
        select(EventoMonitoramento.operador_id, EventoMonitoramento.status_conformidade, EventoMonitoramento.criado_em,
               EventoMonitoramento.zona_id)
        .where(EventoMonitoramento.operador_id.is_not(None), EventoMonitoramento.criado_em >= desde)
        .order_by(EventoMonitoramento.criado_em)
    ).all()
    stats: dict[int, dict] = {}
    for op_id, status, quando, zona_id in eventos:
        d = stats.setdefault(op_id, {"total": 0, "conformes": 0, "ultimo": None, "zona_id": None})
        if status != "inconclusivo":
            d["total"] += 1
            d["conformes"] += status == "conforme"
        d["ultimo"], d["zona_id"] = quando, zona_id
    pendentes = dict(db.execute(
        select(Alerta.operador_id, func.count()).where(Alerta.operador_id.is_not(None), Alerta.status.in_(STATUS_PENDENTES))
        .group_by(Alerta.operador_id)).all())
    zonas = {z.id: z.nome for z in db.scalars(select(ZonaOperacional))}

    resultado = []
    limite_recente = utcnow() - timedelta(days=7)
    for o in operadores:
        st = stats.get(o.id, {})
        if pendentes.get(o.id):
            sit = "acao_necessaria"
        elif st.get("ultimo") and st["ultimo"] >= limite_recente:
            sit = "conforme"
        else:
            sit = "sem_evento"
        if situacao and sit != situacao:
            continue
        resultado.append(S.operador(o) | {
            "situacao": sit,
            "alertas_pendentes": pendentes.get(o.id, 0),
            "zona_recente": zonas.get(st.get("zona_id")),
            "ultimo_evento": S.iso(st.get("ultimo")),
            "conformidade_30d": _taxa(st.get("conformes", 0), st.get("total", 0)),
        })
    return resultado


@router.get("/setores")
def setores(db: Session = Depends(get_db)):
    return sorted({s for (s,) in db.execute(select(Operador.setor).distinct())})


@router.get("/{operador_id}")
def detalhe(operador_id: int, db: Session = Depends(get_db)):
    o = db.get(Operador, operador_id)
    if not o:
        raise HTTPException(404, "Operador não encontrado.")
    eventos = db.scalars(select(EventoMonitoramento).where(EventoMonitoramento.operador_id == o.id)
                         .order_by(EventoMonitoramento.criado_em.desc()).limit(15)).all()
    desde = utcnow() - timedelta(days=30)
    contagem = dict(db.execute(
        select(EventoMonitoramento.status_conformidade, func.count())
        .where(EventoMonitoramento.operador_id == o.id, EventoMonitoramento.criado_em >= desde)
        .group_by(EventoMonitoramento.status_conformidade)).all())
    total = contagem.get("conforme", 0) + contagem.get("nao_conforme", 0)
    alertas = db.scalars(select(Alerta).where(Alerta.operador_id == o.id).order_by(Alerta.criado_em.desc()).limit(20)).all()
    ultimo = eventos[0] if eventos else None
    # Matriz da zona mais recente x última detecção (consulta de EPI por colaborador)
    matriz = []
    if ultimo:
        dets = {d["epi"]: d for d in ultimo.deteccoes}
        for r in ultimo.zona.requisitos_obrigatorios():
            d = dets.get(r.tipo_epi.codigo_deteccao, {})
            matriz.append({"nome": r.tipo_epi.nome, "norma_referencia": r.tipo_epi.norma_referencia,
                           "limiar": r.confianca_minima, "presente": d.get("presente"),
                           "confianca": d.get("confianca"), "resultado": d.get("resultado", "nao_avaliado")})
    return S.operador(o) | {
        "conformidade_30d": _taxa(contagem.get("conforme", 0), total),
        "eventos_30d": sum(contagem.values()),
        "alertas_pendentes": sum(1 for a in alertas if a.status in STATUS_PENDENTES),
        "alertas_30d": sum(1 for a in alertas if a.criado_em >= desde),
        "zona_recente": S.zona_resumo(ultimo.zona) if ultimo else None,
        "ultimo_evento": S.evento(ultimo) if ultimo else None,
        "matriz_ultimo_evento": matriz,
        "eventos": [S.evento(e) for e in eventos],
        "alertas": [S.alerta_resumo(a) for a in alertas],
    }


@router.post("", status_code=201)
def criar(dados: OperadorIn, db: Session = Depends(get_db), usuario: Usuario = Depends(SUPERVISOR)):
    if db.scalar(select(Operador.id).where(Operador.matricula == dados.matricula)):
        raise HTTPException(409, "Já existe um operador com esta matrícula/crachá.")
    o = Operador(**dados.model_dump())
    db.add(o)
    db.flush()
    auditar(db, usuario.id, "operador", o.id, "criacao", f"{o.nome} · {o.matricula} · {o.setor} · turno {o.turno}")
    db.commit()
    return S.operador(o)


@router.put("/{operador_id}")
def atualizar(operador_id: int, dados: OperadorIn, db: Session = Depends(get_db), usuario: Usuario = Depends(SUPERVISOR)):
    o = db.get(Operador, operador_id)
    if not o:
        raise HTTPException(404, "Operador não encontrado.")
    if db.scalar(select(Operador.id).where(Operador.matricula == dados.matricula, Operador.id != o.id)):
        raise HTTPException(409, "Já existe um operador com esta matrícula/crachá.")
    mudancas = []
    for campo, valor in dados.model_dump().items():
        if getattr(o, campo) != valor:
            mudancas.append(f"{campo}: {getattr(o, campo)} → {valor}")
            setattr(o, campo, valor)
    if mudancas:
        auditar(db, usuario.id, "operador", o.id, "alteracao", "; ".join(mudancas))
    db.commit()
    return S.operador(o)

