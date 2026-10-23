"""Central de alertas, tratamento e histórico de ocorrências (UC05 · UC07 · UC08 · RF10 · RF11 · RN04)."""
import csv
import io
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from .. import serializers as S
from ..database import get_db
from ..deps import EQUIPE_SEGURANCA, TRATAMENTO, usuario_atual
from ..models import (
    SEVERIDADE_LABEL,
    SEVERIDADES,
    STATUS_ALERTA,
    STATUS_PENDENTES,
    TIPOS_ALERTA,
    Alerta,
    Operador,
    Usuario,
    utcnow,
)
from ..realtime import hub
from ..regras import TZ, local, registrar_historico
from ..schemas import ComentarioIn, EncerrarIn, EscalarIn

router = APIRouter(prefix="/api/alertas", tags=["Alertas & ocorrências"])


def _lista(valor: str | None, permitidos) -> list[str]:
    itens = [v.strip() for v in (valor or "").split(",") if v.strip()]
    invalidos = [v for v in itens if v not in permitidos]
    if invalidos:
        raise HTTPException(422, f"Valor(es) inválido(s): {', '.join(invalidos)}")
    return itens


def _inicio_dia_utc(d: date) -> datetime:
    return datetime.combine(d, time.min, TZ).astimezone(timezone.utc).replace(tzinfo=None)


def _filtrar(stmt, status, severidade, categoria, zona_id, operador_id, de, ate, q):
    if s := _lista(status, STATUS_ALERTA):
        stmt = stmt.where(Alerta.status.in_(s))
    if sv := _lista(severidade, SEVERIDADES):
        stmt = stmt.where(Alerta.severidade.in_(sv))
    if categoria:
        stmt = stmt.where(Alerta.categoria == categoria)
    if zona_id:
        stmt = stmt.where(Alerta.zona_id == zona_id)
    if operador_id:
        stmt = stmt.where(Alerta.operador_id == operador_id)
    if de:
        stmt = stmt.where(Alerta.criado_em >= _inicio_dia_utc(de))
    if ate:
        stmt = stmt.where(Alerta.criado_em < _inicio_dia_utc(ate + timedelta(days=1)))
    if q:
        termo = f"%{q.lower()}%"
        stmt = stmt.outerjoin(Operador, Alerta.operador_id == Operador.id).where(
            or_(func.lower(Alerta.titulo).like(termo), func.lower(Alerta.mensagem).like(termo),
                func.lower(Operador.matricula).like(termo)))
    return stmt


_ORDEM_SEVERIDADE = case({s: i for i, s in enumerate(SEVERIDADES)}, value=Alerta.severidade)


@router.get("", dependencies=[Depends(EQUIPE_SEGURANCA)])
def listar(
    status: str | None = Query(default=None, description="Ex.: ativo,em_tratamento"),
    severidade: str | None = None,
    categoria: str | None = Query(default=None, pattern="^(comportamental|tecnico)$"),
    zona_id: int | None = None,
    operador_id: int | None = None,
    de: date | None = None,
    ate: date | None = None,
    q: str | None = None,
    ordenar: str = Query(default="recentes", pattern="^(recentes|prioridade)$"),
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=25, ge=1, le=200),
    db: Session = Depends(get_db),
):
    args = (status, severidade, categoria, zona_id, operador_id, de, ate, q)
    total = db.scalar(select(func.count()).select_from(_filtrar(select(Alerta.id), *args).subquery()))
    stmt = _filtrar(select(Alerta), *args)
    stmt = (stmt.order_by(_ORDEM_SEVERIDADE.desc(), Alerta.criado_em.desc()) if ordenar == "prioridade"
            else stmt.order_by(Alerta.criado_em.desc()))
    itens = db.scalars(stmt.offset((pagina - 1) * por_pagina).limit(por_pagina)).unique().all()
    return {"total": total, "pagina": pagina, "por_pagina": por_pagina, "itens": [S.alerta_resumo(a) for a in itens]}


