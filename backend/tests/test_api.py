"""Testes dos fluxos principais, organizados pelos requisitos da Sprint 1."""
import uuid
from datetime import datetime, timedelta, timezone

DEVICE = {"X-Device-Key": "chave-teste"}
LM02 = ["capacete", "oculos", "protetor_auricular", "calcado"]


def evento(dispositivo="CAM-LM02-A", ausentes=(), baixa=(), matricula=None, momento=None):
    dets = []
    for c in LM02:
        if c in ausentes:
            dets.append({"epi": c, "presente": False, "confianca": 0.95})
        elif c in baixa:
            dets.append({"epi": c, "presente": False, "confianca": 0.60})
        else:
            dets.append({"epi": c, "presente": True, "confianca": 0.97})
    corpo = {"dispositivo": dispositivo, "deteccoes": dets, "matricula": matricula}
    if momento:
        corpo["momento"] = momento.isoformat()
    return corpo


def novo_operador(client, supervisor, setor="Produção"):
    mat = f"T-{uuid.uuid4().hex[:6].upper()}"
    r = client.post("/api/operadores", headers=supervisor,
                    json={"matricula": mat, "nome": "Operador de Teste", "setor": setor, "turno": "A"})
    assert r.status_code == 201, r.text
    return r.json()


# --- RF01: autenticação e perfis ------------------------------------------
def test_login_invalido(client):
    r = client.post("/api/auth/login", json={"email": "camila@metaindustria.com.br", "senha": "errada"})
    assert r.status_code == 401


def test_rotas_exigem_token(client):
    assert client.get("/api/dashboard").status_code == 401


def test_perfis(client, supervisor, gestor, operador, zonas):
    assert client.get("/api/dashboard", headers=operador).status_code == 403
    assert client.get(f"/api/terminal/{zonas['Linha de Montagem 02']['id']}", headers=operador).status_code == 200
    assert client.get("/api/relatorios/conformidade", headers=gestor).status_code == 200
    z = client.get(f"/api/zonas/{zonas['Almoxarifado Central']['id']}", headers=gestor).json()
    corpo = {k: z[k] for k in ("nome", "setor", "linha", "tipo_risco", "nivel_risco", "ativa")}
    corpo["requisitos"] = [{"tipo_epi_id": r["tipo_epi_id"], "confianca_minima": r["confianca_minima"]} for r in z["requisitos"]]
    assert client.put(f"/api/zonas/{z['id']}", headers=gestor, json=corpo).status_code == 403


# --- RF04: ingestão do Edge AI --------------------------------------------
def test_chave_de_dispositivo(client, operador):
    assert client.post("/api/eventos", headers={"X-Device-Key": "x"}, json=evento()).status_code == 401
    assert client.post("/api/eventos", headers=operador, json=evento()).status_code == 403
    assert client.post("/api/eventos", headers=DEVICE, json=evento("CAM-NAO-EXISTE")).status_code == 404


# --- RF05/RF06/RF07: motor de regras --------------------------------------
def test_evento_conforme_nao_gera_alerta(client):
    r = client.post("/api/eventos", headers=DEVICE, json=evento()).json()
    assert r["evento"]["status_conformidade"] == "conforme"
    assert r["alerta"] is None


def test_ausencia_gera_alerta_com_severidade_da_zona(client, supervisor):
    op = novo_operador(client, supervisor)
    r = client.post("/api/eventos", headers=DEVICE, json=evento(ausentes=["oculos"], matricula=op["matricula"])).json()
    assert r["evento"]["status_conformidade"] == "nao_conforme"
    assert r["alerta_novo"] is True
    a = r["alerta"]
    assert a["severidade"] == "media"  # zona de risco alto + EPI não crítico
    assert a["notificou_supervisor"] is True  # RF08
    assert a["operador"]["matricula"] == op["matricula"]
    assert "óculos de proteção" in a["orientacao"]  # RF09

    op2 = novo_operador(client, supervisor)
    r = client.post("/api/eventos", headers=DEVICE, json=evento("CAM-LM02-B", ausentes=["capacete"], matricula=op2["matricula"])).json()
    assert r["alerta"]["severidade"] == "critica"  # capacete é EPI crítico


def test_severidade_baixa_so_orienta_operador(client):
    dets = [{"epi": "colete", "presente": False, "confianca": 0.95}, {"epi": "calcado", "presente": True, "confianca": 0.95}]
    r = client.post("/api/eventos", headers=DEVICE, json={"dispositivo": "CAM-ALM-B", "deteccoes": dets}).json()
    assert r["alerta"]["severidade"] == "baixa"
    assert r["alerta"]["notificou_supervisor"] is False


