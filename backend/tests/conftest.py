import os
import tempfile

import pytest

_tmp = tempfile.mkdtemp(prefix="metasafe-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SEED_ON_STARTUP"] = "true"
os.environ["EDGE_API_KEY"] = "chave-teste"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

SENHA = "metasafe123"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _token(client, email):
    r = client.post("/api/auth/login", json={"email": email, "senha": SENHA})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def supervisor(client):
    return _token(client, "camila@metaindustria.com.br")


@pytest.fixture(scope="session")
def gestor(client):
    return _token(client, "roberto@metaindustria.com.br")


@pytest.fixture(scope="session")
def operador(client):
    return _token(client, "joao@metaindustria.com.br")


@pytest.fixture(scope="session")
def zonas(client, supervisor):
    return {z["nome"]: z for z in client.get("/api/zonas", headers=supervisor).json()}
