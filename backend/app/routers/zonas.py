"""Zonas operacionais, matriz de EPIs e limiares (UC11 · RF03 · RF14 · RN01) + log de auditoria (RNF07)."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import serializers as S
from ..database import get_db
from ..deps import EQUIPE_SEGURANCA, SUPERVISOR, usuario_atual
from ..models import NIVEIS_RISCO, TIPOS_RISCO, EventoMonitoramento, LogAuditoria, RequisitoEPI, TipoEPI, Usuario, ZonaOperacional, utcnow
from ..regras import auditar
from ..schemas import TipoEPIIn, ZonaIn

router = APIRouter(prefix="/api", tags=["Zonas & regras"])


def conformidade_por_zona(db: Session, horas: int = 24) -> dict[int, dict]:
    desde = utcnow() - timedelta(hours=horas)
    linhas = db.execute(
        select(EventoMonitoramento.zona_id, EventoMonitoramento.status_conformidade)
        .where(EventoMonitoramento.criado_em >= desde)
    ).all()
    acc: dict[int, dict] = {}
    for zona_id, status in linhas:
        d = acc.setdefault(zona_id, {"eventos": 0, "conformes": 0, "nao_conformes": 0})
        if status == "inconclusivo":
            continue
        d["eventos"] += 1
        d["conformes"] += status == "conforme"
        d["nao_conformes"] += status == "nao_conforme"
    for d in acc.values():
        d["conformidade"] = round(d["conformes"] / d["eventos"] * 100, 1) if d["eventos"] else None
    return acc


def _descrever(z: ZonaOperacional) -> str:
    matriz = "; ".join(f"{r.tipo_epi.nome} ≥{round(r.confianca_minima * 100)}%{'' if r.obrigatorio else ' (opcional)'}"
                       for r in z.requisitos)
    return f"{z.nome} · {z.setor} · risco {NIVEIS_RISCO[z.nivel_risco].lower()} · {'ativa' if z.ativa else 'inativa'} · {matriz}"


def _aplicar(db: Session, z: ZonaOperacional, dados: ZonaIn) -> None:
    ids = [r.tipo_epi_id for r in dados.requisitos]
    if len(ids) != len(set(ids)):
        raise HTTPException(422, "Um mesmo EPI aparece duas vezes na matriz.")
    tipos = {t.id: t for t in db.scalars(select(TipoEPI).where(TipoEPI.id.in_(ids)))}
    if len(tipos) != len(ids):
        raise HTTPException(422, "A matriz contém um tipo de EPI inexistente.")
    if not any(r.obrigatorio for r in dados.requisitos):
        raise HTTPException(422, "A zona precisa de pelo menos um EPI obrigatório (RN01).")
    for campo in ("nome", "setor", "linha", "tipo_risco", "nivel_risco", "ativa"):
        setattr(z, campo, getattr(dados, campo))
    existentes = {r.tipo_epi_id: r for r in z.requisitos}
    novos = []
    for r in dados.requisitos:
        req = existentes.get(r.tipo_epi_id) or RequisitoEPI(tipo_epi_id=r.tipo_epi_id)
        req.tipo_epi = tipos[r.tipo_epi_id]
        req.confianca_minima, req.obrigatorio = round(r.confianca_minima, 2), r.obrigatorio
        novos.append(req)
    z.requisitos = novos


@router.get("/zonas", dependencies=[Depends(usuario_atual)])
def listar(db: Session = Depends(get_db)):
    conf = conformidade_por_zona(db)
    return [S.zona_resumo(z) | {"conformidade_24h": conf.get(z.id, {}).get("conformidade")}
            for z in db.scalars(select(ZonaOperacional).order_by(ZonaOperacional.nome))]


@router.get("/zonas/opcoes", dependencies=[Depends(usuario_atual)])
def opcoes():
    return {"niveis_risco": NIVEIS_RISCO, "tipos_risco": TIPOS_RISCO}


@router.get("/zonas/{zona_id}", dependencies=[Depends(usuario_atual)])
def detalhe(zona_id: int, db: Session = Depends(get_db)):
    z = db.get(ZonaOperacional, zona_id)
    if not z:
        raise HTTPException(404, "Zona não encontrada.")
    logs = db.scalars(select(LogAuditoria).where(LogAuditoria.entidade == "zona", LogAuditoria.entidade_id == z.id)
                      .order_by(LogAuditoria.criado_em.desc()).limit(20)).all()
    conf = conformidade_por_zona(db).get(z.id, {})
    return S.zona_detalhe(z) | {"conformidade_24h": conf.get("conformidade"), "eventos_24h": conf.get("eventos", 0),
                                "auditoria": [S.auditoria(l) for l in logs]}


@router.post("/zonas", status_code=201)
def criar(dados: ZonaIn, db: Session = Depends(get_db), usuario: Usuario = Depends(SUPERVISOR)):
    if db.scalar(select(ZonaOperacional.id).where(ZonaOperacional.nome == dados.nome)):
        raise HTTPException(409, "Já existe uma zona com este nome.")
    z = ZonaOperacional()
    _aplicar(db, z, dados)
    db.add(z)
    db.flush()
    auditar(db, usuario.id, "zona", z.id, "criacao", _descrever(z))
    db.commit()
    return S.zona_detalhe(z)


@router.put("/zonas/{zona_id}")
def atualizar(zona_id: int, dados: ZonaIn, db: Session = Depends(get_db), usuario: Usuario = Depends(SUPERVISOR)):
    z = db.get(ZonaOperacional, zona_id)
    if not z:
        raise HTTPException(404, "Zona não encontrada.")
    if db.scalar(select(ZonaOperacional.id).where(ZonaOperacional.nome == dados.nome, ZonaOperacional.id != z.id)):
        raise HTTPException(409, "Já existe uma zona com este nome.")
    antes = _descrever(z)
    _aplicar(db, z, dados)
    db.flush()
    depois = _descrever(z)
    if antes != depois:
        auditar(db, usuario.id, "zona", z.id, "alteracao_regra", f"Antes: {antes}\nDepois: {depois}")
    db.commit()
    db.refresh(z)
    return S.zona_detalhe(z)


@router.get("/tipos-epi", dependencies=[Depends(usuario_atual)])
def listar_tipos(db: Session = Depends(get_db)):
    return [S.tipo_epi(t) for t in db.scalars(select(TipoEPI).order_by(TipoEPI.nome))]


@router.post("/tipos-epi", status_code=201)
def criar_tipo(dados: TipoEPIIn, db: Session = Depends(get_db), usuario: Usuario = Depends(SUPERVISOR)):
    if db.scalar(select(TipoEPI.id).where(TipoEPI.codigo_deteccao == dados.codigo_deteccao)):
        raise HTTPException(409, "Já existe um EPI com este código de detecção.")
    t = TipoEPI(**dados.model_dump())
    db.add(t)
    db.flush()
    auditar(db, usuario.id, "tipo_epi", t.id, "criacao", f"{t.nome} ({t.norma_referencia}) · classe {t.codigo_deteccao}")
    db.commit()
    return S.tipo_epi(t)


@router.get("/auditoria", dependencies=[Depends(EQUIPE_SEGURANCA)])
def listar_auditoria(limite: int = Query(default=50, le=200), db: Session = Depends(get_db)):
    return [S.auditoria(l) for l in db.scalars(select(LogAuditoria).order_by(LogAuditoria.criado_em.desc()).limit(limite))]
