"""Dados simulados da Metaindústria (Planta São Paulo).

Gera 21 dias de operação passando cada evento pelo MESMO motor de regras usado em produção
(regras.avaliar_evento), de modo que alertas, reincidências e recorrências do histórico são
consistentes com as regras da aplicação. Personas e zonas reaproveitam o protótipo da Sprint 2.

Execução manual: `python -m app.seed --reset` (apaga e recria o banco).
"""
from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    Alerta,
    Dispositivo,
    LogAuditoria,
    Operador,
    RequisitoEPI,
    TipoEPI,
    Usuario,
    ZonaOperacional,
    utcnow,
)
from .regras import TZ, atualizar_status_dispositivo, auditar, avaliar_evento, registrar_historico
from .security import hash_senha

SENHA_PADRAO = "metasafe123"
DIAS_HISTORICO = 40

TIPOS_EPI = [
    ("capacete", "Capacete de segurança", "ABNT NBR 8221", "Proteção contra impacto e queda de objetos."),
    ("oculos", "Óculos de proteção", "ANSI Z87.1", "Proteção ocular contra partículas e respingos."),
    ("protetor_auricular", "Protetor auricular", "NR-06", "Proteção auditiva tipo concha ou plugue."),
    ("calcado", "Calçado de segurança", "ISO 20345", "Biqueira e solado antiderrapante."),
    ("luvas", "Luvas de proteção mecânica", "EN 388", "Proteção contra cortes e abrasão."),
    ("luvas_isolantes", "Luvas isolantes de borracha", "ABNT NBR 16295", "Proteção contra choque elétrico."),
    ("colete", "Colete refletivo", "ABNT NBR 15292", "Alta visibilidade em áreas de movimentação de cargas."),
    ("mascara_solda", "Máscara de solda", "ANSI Z87.1", "Filtro de luz contra radiação do arco elétrico."),
    ("respirador", "Respirador semifacial PFF2", "ABNT NBR 13698", "Proteção respiratória contra fumos e vapores."),
]

# nome, setor, linha, tipo de risco, nível, código curto, matriz [(epi, limiar)], peso de não conformidade,
# pesos dos EPIs mais esquecidos
ZONAS = [
    ("Linha de Montagem 01", "Produção", "Linha 01", "Mecânico", "alto", "LM01",
     [("capacete", .85), ("oculos", .85), ("protetor_auricular", .82), ("calcado", .80)], 1.0,
     {"oculos": 5, "protetor_auricular": 4, "capacete": 2, "calcado": 1}),
    ("Linha de Montagem 02", "Produção", "Linha 02", "Mecânico", "alto", "LM02",
     [("capacete", .85), ("oculos", .85), ("protetor_auricular", .82), ("calcado", .80)], 1.2,
     {"oculos": 6, "protetor_auricular": 4, "capacete": 2, "calcado": 1}),
    ("Cabine de Pintura", "Produção", "Linha 02", "Químico", "alto", "PNT",
     [("respirador", .88), ("oculos", .85), ("luvas", .82), ("calcado", .80)], 1.1,
     {"respirador": 5, "luvas": 3, "oculos": 3, "calcado": 1}),
    ("Zona de Teste 01", "Qualidade", "Bancada de testes", "Elétrico", "critico", "ZT01",
     [("capacete", .90), ("oculos", .90), ("luvas_isolantes", .90), ("protetor_auricular", .90), ("calcado", .90)], 0.9,
     {"luvas_isolantes": 4, "oculos": 3, "capacete": 2, "protetor_auricular": 2, "calcado": 1}),
    ("Doca de Recebimento", "Logística", "Docas 1–4", "Movimentação de cargas", "medio", "DOCA",
     [("capacete", .82), ("colete", .82), ("calcado", .82)], 1.0,
     {"capacete": 5, "colete": 4, "calcado": 1}),
    ("Almoxarifado Central", "Logística", "Corredores A–F", "Movimentação de cargas", "medio", "ALM",
     [("colete", .80), ("calcado", .80)], 0.6,
     {"colete": 4, "calcado": 1}),
    ("Oficina Central", "Manutenção", "Oficina", "Mecânico", "alto", "OFC",
     [("oculos", .85), ("luvas", .82), ("calcado", .80)], 0.8,
     {"oculos": 4, "luvas": 4, "calcado": 1}),
    ("Box de Soldagem", "Manutenção", "Oficina", "Térmico", "critico", "SOLD",
     [("mascara_solda", .90), ("luvas", .85), ("respirador", .88), ("calcado", .80)], 0.7,
     {"respirador": 4, "luvas": 3, "mascara_solda": 2, "calcado": 1}),
]