def test_abaixo_do_limiar_nao_gera_alerta(client, supervisor):
    op = novo_operador(client, supervisor)
    r = client.post("/api/eventos", headers=DEVICE, json=evento(baixa=["capacete"], matricula=op["matricula"])).json()
    assert r["evento"]["status_conformidade"] == "inconclusivo"  # RN02
    assert r["alerta"] is None


def test_reincidencia_reforca_o_mesmo_alerta(client, supervisor):
    op = novo_operador(client, supervisor)
    r1 = client.post("/api/eventos", headers=DEVICE, json=evento(ausentes=["oculos"], matricula=op["matricula"])).json()
    r2 = client.post("/api/eventos", headers=DEVICE, json=evento(ausentes=["oculos"], matricula=op["matricula"])).json()
    assert r2["alerta_novo"] is False
    assert r2["alerta"]["id"] == r1["alerta"]["id"]
    assert r2["alerta"]["reincidencias"] == 1


def test_recorrencia_rn05(client, supervisor):
    op = novo_operador(client, supervisor)
    base = datetime.now(timezone.utc) - timedelta(hours=3)
    ids = []
    for i in range(3):
        r = client.post("/api/eventos", headers=DEVICE,
                        json=evento(ausentes=["oculos"], matricula=op["matricula"], momento=base + timedelta(minutes=40 * i))).json()
        assert r["alerta_novo"] is True
        ids.append(r["alerta"])
    assert ids[0]["recorrente"] is False and ids[1]["recorrente"] is False
    assert ids[2]["recorrente"] is True
    assert ids[2]["severidade"] == "critica"  # média escalada por recorrência


# --- RF10/RF11/RN04: tratamento da ocorrência -----------------------------
def _criar_alerta(client, supervisor):
    op = novo_operador(client, supervisor)
    return client.post("/api/eventos", headers=DEVICE, json=evento(ausentes=["protetor_auricular"], matricula=op["matricula"])).json()["alerta"]


def test_fluxo_de_tratamento(client, supervisor, operador):
    a = _criar_alerta(client, supervisor)
    url = f"/api/alertas/{a['id']}"
    encerrar = {"classificacao": "Esquecimento pontual", "situacao_verificada": "EPI corrigido pelo operador",
                "comentario": "Operador orientado e EPI corrigido."}
    assert client.post(f"{url}/encerrar", headers=operador, json=encerrar).status_code == 403  # RN04

    r = client.post(f"{url}/assumir", headers=supervisor).json()
    assert r["status"] == "em_tratamento" and r["responsavel"] == "Camila Nogueira"
    assert client.post(f"{url}/comentarios", headers=supervisor, json={"texto": "Indo ao posto."}).status_code == 200

    risco = encerrar | {"situacao_verificada": "Risco ainda presente"}
    assert client.post(f"{url}/encerrar", headers=supervisor, json=risco).status_code == 422

    r = client.post(f"{url}/encerrar", headers=supervisor, json=encerrar).json()
    assert r["status"] == "encerrado"
    assert r["classificacao"] == "Esquecimento pontual"
    assert r["tempo_total_min"] is not None
    acoes = [h["acao"] for h in r["historico"]]
    assert acoes[:3] == ["evento", "emitido", "notificacao"]
    assert {"assumido", "comentario", "encerrado"} <= set(acoes)
    assert client.post(f"{url}/encerrar", headers=supervisor, json=encerrar).status_code == 409


def test_escalar(client, supervisor, gestor):
    a = _criar_alerta(client, supervisor)
    r = client.post(f"/api/alertas/{a['id']}/escalar", headers=gestor,
                    json={"classificacao": "Risco recorrente", "comentario": "Risco persiste, acionar SESMT."}).json()
    assert r["status"] == "escalado"
    assert r["severidade"] == "critica"


def test_operador_confirma_orientacao(client, supervisor, operador):
    a = _criar_alerta(client, supervisor)
    r = client.post(f"/api/alertas/{a['id']}/confirmar-orientacao", headers=operador).json()
    assert r["orientacao_confirmada_em"] is not None