@router.get("/resumo", dependencies=[Depends(EQUIPE_SEGURANCA)])
def resumo(db: Session = Depends(get_db)):
    """Faixa de indicadores da Central de alertas."""
    agora = utcnow()
    pendentes = db.scalars(select(Alerta).where(Alerta.status.in_(STATUS_PENDENTES))).unique().all()
    inicio_turno = agora - timedelta(hours=8)
    finalizados = db.scalars(select(Alerta).where(Alerta.finalizado_em >= inicio_turno)).unique().all()
    respostas = db.execute(select(Alerta.criado_em, Alerta.assumido_em).where(
        Alerta.assumido_em.is_not(None), Alerta.criado_em >= agora - timedelta(days=7))).all()
    minutos = [(b - a).total_seconds() / 60 for a, b in respostas]
    return {
        "ativos": sum(1 for a in pendentes if a.status == "ativo"),
        "em_tratamento": sum(1 for a in pendentes if a.status == "em_tratamento"),
        "criticos": sum(1 for a in pendentes if a.severidade == "critica"),
        "tecnicos": sum(1 for a in pendentes if a.categoria == "tecnico"),
        "tempo_medio_resposta_min": round(sum(minutos) / len(minutos), 1) if minutos else None,
        "encerrados_ultimas_8h": len(finalizados),
    }


@router.get("/exportar.csv", dependencies=[Depends(EQUIPE_SEGURANCA)])
def exportar_csv(status: str | None = None, severidade: str | None = None, categoria: str | None = None,
                 zona_id: int | None = None, operador_id: int | None = None, de: date | None = None,
                 ate: date | None = None, q: str | None = None, db: Session = Depends(get_db)):
    """Histórico de ocorrências em CSV (RF13)."""
    stmt = _filtrar(select(Alerta), status, severidade, categoria, zona_id, operador_id, de, ate, q)
    alertas = db.scalars(stmt.order_by(Alerta.criado_em.desc())).unique().all()

    def fmt(dt):
        return local(dt).strftime("%d/%m/%Y %H:%M") if dt else ""

    buf = io.StringIO()
    buf.write("﻿")
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Código", "Criado em", "Tipo", "Título", "Severidade", "Status", "Zona", "Setor", "Matrícula",
                "Recorrente", "Reincidências", "Responsável", "Assumido em", "Finalizado em", "Classificação",
                "Situação verificada", "Ação preventiva / comentário"])
    for a in alertas:
        # RN08: a exportação traz a matrícula, não o nome do operador.
        w.writerow([a.codigo, fmt(a.criado_em), TIPOS_ALERTA[a.tipo], a.titulo, SEVERIDADE_LABEL[a.severidade],
                    STATUS_ALERTA[a.status], a.zona.nome, a.zona.setor, a.operador.matricula if a.operador else "",
                    "Sim" if a.recorrente else "Não", a.reincidencias, a.responsavel.nome if a.responsavel else "",
                    fmt(a.assumido_em), fmt(a.finalizado_em), a.classificacao, a.situacao_verificada, a.comentario_final])
    nome = f"ocorrencias_metasafe_{datetime.now(TZ).strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="{nome}"'})


def _obter(db: Session, alerta_id: int) -> Alerta:
    a = db.get(Alerta, alerta_id)
    if not a:
        raise HTTPException(404, "Alerta não encontrado.")
    return a


def _salvar(db: Session, a: Alerta) -> dict:
    db.commit()
    db.refresh(a)
    hub.publicar({"tipo": "alerta_atualizado", "alerta": S.alerta_resumo(a), "notificar_supervisor": False})
    return S.alerta_detalhe(a)


def _exigir_pendente(a: Alerta) -> None:
    if a.status not in STATUS_PENDENTES:
        raise HTTPException(409, f"Esta ocorrência já foi finalizada ({STATUS_ALERTA[a.status].lower()}).")


@router.get("/{alerta_id}", dependencies=[Depends(EQUIPE_SEGURANCA)])
def detalhe(alerta_id: int, db: Session = Depends(get_db)):
    return S.alerta_detalhe(_obter(db, alerta_id))