# Personas do protótipo da Sprint 2
OPERADORES_FIXOS = [
    ("OP-1842", "João Santos", "Produção", "A"),
    ("OP-1764", "Marina Costa", "Logística", "A"),
    ("OP-1903", "Lucas Ferreira", "Manutenção", "B"),
    ("OP-1811", "Ana Lima", "Produção", "A"),
]
NOMES = ["Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "Jorge", "Larissa",
         "Mateus", "Natália", "Otávio", "Patrícia", "Rafael", "Sabrina", "Thiago", "Vanessa", "Wagner", "Yasmin",
         "André", "Beatriz", "Caio", "Daniela", "Emerson", "Fernanda", "Gustavo", "Heloísa", "Igor", "Juliana",
         "Leandro", "Mirela", "Nelson", "Priscila", "Renato", "Simone"]
SOBRENOMES = ["Oliveira", "Souza", "Pereira", "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Ribeiro", "Gomes",
              "Martins", "Araújo", "Barbosa", "Rocha", "Dias", "Teixeira", "Moreira", "Cardoso", "Mendes", "Freitas",
              "Batista", "Vieira", "Monteiro", "Correia", "Pinto"]
DISTRIBUICAO_SETORES = [("Produção", 14), ("Logística", 9), ("Manutenção", 7), ("Qualidade", 6)]

COMENTARIOS_ENCERRAMENTO = {
    "EPI corrigido pelo operador": [
        "Operador orientado no terminal local; EPI corrigido e nova validação automática conforme.",
        "Conversa rápida no posto. Operador colocou o EPI e retomou a atividade.",
        "Operador já havia corrigido ao chegar no local. Reforçada a orientação no DDS do turno.",
    ],
    "Operador saiu da área": [
        "Operador saiu da zona para buscar o EPI no armário e retornou equipado.",
        "Operador deixou a área até a reposição do EPI pelo almoxarifado.",
    ],
}


def _local_para_utc(dt_local: datetime) -> datetime:
    return dt_local.replace(tzinfo=TZ).astimezone(timezone.utc).replace(tzinfo=None)


def _turno(hora: int) -> str:
    return "A" if 6 <= hora < 14 else "B" if 14 <= hora < 22 else "C"


def popular_se_vazio(db: Session) -> bool:
    if db.scalar(select(Usuario.id).limit(1)):
        return False
    popular(db)
    return True


