"""Visão geral, relatórios de conformidade e integração ERP/MES (UC09 · UC10 · UC12 · RF12 · RF13 · RF15 · RN08)."""
import csv
import io
from collections import Counter, defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import serializers as S
from ..database import get_db
from ..deps import EQUIPE_SEGURANCA
from ..models import SEVERIDADES, STATUS_PENDENTES, TURNOS, Alerta, Dispositivo, EventoMonitoramento, TipoEPI, ZonaOperacional, utcnow
from ..regras import TZ, hoje_local, local, turno_de

router = APIRouter(prefix="/api", tags=["Indicadores & relatórios"], dependencies=[Depends(EQUIPE_SEGURANCA)])

META_CONFORMIDADE = 95.0


def _taxa(eventos) -> float | None:
    avaliados = [e for e in eventos if e.status_conformidade != "inconclusivo"]
    if not avaliados:
        return None
    return round(sum(1 for e in avaliados if e.status_conformidade == "conforme") / len(avaliados) * 100, 1)


def _delta(atual, anterior):
    return round(atual - anterior, 1) if atual is not None and anterior is not None else None


@router.get("/dashboard")
def visao_geral(db: Session = Depends(get_db)):
    agora = utcnow()
    eventos = db.scalars(select(EventoMonitoramento).where(EventoMonitoramento.criado_em >= agora - timedelta(days=14))).all()
    ultimas_24h = [e for e in eventos if e.criado_em >= agora - timedelta(hours=24)]
    semana = [e for e in eventos if e.criado_em >= agora - timedelta(days=7)]
    semana_anterior = [e for e in eventos if e.criado_em < agora - timedelta(days=7)]
    pendentes = db.scalars(select(Alerta).where(Alerta.status.in_(STATUS_PENDENTES))).unique().all()
    zonas = db.scalars(select(ZonaOperacional).order_by(ZonaOperacional.setor)).all()
    dispositivos = db.scalars(select(Dispositivo)).all()

    ordem = {s: i for i, s in enumerate(reversed(SEVERIDADES))}
    prioritarios = sorted(pendentes, key=lambda a: (ordem[a.severidade], -a.criado_em.timestamp()))[:5]

    zona_setor = {z.id: z.setor for z in zonas}
    por_setor = defaultdict(list)
    for e in ultimas_24h:
        por_setor[zona_setor.get(e.zona_id, "?")].append(e)

    hoje = hoje_local(agora)
    dias = [hoje - timedelta(days=i) for i in range(13, -1, -1)]
    por_dia = defaultdict(list)
    for e in eventos:
        por_dia[local(e.criado_em).date()].append(e)
    alertas_14d = db.scalars(select(Alerta).where(Alerta.criado_em >= agora - timedelta(days=14))).unique().all()
    alertas_dia = Counter(local(a.criado_em).date() for a in alertas_14d if a.categoria == "comportamental")

    conf_semana = _taxa(semana)
    online = sum(1 for d in dispositivos if d.status == "online")
    return {
        "atualizado_em": S.iso(agora),
        "meta_conformidade": META_CONFORMIDADE,
        "kpis": {
            "conformidade_24h": _taxa(ultimas_24h),
            "conformidade_7d": conf_semana,
            "variacao_semana": _delta(conf_semana, _taxa(semana_anterior)),
            "alertas_pendentes": len(pendentes),
            "alertas_criticos": sum(1 for a in pendentes if a.severidade == "critica"),
            "zonas_ativas": sum(1 for z in zonas if z.ativa),
            "zonas_total": len(zonas),
            "dispositivos_online": online,
            "dispositivos_total": len(dispositivos),
            "dispositivos_com_falha": [d.identificador for d in dispositivos if d.status != "online"],
            "eventos_24h": len(ultimas_24h),
        },
        "atencao_imediata": [S.alerta_resumo(a) for a in prioritarios],
        "conformidade_por_setor": [{"setor": s, "conformidade": _taxa(ev), "eventos": len(ev)}
                                   for s, ev in sorted(por_setor.items())],
        "serie_14d": [{"dia": d.isoformat(), "conformidade": _taxa(por_dia[d]), "eventos": len(por_dia[d]),
                       "alertas": alertas_dia.get(d, 0)} for d in dias],
    }