@router.post("/{alerta_id}/assumir")
def assumir(alerta_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(TRATAMENTO)):
    a = _obter(db, alerta_id)
    if a.status != "ativo":
        raise HTTPException(409, "Só é possível assumir alertas ativos.")
    agora = utcnow()
    a.status, a.responsavel_id, a.assumido_em, a.atualizado_em = "em_tratamento", usuario.id, agora, agora
    registrar_historico(db, a, "assumido", f"{usuario.nome} iniciou a validação da situação.", usuario.id, agora)
    return _salvar(db, a)


@router.post("/{alerta_id}/comentarios")
def comentar(alerta_id: int, dados: ComentarioIn, db: Session = Depends(get_db), usuario: Usuario = Depends(TRATAMENTO)):
    a = _obter(db, alerta_id)
    a.atualizado_em = utcnow()
    registrar_historico(db, a, "comentario", dados.texto.strip(), usuario.id)
    return _salvar(db, a)


def _finalizar(db: Session, a: Alerta, usuario: Usuario, status: str, classificacao: str, comentario: str,
               situacao: str = "") -> None:
    agora = utcnow()
    if not a.assumido_em:
        a.assumido_em = agora
    a.responsavel_id = a.responsavel_id or usuario.id
    a.status, a.finalizado_em, a.atualizado_em = status, agora, agora
    a.classificacao, a.situacao_verificada, a.comentario_final = classificacao, situacao, comentario.strip()


@router.post("/{alerta_id}/encerrar")
def encerrar(alerta_id: int, dados: EncerrarIn, db: Session = Depends(get_db), usuario: Usuario = Depends(TRATAMENTO)):
    """Encerra com ação preventiva. Somente supervisor ou perfil superior (RN04)."""
    a = _obter(db, alerta_id)
    _exigir_pendente(a)
    if dados.situacao_verificada == "Risco ainda presente":
        raise HTTPException(422, "O risco ainda está presente: escale a ocorrência em vez de encerrá-la.")
    _finalizar(db, a, usuario, "encerrado", dados.classificacao, dados.comentario, dados.situacao_verificada)
    registrar_historico(db, a, "encerrado", f"Encerrada · {dados.classificacao} · {dados.situacao_verificada}. "
                                            f"{dados.comentario.strip()}", usuario.id)
    return _salvar(db, a)


@router.post("/{alerta_id}/escalar")
def escalar(alerta_id: int, dados: EscalarIn, db: Session = Depends(get_db), usuario: Usuario = Depends(TRATAMENTO)):
    """Escala a ocorrência para ação de segurança quando o risco não foi corrigido (RF11)."""
    a = _obter(db, alerta_id)
    _exigir_pendente(a)
    _finalizar(db, a, usuario, "escalado", dados.classificacao, dados.comentario, "Risco ainda presente")
    a.severidade = "critica"
    registrar_historico(db, a, "escalado", f"Escalada para a equipe de segurança · {dados.classificacao}. "
                                           f"{dados.comentario.strip()}", usuario.id)
    return _salvar(db, a)


@router.post("/{alerta_id}/confirmar-orientacao")
def confirmar_orientacao(alerta_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    """Operador confirma no terminal de campo que recebeu a orientação (UC06 · RF09)."""
    a = _obter(db, alerta_id)
    if a.categoria != "comportamental":
        raise HTTPException(422, "Alertas técnicos não têm orientação ao operador (RN07).")
    if a.orientacao_confirmada_em:
        return S.alerta_resumo(a)
    agora = utcnow()
    a.orientacao_confirmada_em, a.atualizado_em = agora, agora
    quem = a.operador.nome if a.operador else usuario.nome
    registrar_historico(db, a, "orientacao_confirmada",
                        f"{quem} confirmou a orientação no terminal local e informou a correção.", usuario.id, agora)
    db.commit()
    db.refresh(a)
    hub.publicar({"tipo": "alerta_atualizado", "alerta": S.alerta_resumo(a), "notificar_supervisor": False})
    return S.alerta_resumo(a)