def popular(db: Session, semente: int = 2026) -> None:
    rng = random.Random(semente)
    agora = utcnow()
    agora_local = agora.replace(tzinfo=timezone.utc).astimezone(TZ).replace(tzinfo=None)

    # --- Tipos de EPI -----------------------------------------------------
    tipos = {}
    for codigo, nome, norma, desc in TIPOS_EPI:
        tipos[codigo] = TipoEPI(codigo_deteccao=codigo, nome=nome, norma_referencia=norma, descricao=desc)
        db.add(tipos[codigo])

    # --- Operadores -------------------------------------------------------
    operadores: list[Operador] = []
    for mat, nome, setor, turno in OPERADORES_FIXOS:
        operadores.append(Operador(matricula=mat, nome=nome, setor=setor, turno=turno,
                                   criado_em=agora - timedelta(days=60)))
    usados = {o.nome for o in operadores}
    mat = 1700
    for setor, qtd in DISTRIBUICAO_SETORES:
        for i in range(qtd):
            while True:
                nome = f"{rng.choice(NOMES)} {rng.choice(SOBRENOMES)}"
                if nome not in usados:
                    usados.add(nome)
                    break
            mat += rng.randint(3, 9)
            operadores.append(Operador(matricula=f"OP-{mat}", nome=nome, setor=setor, turno="ABC"[i % 3],
                                       criado_em=agora - timedelta(days=rng.randint(40, 400))))
    operadores[-1].status_operacional = "inativo"
    operadores[-5].status_operacional = "fora_de_area"
    operadores[2].status_operacional = "fora_de_area"  # Lucas Ferreira, como no protótipo
    db.add_all(operadores)

    # --- Usuários (personas) ---------------------------------------------
    camila = Usuario(nome="Camila Nogueira", email="camila@metaindustria.com.br", perfil="supervisor",
                     senha_hash=hash_senha(SENHA_PADRAO))
    diego = Usuario(nome="Diego Martins", email="diego@metaindustria.com.br", perfil="supervisor",
                    senha_hash=hash_senha(SENHA_PADRAO))
    roberto = Usuario(nome="Roberto Almeida", email="roberto@metaindustria.com.br", perfil="gestor",
                      senha_hash=hash_senha(SENHA_PADRAO))
    joao_user = Usuario(nome="João Santos", email="joao@metaindustria.com.br", perfil="operador",
                        senha_hash=hash_senha(SENHA_PADRAO), operador=operadores[0])
    db.add_all([camila, diego, roberto, joao_user])

    # --- Zonas, matriz de EPIs e dispositivos -----------------------------
    zonas: list[tuple[ZonaOperacional, float, dict]] = []
    for nome, setor, linha, risco, nivel, cod, matriz, peso, esquecidos in ZONAS:
        z = ZonaOperacional(nome=nome, setor=setor, linha=linha, tipo_risco=risco, nivel_risco=nivel)
        z.requisitos = [RequisitoEPI(tipo_epi=tipos[c], confianca_minima=lim) for c, lim in matriz]
        db.add(z)
        for sufixo in ("A", "B"):
            db.add(Dispositivo(identificador=f"CAM-{cod}-{sufixo}", tipo="camera", zona=z, ultimo_sinal=agora,
                               descricao=f"Câmera IP {sufixo} · {nome}"))
        db.add(Dispositivo(identificador=f"SNS-{cod}", tipo="sensor", zona=z, ultimo_sinal=agora,
                           descricao=f"Leitor de crachá e presença · {nome}"))
        zonas.append((z, peso, esquecidos))
    db.flush()

    for z, _, _ in zonas:
        auditar(db, camila.id, "zona", z.id, "criacao", f"Zona cadastrada com {len(z.requisitos)} EPIs obrigatórios "
                                                        "(matriz validada pela equipe de segurança).")
    db.flush()
    for log in db.scalars(select(LogAuditoria)):
        log.criado_em = agora - timedelta(days=DIAS_HISTORICO + 5)

    por_setor: dict[str, list[Operador]] = {}
    for o in operadores:
        if o.status_operacional != "inativo":
            por_setor.setdefault(o.setor, []).append(o)
    # Alguns operadores esquecem EPI com mais frequência (base para o indicador de recorrência - RN05)
    propensao = {o.id: (3.0 if rng.random() < 0.10 else 0.55) for o in operadores}
    joao = operadores[0]
    propensao[joao.id] = 1.0

    # --- Eventos históricos ------------------------------------------------
    eventos_planejados = []
    inicio = (agora_local - timedelta(days=DIAS_HISTORICO)).replace(hour=0, minute=0, second=0, microsecond=0)
    for dia in range(DIAS_HISTORICO + 1):
        base = inicio + timedelta(days=dia)
        progresso = dia / DIAS_HISTORICO  # implantação do MetaSafe: a conformidade melhora ao longo do período
        p_nao_conforme = 0.11 - 0.075 * progresso
        fim_semana = base.weekday() >= 5
        for z, peso, esquecidos in zonas:
            qtd = rng.randint(9, 14) if fim_semana else rng.randint(20, 28)
            for _ in range(qtd):
                r = rng.random()
                hora = rng.randint(6, 13) if r < 0.42 else rng.randint(14, 21) if r < 0.84 else rng.choice([22, 23, 0, 1, 2, 3, 4, 5])
                quando = base.replace(hour=hora, minute=rng.randint(0, 59), second=rng.randint(0, 59))
                if quando >= agora_local - timedelta(minutes=20):
                    continue
                eventos_planejados.append((quando, z, peso, esquecidos, p_nao_conforme))
    eventos_planejados.sort(key=lambda x: x[0])

    # Histórico do João (persona): dois esquecimentos de óculos antes do alerta crítico de hoje
    for dias_atras in (6, 2):
        quando = (agora_local - timedelta(days=dias_atras)).replace(hour=9, minute=37, second=12)
        eventos_planejados.append((quando, zonas[1][0], 0, {"oculos": 1}, "joao"))
    eventos_planejados.sort(key=lambda x: x[0])

    cameras = {z.id: [d for d in z.dispositivos if d.tipo == "camera"] for z, _, _ in zonas}
    for quando, z, peso, esquecidos, p in eventos_planejados:
        reqs = z.requisitos_obrigatorios()
        if p == "joao":
            operador, ausentes, baixa = joao, {"oculos"}, set()
        else:
            turno = _turno(quando.hour)
            candidatos = [o for o in por_setor.get(z.setor, []) if o.turno == turno] or por_setor.get(z.setor, [])
            operador = rng.choice(candidatos) if candidatos and rng.random() < 0.82 else None
            fator = propensao.get(operador.id, 1.0) if operador else 1.0
            ausentes, baixa = set(), set()
            sorteio = rng.random()
            if sorteio < p * peso * fator:
                codigos = [c for c, _ in esquecidos.items()]
                pesos = [w for _, w in esquecidos.items()]
                ausentes = {rng.choices(codigos, pesos)[0]}
                if rng.random() < 0.12:
                    ausentes.add(rng.choices(codigos, pesos)[0])
            elif sorteio > 0.975:
                baixa = {rng.choice([r.tipo_epi.codigo_deteccao for r in reqs])}
        deteccoes = []
        for req in reqs:
            c = req.tipo_epi.codigo_deteccao
            if c in ausentes:
                deteccoes.append({"epi": c, "presente": False, "confianca": round(rng.uniform(max(req.confianca_minima, .9), .98), 2)})
            elif c in baixa:
                deteccoes.append({"epi": c, "presente": False, "confianca": round(req.confianca_minima - rng.uniform(.05, .2), 2)})
            else:
                deteccoes.append({"epi": c, "presente": True, "confianca": round(rng.uniform(.88, .99), 2)})
        avaliar_evento(db, rng.choice(cameras[z.id]), deteccoes, operador.matricula if operador else None,
                       _local_para_utc(quando))

    # --- Tratamento do histórico pelos supervisores -------------------------
    alertas = db.scalars(select(Alerta).order_by(Alerta.criado_em)).unique().all()
    recentes = [a for a in alertas if a.criado_em >= agora - timedelta(hours=8)]
    deixar_ativos = {a.id for a in recentes[-2:]}
    deixar_em_tratamento = {a.id for a in recentes[-3:-2]}
    for a in alertas:
        if a.id in deixar_ativos:
            continue
        resp = camila if _turno(a.criado_em.replace(tzinfo=timezone.utc).astimezone(TZ).hour) == "A" else diego
        if rng.random() < 0.72:
            a.orientacao_confirmada_em = a.criado_em + timedelta(seconds=rng.randint(15, 90))
            registrar_historico(db, a, "orientacao_confirmada", "Operador confirmou a orientação no terminal local e "
                                                                "informou a correção.", None, a.orientacao_confirmada_em)
        a.assumido_em = a.criado_em + timedelta(minutes=rng.uniform(1.2, 9 if a.severidade == "critica" else 16))
        a.responsavel_id = resp.id
        a.status = "em_tratamento"
        registrar_historico(db, a, "assumido", f"{resp.nome} iniciou a validação da situação.", resp.id, a.assumido_em)
        if a.id in deixar_em_tratamento:
            a.atualizado_em = a.assumido_em
            continue
        a.finalizado_em = a.assumido_em + timedelta(minutes=rng.uniform(3, 45))
        a.atualizado_em = a.finalizado_em
        sorteio = rng.random()
        if a.recorrente and sorteio < 0.25:
            a.status, a.classificacao, a.situacao_verificada = "escalado", "Risco recorrente", "Risco ainda presente"
            a.comentario_final = "Reincidência no mesmo turno. Encaminhado ao SESMT para reforço de treinamento e revisão do posto."
            registrar_historico(db, a, "escalado", f"Escalada para a equipe de segurança · Risco recorrente. {a.comentario_final}",
                                resp.id, a.finalizado_em)
            continue
        if sorteio < 0.07:
            a.classificacao, a.situacao_verificada = "Falso positivo", "Não foi possível verificar"
            a.comentario_final = "Imagem com oclusão parcial (operador de costas). EPI estava em uso na verificação presencial."
        elif sorteio < 0.12:
            a.classificacao, a.situacao_verificada = "Condição de processo", "EPI corrigido pelo operador"
            a.comentario_final = "EPI retirado para ajuste de máquina. Solicitada revisão do procedimento com a engenharia."
        else:
            a.classificacao = "Risco recorrente" if a.recorrente else "Esquecimento pontual"
            a.situacao_verificada = rng.choices(list(COMENTARIOS_ENCERRAMENTO), [4, 1])[0]
            a.comentario_final = rng.choice(COMENTARIOS_ENCERRAMENTO[a.situacao_verificada])
        a.status = "encerrado"
        registrar_historico(db, a, "encerrado", f"Encerrada · {a.classificacao} · {a.situacao_verificada}. {a.comentario_final}",
                            resp.id, a.finalizado_em)

    # --- Situação atual (espelha o protótipo da Sprint 2) -------------------
    # Falha técnica antiga, já resolvida
    cam_pnt = next(d for d in cameras[zonas[2][0].id] if d.identificador.endswith("-B"))
    t0 = agora - timedelta(days=4, hours=3)
    falha, _ = atualizar_status_dispositivo(db, cam_pnt, "offline", "Sem sinal há mais de 60 segundos", t0)
    atualizar_status_dispositivo(db, cam_pnt, "online", "Sinal restabelecido", t0 + timedelta(minutes=38))
    falha.status, falha.assumido_em, falha.finalizado_em = "encerrado", t0 + timedelta(minutes=6), t0 + timedelta(minutes=41)
    falha.responsavel_id, falha.classificacao, falha.situacao_verificada = diego.id, "Falha técnica", "Dispositivo restabelecido"
    falha.comentario_final = "Cabo PoE substituído pela manutenção. Nenhum operador foi associado ao evento (RN07)."
    falha.atualizado_em = falha.finalizado_em
    registrar_historico(db, falha, "encerrado", f"Encerrada · Falha técnica. {falha.comentario_final}", diego.id, falha.finalizado_em)

    # Alerta crítico do João (risco recorrente) há 2 minutos
    req_lm02 = zonas[1][0].requisitos_obrigatorios()
    dets = [{"epi": r.tipo_epi.codigo_deteccao, "presente": r.tipo_epi.codigo_deteccao != "oculos",
             "confianca": 0.96 if r.tipo_epi.codigo_deteccao == "oculos" else round(rng.uniform(.9, .99), 2)} for r in req_lm02]
    avaliar_evento(db, cameras[zonas[1][0].id][0], dets, joao.matricula, agora - timedelta(minutes=2, seconds=14))

    # Outras situações em aberto: uma em tratamento e uma de severidade baixa (só orientação ao operador)
    def evento_agora(zona, ausente, operador, minutos):
        dets = [{"epi": r.tipo_epi.codigo_deteccao, "presente": r.tipo_epi.codigo_deteccao != ausente,
                 "confianca": 0.94 if r.tipo_epi.codigo_deteccao == ausente else round(rng.uniform(.9, .99), 2)}
                for r in zona.requisitos_obrigatorios()]
        return avaliar_evento(db, cameras[zona.id][0], dets, operador.matricula if operador else None,
                              agora - timedelta(minutes=minutos)).alerta

    ofc = zonas[6][0]
    em_trat = evento_agora(ofc, "luvas", next(o for o in por_setor["Manutenção"] if o.id != operadores[2].id), 9)
    em_trat.status, em_trat.responsavel_id, em_trat.assumido_em = "em_tratamento", camila.id, agora - timedelta(minutes=6)
    em_trat.atualizado_em = em_trat.assumido_em
    registrar_historico(db, em_trat, "assumido", "Camila Nogueira iniciou a validação da situação.", camila.id, em_trat.assumido_em)
    evento_agora(zonas[5][0], "colete", None, 31)

    # Câmera da doca em modo degradado há 14 minutos (alerta técnico aberto)
    cam_doca = next(d for d in cameras[zonas[4][0].id] if d.identificador.endswith("-B"))
    atualizar_status_dispositivo(db, cam_doca, "degradado", "Taxa de quadros abaixo do mínimo (4 fps)",
                                 agora - timedelta(minutes=14))

    # Ajuste de regra registrado em auditoria (RF14 · RNF07)
    zt = zonas[3][0]
    auditar(db, camila.id, "zona", zt.id, "alteracao_regra",
            "Limiar mínimo de confiança da Zona de Teste 01 elevado de 85% para 90% após análise de falsos positivos.")
    db.flush()
    ultimo = db.scalars(select(LogAuditoria).order_by(LogAuditoria.id.desc())).first()
    ultimo.criado_em = agora - timedelta(days=6, hours=2)

    db.commit()


def main() -> None:
    from .database import Base, SessionLocal, engine

    if "--reset" in sys.argv:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if popular_se_vazio(db):
            print("Banco populado com os dados simulados da Metaindústria.")
        else:
            print("O banco já possui dados. Use --reset para recriar.")


if __name__ == "__main__":
    main()
