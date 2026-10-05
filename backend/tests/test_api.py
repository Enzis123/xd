"""Tests de la API de libros usando una base de datos temporal."""

import sqlite3
from datetime import date

import pytest
from fastapi.testclient import TestClient

from database import get_db, init_db
from main import app

LIBRO_VALIDO = {
    "titulo": "El Aleph",
    "autor": "Jorge Luis Borges",
    "genero": "Cuento",
    "anio_publicacion": 1949,
    "paginas": 208,
    "precio": 13500.0,
    "disponible": True,
}


@pytest.fixture
def client(tmp_path):
    """Cliente de prueba que usa una DB temporal en lugar de biblioteca.db."""
    db_path = tmp_path / "test.db"
    init_db(db_path)

    def get_db_test():
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[get_db] = get_db_test
    # No se usa "with" para que no corra el lifespan (que inicializa la DB real)
    yield TestClient(app)
    app.dependency_overrides.clear()


# ---------- Lectura ----------

def test_listar_libros_trae_ejemplos(client):
    resp = client.get("/libros")
    assert resp.status_code == 200
    libros = resp.json()
    assert len(libros) == 6
    assert isinstance(libros[0]["disponible"], bool)


def test_obtener_libro_existente(client):
    resp = client.get("/libros/1")
    assert resp.status_code == 200
    assert resp.json()["id"] == 1


def test_obtener_libro_inexistente_404(client):
    resp = client.get("/libros/9999")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Libro no encontrado"}


# ---------- Creación ----------

def test_crear_libro(client):
    resp = client.post("/libros", json=LIBRO_VALIDO)
    assert resp.status_code == 201
    creado = resp.json()
    assert creado["id"] == 7
    assert creado["titulo"] == "El Aleph"
    # Se puede volver a leer
    assert client.get(f"/libros/{creado['id']}").json() == creado


def test_crear_libro_recorta_espacios_y_usa_defaults(client):
    datos = {"titulo": "  Poemas  ", "autor": " Alfonsina Storni ", "genero": "Poesía", "paginas": 100, "precio": 0}
    resp = client.post("/libros", json=datos)
    assert resp.status_code == 201
    libro = resp.json()
    assert libro["titulo"] == "Poemas"
    assert libro["autor"] == "Alfonsina Storni"
    assert libro["disponible"] is True
    assert libro["anio_publicacion"] is None


@pytest.mark.parametrize(
    "campo, valor",
    [
        ("titulo", ""),
        ("titulo", "   "),
        ("titulo", "x" * 201),
        ("autor", "a" * 121),
        ("genero", "Terror"),
        ("anio_publicacion", 999),
        ("anio_publicacion", date.today().year + 1),
        ("paginas", 0),
        ("paginas", 10001),
        ("precio", -1),
    ],
)
def test_crear_libro_invalido_422(client, campo, valor):
    datos = {**LIBRO_VALIDO, campo: valor}
    resp = client.post("/libros", json=datos)
    assert resp.status_code == 422
    assert resp.json()["detail"][0]["loc"] == ["body", campo]


def test_crear_libro_sin_campo_obligatorio_422(client):
    datos = {k: v for k, v in LIBRO_VALIDO.items() if k != "titulo"}
    resp = client.post("/libros", json=datos)
    assert resp.status_code == 422
    assert resp.json()["detail"][0]["loc"] == ["body", "titulo"]


# ---------- Actualización ----------

def test_actualizar_parcial(client):
    original = client.get("/libros/1").json()
    resp = client.put("/libros/1", json={"precio": 9999.0, "disponible": False})
    assert resp.status_code == 200
    actualizado = resp.json()
    assert actualizado["precio"] == 9999.0
    assert actualizado["disponible"] is False
    # El resto de los campos no cambia
    assert actualizado["titulo"] == original["titulo"]
    assert actualizado["paginas"] == original["paginas"]


def test_actualizar_body_vacio_no_cambia_nada(client):
    original = client.get("/libros/2").json()
    resp = client.put("/libros/2", json={})
    assert resp.status_code == 200
    assert resp.json() == original


def test_actualizar_inexistente_404(client):
    resp = client.put("/libros/9999", json={"precio": 10})
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Libro no encontrado"}


@pytest.mark.parametrize("datos", [{"paginas": 0}, {"genero": "Terror"}, {"titulo": None}, {"precio": -5}])
def test_actualizar_invalido_422(client, datos):
    resp = client.put("/libros/1", json=datos)
    assert resp.status_code == 422


# ---------- Borrado ----------

def test_eliminar_libro(client):
    resp = client.delete("/libros/1")
    assert resp.status_code == 204
    assert resp.content == b""
    assert client.get("/libros/1").status_code == 404


def test_eliminar_inexistente_404(client):
    resp = client.delete("/libros/9999")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Libro no encontrado"}
