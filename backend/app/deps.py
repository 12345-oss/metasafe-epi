from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Usuario
from .security import decodificar_token

_bearer = HTTPBearer(auto_error=False)


def usuario_por_token(token: str, db: Session) -> Usuario | None:
    try:
        payload = decodificar_token(token)
    except jwt.PyJWTError:
        return None
    usuario = db.get(Usuario, int(payload.get("sub", 0)))
    if not usuario or not usuario.ativo:
        return None
    return usuario


def usuario_atual(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    usuario = usuario_por_token(cred.credentials, db) if cred else None
    if not usuario:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida ou expirada. Faça login novamente.")
    return usuario


def exigir_perfil(*perfis: str):
    def _dep(usuario: Usuario = Depends(usuario_atual)) -> Usuario:
        if usuario.perfil not in perfis:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Seu perfil não tem permissão para esta ação.")
        return usuario

    return _dep


# Cadastros e regras: supervisor de segurança (UC11, RF02, RF03).
SUPERVISOR = exigir_perfil("supervisor")
# Telas de gestão (painel, alertas, relatórios): supervisor e gestor. O operador usa o terminal de campo.
EQUIPE_SEGURANCA = exigir_perfil("supervisor", "gestor")
# Encerrar/escalar ocorrência: supervisor ou perfil superior (RN04).
TRATAMENTO = exigir_perfil("supervisor", "gestor")


def dispositivo_ou_usuario(
    x_device_key: str | None = Header(default=None),
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario | None:
    """Aceita a chave do dispositivo Edge AI (X-Device-Key) ou um usuário autenticado."""
    if x_device_key is not None:
        if x_device_key != settings.edge_api_key:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Chave de dispositivo inválida.")
        return None
    usuario = usuario_atual(cred, db)
    if usuario.perfil != "supervisor":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas dispositivos ou o supervisor podem enviar eventos.")
    return usuario
