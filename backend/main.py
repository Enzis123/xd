import sqlite3
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import get_db, init_db
from managers import LibroManager
from models import Libro, LibroCreate, LibroUpdate

init_db()
app = FastAPI(title="API Biblioteca")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_manager(db: sqlite3.Connection = Depends(get_db)):
    return LibroManager(db)


@app.get("/libros", response_model=list[Libro])
def listar(manager: LibroManager = Depends(get_manager)):
    return manager.get_all()


@app.get("/libros/{id}", response_model=Libro)
def obtener(id: int, manager: LibroManager = Depends(get_manager)):
    libro = manager.get_by_id(id)
    if libro is None:
        raise HTTPException(404, "Libro no encontrado")
    return libro


@app.post("/libros", response_model=Libro, status_code=201)
def crear(data: LibroCreate, manager: LibroManager = Depends(get_manager)):
    return manager.create(data)


@app.put("/libros/{id}", response_model=Libro)
def actualizar(id: int, data: LibroUpdate, manager: LibroManager = Depends(get_manager)):
    libro = manager.update(id, data)
    if libro is None:
        raise HTTPException(404, "Libro no encontrado")
    return libro


@app.delete("/libros/{id}")
def eliminar(id: int, manager: LibroManager = Depends(get_manager)):
    if not manager.delete(id):
        raise HTTPException(404, "Libro no encontrado")
    return {"mensaje": "Libro eliminado"}