def _dados_relatorio(db: Session, dias: int, setor: str | None, zona_id: int | None, turno: str | None):
    agora = utcnow()
    inicio = agora - timedelta(days=dias)
    inicio_anterior = inicio - timedelta(days=dias)
    zonas = {z.id: z for z in db.scalars(select(ZonaOperacional))}
    filtro_zonas = {zid for zid, z in zonas.items() if (not setor or z.setor == setor) and (not zona_id or zid == zona_id)}

    def ok(obj):
        return obj.zona_id in filtro_zonas and (not turno or turno_de(obj.criado_em) == turno)

    eventos_todos = [e for e in db.scalars(select(EventoMonitoramento).where(EventoMonitoramento.criado_em >= inicio_anterior)) if ok(e)]
    eventos = [e for e in eventos_todos if e.criado_em >= inicio]
    anteriores = [e for e in eventos_todos if e.criado_em < inicio]
    alertas_todos = [a for a in db.scalars(select(Alerta).where(Alerta.criado_em >= inicio_anterior)).unique() if ok(a)]
    alertas = [a for a in alertas_todos if a.criado_em >= inicio]
    alertas_ant = [a for a in alertas_todos if a.criado_em < inicio]
    comportamentais = [a for a in alertas if a.categoria == "comportamental"]
    finalizados = [a for a in alertas if a.status not in STATUS_PENDENTES]
    respostas = [(a.assumido_em - a.criado_em).total_seconds() / 60 for a in alertas if a.assumido_em]

    hoje = hoje_local(agora)
    dias_lista = [hoje - timedelta(days=i) for i in range(min(dias, 30) - 1, -1, -1)]
    por_dia = defaultdict(list)
    for e in eventos:
        por_dia[local(e.criado_em).date()].append(e)

    nomes_epi = {t.codigo_deteccao: t.nome for t in db.scalars(select(TipoEPI))}
    contagem_epi, contagem_epi_ant = Counter(), Counter()
    setor_epi = defaultdict(Counter)
    for a in comportamentais:
        for c in a.ausentes:
            contagem_epi[c] += 1
            setor_epi[c][zonas[a.zona_id].setor] += 1
    for a in alertas_ant:
        if a.categoria == "comportamental":
            for c in a.ausentes:
                contagem_epi_ant[c] += 1
    total_epi = sum(contagem_epi.values()) or 1

    # Só compara com o período anterior quando há histórico suficiente nele.
    tem_base = len(anteriores) >= 0.5 * len(eventos) > 0

    def tendencia(c):
        if not tem_base:
            return None
        atual, ant = contagem_epi[c], contagem_epi_ant.get(c, 0)
        if ant == 0:
            return "novo" if atual else "estavel"
        variacao = (atual - ant) / ant
        return "reducao" if variacao <= -0.15 else "aumento" if variacao >= 0.15 else "estavel"

    por_zona = defaultdict(list)
    por_turno = defaultdict(list)
    for e in eventos:
        por_zona[e.zona_id].append(e)
        por_turno[turno_de(e.criado_em)].append(e)
    alertas_zona = Counter(a.zona_id for a in comportamentais)
    conf = _taxa(eventos)
    return {
        "periodo": {"dias": dias, "inicio": S.iso(inicio), "fim": S.iso(agora), "setor": setor, "zona_id": zona_id,
                    "turno": turno},
        "meta_conformidade": META_CONFORMIDADE,
        "kpis": {
            "conformidade": conf,
            "variacao": _delta(conf, _taxa(anteriores)) if tem_base else None,
            "eventos_analisados": len(eventos),
            "eventos_inconclusivos": sum(1 for e in eventos if e.status_conformidade == "inconclusivo"),
            "alertas_preventivos": len(comportamentais),
            "alertas_tecnicos": len(alertas) - len(comportamentais),
            "alertas_recorrentes": sum(1 for a in comportamentais if a.recorrente),
            "ocorrencias_tratadas_pct": round(len(finalizados) / len(alertas) * 100, 1) if alertas else None,
            "tempo_medio_resposta_min": round(sum(respostas) / len(respostas), 1) if respostas else None,
        },
        "evolucao": [{"dia": d.isoformat(), "conformidade": _taxa(por_dia[d]), "eventos": len(por_dia[d])} for d in dias_lista],
        "por_severidade": [{"severidade": s, "total": sum(1 for a in alertas if a.severidade == s)} for s in SEVERIDADES],
        "epis_mais_alertas": [{"codigo": c, "nome": nomes_epi.get(c, c), "alertas": n,
                               "participacao": round(n / total_epi * 100, 1),
                               "principal_setor": setor_epi[c].most_common(1)[0][0], "tendencia": tendencia(c)}
                              for c, n in contagem_epi.most_common(8)],
        "por_zona": sorted([{"zona_id": zid, "zona": zonas[zid].nome, "setor": zonas[zid].setor,
                             "conformidade": _taxa(ev), "eventos": len(ev), "alertas": alertas_zona.get(zid, 0)}
                            for zid, ev in por_zona.items()], key=lambda x: (x["conformidade"] or 0)),
        "por_turno": [{"turno": t, "label": TURNOS[t], "conformidade": _taxa(por_turno[t]), "eventos": len(por_turno[t])}
                      for t in "ABC"],
    }