# --- RF16/RN07: falha de dispositivo --------------------------------------
def test_falha_de_dispositivo_gera_alerta_tecnico(client, supervisor):
    r = client.post("/api/dispositivos/CAM-OFC-B/status", headers=DEVICE, json={"status": "offline", "detalhe": "sem sinal"}).json()
    a = r["alerta"]
    assert a["categoria"] == "tecnico" and a["tipo"] == "FALHA_DISPOSITIVO"
    assert a["operador"] is None
    assert a["codigo"].startswith("TEC-")
    r2 = client.post("/api/dispositivos/CAM-OFC-B/status", headers=DEVICE, json={"status": "offline"}).json()
    assert r2["alerta"]["id"] == a["id"]  # não duplica
    assert client.post(f"/api/alertas/{a['id']}/confirmar-orientacao", headers=supervisor).status_code == 422
    client.post("/api/dispositivos/CAM-OFC-B/status", headers=DEVICE, json={"status": "online"})


# --- RF02/RF03/RF14/RNF07: cadastros e auditoria --------------------------
def test_matricula_unica(client, supervisor):
    op = novo_operador(client, supervisor)
    r = client.post("/api/operadores", headers=supervisor,
                    json={"matricula": op["matricula"], "nome": "Outro", "setor": "Produção", "turno": "B"})
    assert r.status_code == 409


def test_alteracao_de_regra_gera_auditoria(client, supervisor, zonas):
    zid = zonas["Oficina Central"]["id"]
    z = client.get(f"/api/zonas/{zid}", headers=supervisor).json()
    corpo = {k: z[k] for k in ("nome", "setor", "linha", "tipo_risco", "nivel_risco", "ativa")}
    reqs = [{"tipo_epi_id": r["tipo_epi_id"], "confianca_minima": r["confianca_minima"], "obrigatorio": True}
            for r in z["requisitos"]]
    reqs[0]["confianca_minima"] = 0.91
    r = client.put(f"/api/zonas/{zid}", headers=supervisor, json=corpo | {"requisitos": reqs})
    assert r.status_code == 200
    detalhe = client.get(f"/api/zonas/{zid}", headers=supervisor).json()
    assert detalhe["requisitos"][0]["confianca_minima"] == 0.91
    assert detalhe["auditoria"][0]["acao"] == "alteracao_regra"
    assert "91%" in detalhe["auditoria"][0]["detalhes"]

    sem_obrigatorio = [r | {"obrigatorio": False} for r in reqs]
    assert client.put(f"/api/zonas/{zid}", headers=supervisor, json=corpo | {"requisitos": sem_obrigatorio}).status_code == 422


# --- RF12/RF13/RF15/RN08: indicadores e exportações -----------------------
def test_dashboard_e_relatorio(client, gestor):
    d = client.get("/api/dashboard", headers=gestor).json()
    assert d["kpis"]["zonas_total"] == 8
    assert 0 < d["kpis"]["conformidade_7d"] <= 100
    r = client.get("/api/relatorios/conformidade?dias=7&turno=A&setor=Produção", headers=gestor).json()
    assert r["kpis"]["eventos_analisados"] > 0
    assert all(z["setor"] == "Produção" for z in r["por_zona"])


def test_exportacoes_sem_nomes(client, gestor):
    csv = client.get("/api/alertas/exportar.csv", headers=gestor).text
    assert csv.lstrip("﻿").startswith("Código;")
    assert "João Santos" not in csv and "OP-1842" in csv
    eventos = client.get("/api/integracao/eventos?limite=50", headers=gestor).json()
    assert eventos["total"] > 0 and "matricula" in eventos["eventos"][0]
    assert "nome" not in eventos["eventos"][0]


# --- RNF01: alerta em tempo real ------------------------------------------
def test_websocket_recebe_alerta(client, supervisor, zonas):
    token = supervisor["Authorization"].split()[1]
    with client.websocket_connect(f"/ws/alertas?token={token}") as ws:
        assert ws.receive_json()["tipo"] == "conectado"
        r = client.post("/api/simulador/evento", headers=supervisor,
                        json={"zona_id": zonas["Zona de Teste 01"]["id"], "cenario": "sem_capacete"})
        assert r.status_code == 200
        recebidos = [ws.receive_json() for _ in range(2)]
        tipos = {m["tipo"] for m in recebidos}
        assert "evento" in tipos and ({"alerta_novo", "alerta_atualizado"} & tipos)


def test_websocket_rejeita_token_invalido(client):
    import pytest
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/alertas?token=invalido") as ws:
            ws.receive_json()
