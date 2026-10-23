from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import serializers as S
from ..database import get_db
from ..deps import usuario_atual
from ..models import Usuario
from ..schemas import LoginIn
from ..security import criar_token, verificar_senha

router = APIRouter(prefix="/api/auth", tags=["Autenticação (RF01)"])


@router.post("/login")
def login(dados: LoginIn, db: Session = Depends(get_db)):
    usuario = db.scalar(select(Usuario).where(Usuario.email == dados.email.lower()))
    if not usuario or not usuario.ativo or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos.")
    return {"access_token": criar_token(usuario.id, usuario.perfil), "token_type": "bearer", "usuario": S.usuario(usuario)}


@router.get("/me")
def me(usuario: Usuario = Depends(usuario_atual)):
    return S.usuario(usuario)