@router.get("/relatorios/conformidade")
def relatorio(dias: int = Query(default=30, ge=1, le=90), setor: str | None = None, zona_id: int | None = None,
              turno: str | None = Query(default=None, pattern="^[ABC]$"), db: Session = Depends(get_db)):
    """Indicadores consolidados por setor, zona, turno e período — sem dados pessoais (RN08)."""
    return _dados_relatorio(db, dias, setor, zona_id, turno)


@router.get("/relatorios/conformidade.csv")
def relatorio_csv(dias: int = Query(default=30, ge=1, le=90), setor: str | None = None, zona_id: int | None = None,
                  turno: str | None = Query(default=None, pattern="^[ABC]$"), db: Session = Depends(get_db)):
    r = _dados_relatorio(db, dias, setor, zona_id, turno)
    buf = io.StringIO()
    buf.write("﻿")
    w = csv.writer(buf, delimiter=";")
    k = r["kpis"]
    w.writerow(["Relatório de conformidade de EPI — MetaSafe EPI"])
    w.writerow(["Período", f"Últimos {dias} dias", "Setor", setor or "Todos", "Turno", turno or "Todos"])
    w.writerow([])
    w.writerow(["Conformidade (%)", "Eventos analisados", "Alertas preventivos", "Alertas técnicos",
                "Ocorrências tratadas (%)", "Tempo médio de resposta (min)"])
    w.writerow([k["conformidade"], k["eventos_analisados"], k["alertas_preventivos"], k["alertas_tecnicos"],
                k["ocorrencias_tratadas_pct"], k["tempo_medio_resposta_min"]])
    w.writerow([])
    w.writerow(["Zona", "Setor", "Conformidade (%)", "Eventos", "Alertas preventivos"])
    for z in r["por_zona"]:
        w.writerow([z["zona"], z["setor"], z["conformidade"], z["eventos"], z["alertas"]])
    w.writerow([])
    w.writerow(["Turno", "Conformidade (%)", "Eventos"])
    for t in r["por_turno"]:
        w.writerow([t["label"], t["conformidade"], t["eventos"]])
    w.writerow([])
    w.writerow(["EPI", "Alertas", "Participação (%)", "Principal setor", "Tendência"])
    for e in r["epis_mais_alertas"]:
        w.writerow([e["nome"], e["alertas"], e["participacao"], e["principal_setor"], e["tendencia"]])
    nome = f"relatorio_conformidade_{datetime.now(TZ).strftime('%Y%m%d')}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="{nome}"'})


@router.get("/integracao/eventos")
def exportar_eventos(desde: datetime | None = None, limite: int = Query(default=500, le=5000),
                     formato: str = Query(default="json", pattern="^(json|csv)$"), db: Session = Depends(get_db)):
    """Eventos consolidados para ERP/MES (RF15 · UC12). Sem nome de operador, apenas matrícula (RN08)."""
    desde = (desde.replace(tzinfo=None) if desde else utcnow() - timedelta(hours=24))
    eventos = db.scalars(select(EventoMonitoramento).where(EventoMonitoramento.criado_em >= desde)
                         .order_by(EventoMonitoramento.criado_em).limit(limite)).all()
    linhas = [{"evento": e.codigo, "timestamp_utc": S.iso(e.criado_em), "zona": e.zona.nome, "setor": e.zona.setor,
               "linha": e.zona.linha, "turno": turno_de(e.criado_em), "dispositivo": e.dispositivo.identificador if e.dispositivo else None,
               "matricula": e.operador.matricula if e.operador else None, "status": e.status_conformidade,
               "epis_ausentes": [d["epi"] for d in e.deteccoes if d.get("resultado") == "ausente"]} for e in eventos]
    if formato == "json":
        return {"desde": S.iso(desde), "total": len(linhas), "eventos": linhas}
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=list(linhas[0].keys()) if linhas else ["evento"], delimiter=";")
    w.writeheader()
    for l in linhas:
        w.writerow(l | {"epis_ausentes": ",".join(l["epis_ausentes"])})
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": 'attachment; filename="eventos_mes.csv"'})
