"""Hash de senhas (PBKDF2-SHA256, biblioteca padrão) e tokens JWT."""
import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt

from .config import settings

_ITERACOES = 200_000


def hash_senha(senha: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", senha.encode(), salt, _ITERACOES)
    return f"pbkdf2_sha256${_ITERACOES}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verificar_senha(senha: str, senha_hash: str) -> bool:
    try:
        _algo, iteracoes, salt_b64, dk_b64 = senha_hash.split("$")
        novo = hashlib.pbkdf2_hmac("sha256", senha.encode(), base64.b64decode(salt_b64), int(iteracoes))
        return hmac.compare_digest(novo, base64.b64decode(dk_b64))
    except (ValueError, TypeError):
        return False


def criar_token(usuario_id: int, perfil: str) -> str:
    payload = {
        "sub": str(usuario_id),
        "perfil": perfil,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_exp_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decodificar_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
