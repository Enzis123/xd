"""API REST de la Biblioteca de libros (FastAPI + SQLite)."""

import sqlite3
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from database import get_db, init_db
from managers import LibroManager
from models import Libro, LibroCreate, LibroUpdate


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Al arrancar: crear la tabla y cargar libros de ejemplo si hace falta
    init_db()
    yield


app = FastAPI(
    title="API Biblioteca",
    description="API REST para administrar los libros de una biblioteca (CRUD con SQLite).",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS abierto para que el frontend (http://localhost:5500) pueda consumir la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_manager(db: sqlite3.Connection = Depends(get_db)) -> LibroManager:
    """Dependencia que entrega un LibroManager con la conexión del request."""
    return LibroManager(db)


@app.get("/", tags=["Salud"], summary="Estado de la API")
def raiz():
    return {"mensaje": "API Biblioteca funcionando", "docs": "/docs"}


@app.get("/libros", response_model=list[Libro], tags=["Libros"], summary="Listar todos los libros")
def listar_libros(manager: LibroManager = Depends(get_manager)):
    return manager.get_all()


@app.get("/libros/{libro_id}", response_model=Libro, tags=["Libros"], summary="Obtener un libro por id")
def obtener_libro(libro_id: int, manager: LibroManager = Depends(get_manager)):
    libro = manager.get_by_id(libro_id)
    if libro is None:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return libro


@app.post(
    "/libros",
    response_model=Libro,
    status_code=status.HTTP_201_CREATED,
    tags=["Libros"],
    summary="Crear un libro",
)
def crear_libro(datos: LibroCreate, manager: LibroManager = Depends(get_manager)):
    return manager.create(datos)


@app.put(
    "/libros/{libro_id}",
    response_model=Libro,
    tags=["Libros"],
    summary="Actualizar un libro (parcial)",
)
def actualizar_libro(libro_id: int, datos: LibroUpdate, manager: LibroManager = Depends(get_manager)):
    libro = manager.update(libro_id, datos)
    if libro is None:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return libro


@app.delete(
    "/libros/{libro_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Libros"],
    summary="Eliminar un libro",
)
def eliminar_libro(libro_id: int, manager: LibroManager = Depends(get_manager)):
    if not manager.delete(libro_id):
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
