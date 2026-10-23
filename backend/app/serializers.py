"""Conversão dos modelos para JSON. Datas/horas saem em ISO-8601 UTC (sufixo Z)."""
from datetime import datetime

from .models import (
    NIVEIS_RISCO,
    PERFIS,
    SEVERIDADE_LABEL,
    STATUS_ALERTA,
    STATUS_DISPOSITIVO,
    STATUS_OPERADOR,
    TIPOS_ALERTA,
    Alerta,
    AlertaHistorico,
    Dispositivo,
    EventoMonitoramento,
    LogAuditoria,
    Operador,
    TipoEPI,
    Usuario,
    ZonaOperacional,
)


def iso(dt: datetime | None) -> str | None:
    return dt.replace(microsecond=0).isoformat() + "Z" if dt else None


def iniciais(nome: str) -> str:
    partes = nome.split()
    if not partes:
        return "?"
    return (partes[0][0] + (partes[-1][0] if len(partes) > 1 else "")).upper()


def usuario(u: Usuario | None) -> dict | None:
    if not u:
        return None
    return {"id": u.id, "nome": u.nome, "email": u.email, "perfil": u.perfil, "perfil_label": PERFIS.get(u.perfil, u.perfil),
            "iniciais": iniciais(u.nome), "operador_id": u.operador_id}


def tipo_epi(t: TipoEPI) -> dict:
    return {"id": t.id, "nome": t.nome, "descricao": t.descricao, "norma_referencia": t.norma_referencia,
            "codigo_deteccao": t.codigo_deteccao}


def dispositivo(d: Dispositivo) -> dict:
    return {"id": d.id, "identificador": d.identificador, "tipo": d.tipo, "descricao": d.descricao,
            "zona_id": d.zona_id, "zona": d.zona.nome, "status": d.status,
            "status_label": STATUS_DISPOSITIVO.get(d.status, d.status), "ultimo_sinal": iso(d.ultimo_sinal)}


def zona_resumo(z: ZonaOperacional) -> dict:
    obrig = z.requisitos_obrigatorios()
    return {
        "id": z.id, "nome": z.nome, "setor": z.setor, "linha": z.linha, "tipo_risco": z.tipo_risco,
        "nivel_risco": z.nivel_risco, "nivel_risco_label": NIVEIS_RISCO[z.nivel_risco], "ativa": z.ativa,
        "epis_obrigatorios": [r.tipo_epi.nome for r in obrig],
        "limiar_minimo": min((r.confianca_minima for r in obrig), default=None),
        "cameras": sum(1 for d in z.dispositivos if d.tipo == "camera"),
        "sensores": sum(1 for d in z.dispositivos if d.tipo == "sensor"),
        "dispositivos_com_falha": sum(1 for d in z.dispositivos if d.status != "online"),
    }


def zona_detalhe(z: ZonaOperacional) -> dict:
    return zona_resumo(z) | {
        "requisitos": [{"id": r.id, "tipo_epi_id": r.tipo_epi_id, "nome": r.tipo_epi.nome,
                        "norma_referencia": r.tipo_epi.norma_referencia, "codigo_deteccao": r.tipo_epi.codigo_deteccao,
                        "confianca_minima": r.confianca_minima, "obrigatorio": r.obrigatorio} for r in z.requisitos],
        "dispositivos": [dispositivo(d) for d in z.dispositivos],
    }


def operador(o: Operador | None) -> dict | None:
    if not o:
        return None
    return {"id": o.id, "matricula": o.matricula, "nome": o.nome, "iniciais": iniciais(o.nome), "setor": o.setor,
            "turno": o.turno, "status_operacional": o.status_operacional,
            "status_label": STATUS_OPERADOR.get(o.status_operacional, o.status_operacional)}


def evento(e: EventoMonitoramento) -> dict:
    return {"id": e.id, "codigo": e.codigo, "criado_em": iso(e.criado_em), "zona_id": e.zona_id, "zona": e.zona.nome,
            "dispositivo": e.dispositivo.identificador if e.dispositivo else None, "operador": operador(e.operador),
            "origem": e.origem, "status_conformidade": e.status_conformidade, "resumo": e.resumo,
            "deteccoes": e.deteccoes}


def alerta_resumo(a: Alerta) -> dict:
    return {
        "id": a.id, "codigo": a.codigo, "tipo": a.tipo, "tipo_label": TIPOS_ALERTA.get(a.tipo, a.tipo),
        "categoria": a.categoria, "severidade": a.severidade, "severidade_label": SEVERIDADE_LABEL[a.severidade],
        "status": a.status, "status_label": STATUS_ALERTA[a.status], "titulo": a.titulo, "mensagem": a.mensagem,
        "orientacao": a.orientacao, "zona_id": a.zona_id, "zona": a.zona.nome, "setor": a.zona.setor,
        "operador": operador(a.operador), "dispositivo": a.dispositivo.identificador if a.dispositivo else None,
        "evento": a.evento.codigo if a.evento else None, "epis_ausentes": a.ausentes, "confianca": a.confianca,
        "recorrente": a.recorrente, "reincidencias": a.reincidencias, "notificou_supervisor": a.notificou_supervisor,
        "responsavel": a.responsavel.nome if a.responsavel else None, "classificacao": a.classificacao,
        "criado_em": iso(a.criado_em), "atualizado_em": iso(a.atualizado_em), "assumido_em": iso(a.assumido_em),
        "finalizado_em": iso(a.finalizado_em), "orientacao_confirmada_em": iso(a.orientacao_confirmada_em),
    }


def historico(h: AlertaHistorico) -> dict:
    return {"id": h.id, "criado_em": iso(h.criado_em), "acao": h.acao, "descricao": h.descricao,
            "autor": h.autor.nome if h.autor else "Sistema"}


def alerta_detalhe(a: Alerta) -> dict:
    def minutos(fim):
        return round((fim - a.criado_em).total_seconds() / 60, 1) if fim else None

    return alerta_resumo(a) | {
        "situacao_verificada": a.situacao_verificada, "comentario_final": a.comentario_final,
        "deteccoes": a.evento.deteccoes if a.evento else [],
        "zona_nivel_risco": a.zona.nivel_risco, "zona_nivel_risco_label": NIVEIS_RISCO[a.zona.nivel_risco],
        "tempo_resposta_min": minutos(a.assumido_em), "tempo_total_min": minutos(a.finalizado_em),
        "historico": [historico(h) for h in a.historico],
    }


def auditoria(l: LogAuditoria) -> dict:
    return {"id": l.id, "criado_em": iso(l.criado_em), "usuario": l.usuario.nome if l.usuario else "Sistema",
            "entidade": l.entidade, "entidade_id": l.entidade_id, "acao": l.acao, "detalhes": l.detalhes}
