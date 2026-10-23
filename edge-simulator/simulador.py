"""Simulador do gateway Edge AI do MetaSafe EPI.

Representa o dispositivo de borda que, na planta, roda OpenCV + YOLO/ONNX sobre as câmeras e
envia à API apenas eventos estruturados (sem imagem). Usa só a biblioteca padrão do Python.

Uso:
    python simulador.py                      # API em http://localhost:8000, um evento a cada 4 s
    python simulador.py --api http://localhost:8080 --intervalo 2 --risco 0.3
    python simulador.py --uma-vez            # envia um único evento e encerra

Variáveis de ambiente equivalentes: METASAFE_API, EDGE_API_KEY.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request

# Mesma matriz de EPIs cadastrada pelo seed (câmeras CAM-<ZONA>-A/B).
CAMERAS = {
    "LM01": ["capacete", "oculos", "protetor_auricular", "calcado"],
    "LM02": ["capacete", "oculos", "protetor_auricular", "calcado"],
    "PNT": ["respirador", "oculos", "luvas", "calcado"],
    "ZT01": ["capacete", "oculos", "luvas_isolantes", "protetor_auricular", "calcado"],
    "DOCA": ["capacete", "colete", "calcado"],
    "ALM": ["colete", "calcado"],
    "OFC": ["oculos", "luvas", "calcado"],
    "SOLD": ["mascara_solda", "luvas", "respirador", "calcado"],
}
CRACHAS = ["OP-1842", "OP-1811", "OP-1764", "OP-1903", None, None]


def enviar(api: str, chave: str, caminho: str, corpo: dict) -> dict:
    req = urllib.request.Request(
        f"{api.rstrip('/')}{caminho}",
        data=json.dumps(corpo).encode(),
        headers={"Content-Type": "application/json", "X-Device-Key": chave},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def gerar_leitura(rng: random.Random, prob_risco: float) -> dict:
    zona = rng.choice(list(CAMERAS))
    itens = CAMERAS[zona]
    ausente = rng.choice(itens) if rng.random() < prob_risco else None
    deteccoes = []
    for item in itens:
        if item == ausente:
            deteccoes.append({"epi": item, "presente": False, "confianca": round(rng.uniform(0.9, 0.98), 2)})
        else:
            deteccoes.append({"epi": item, "presente": True, "confianca": round(rng.uniform(0.88, 0.99), 2)})
    return {"dispositivo": f"CAM-{zona}-{rng.choice('AB')}", "matricula": rng.choice(CRACHAS), "deteccoes": deteccoes}


def main() -> int:
    ap = argparse.ArgumentParser(description="Simulador do gateway Edge AI do MetaSafe EPI")
    ap.add_argument("--api", default=os.getenv("METASAFE_API", "http://localhost:8000"))
    ap.add_argument("--chave", default=os.getenv("EDGE_API_KEY", "edge-dev-key"))
    ap.add_argument("--intervalo", type=float, default=4.0, help="segundos entre leituras")
    ap.add_argument("--risco", type=float, default=0.15, help="probabilidade de faltar um EPI (0–1)")
    ap.add_argument("--uma-vez", action="store_true")
    args = ap.parse_args()
    rng = random.Random()
    print(f"Edge AI simulado → {args.api} (Ctrl+C para parar)")
    while True:
        leitura = gerar_leitura(rng, args.risco)
        try:
            r = enviar(args.api, args.chave, "/api/eventos", leitura)
            ev, alerta = r["evento"], r.get("alerta")
            linha = f"{ev['codigo']} {leitura['dispositivo']:<12} {ev['status_conformidade']:<13} {ev['resumo']}"
            if alerta:
                linha += f"  → {alerta['codigo']} ({alerta['severidade']})"
            print(linha, flush=True)
        except urllib.error.HTTPError as e:
            print(f"Erro HTTP {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
        except urllib.error.URLError as e:
            print(f"API indisponível ({e.reason}). Nova tentativa em {args.intervalo}s.", file=sys.stderr)
        if args.uma_vez:
            return 0
        time.sleep(args.intervalo)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nSimulador encerrado.")
