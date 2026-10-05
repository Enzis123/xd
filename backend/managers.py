"""Capa de acceso a datos: todo el SQL de la entidad Libro vive en este archivo."""

import sqlite3
from typing import Optional

from models import Libro, LibroCreate, LibroUpdate

COLUMNAS = "id, titulo, autor, genero, anio_publicacion, paginas, precio, disponible"


class LibroManager:
    """Maneja las operaciones CRUD de libros sobre una conexión SQLite."""

    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    @staticmethod
    def _fila_a_libro(fila: sqlite3.Row) -> Libro:
        """Convierte una fila de la base en un modelo Libro (disponible 0/1 -> bool)."""
        datos = dict(fila)
        datos["disponible"] = bool(datos["disponible"])
        return Libro(**datos)

    def get_all(self) -> list[Libro]:
        """Devuelve todos los libros ordenados por id."""
        filas = self._conn.execute(f"SELECT {COLUMNAS} FROM libros ORDER BY id").fetchall()
        return [self._fila_a_libro(fila) for fila in filas]

    def get_by_id(self, libro_id: int) -> Optional[Libro]:
        """Busca un libro por id. Devuelve None si no existe."""
        fila = self._conn.execute(
            f"SELECT {COLUMNAS} FROM libros WHERE id = ?", (libro_id,)
        ).fetchone()
        return self._fila_a_libro(fila) if fila else None

    def create(self, data: LibroCreate) -> Libro:
        """Inserta un libro nuevo y lo devuelve con su id."""
        cursor = self._conn.execute(
            """
            INSERT INTO libros (titulo, autor, genero, anio_publicacion, paginas, precio, disponible)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.titulo,
                data.autor,
                data.genero,
                data.anio_publicacion,
                data.paginas,
                data.precio,
                int(data.disponible),
            ),
        )
        self._conn.commit()
        return self.get_by_id(cursor.lastrowid)

    def update(self, libro_id: int, data: LibroUpdate) -> Optional[Libro]:
        """Actualiza solo los campos enviados. Devuelve None si el libro no existe."""
        if self.get_by_id(libro_id) is None:
            return None

        cambios = data.model_dump(exclude_unset=True)
        if cambios:
            if "disponible" in cambios:
                cambios["disponible"] = int(cambios["disponible"])
            # Los nombres de columna salen del modelo (no del usuario); los valores van con "?"
            asignaciones = ", ".join(f"{campo} = ?" for campo in cambios)
            self._conn.execute(
                f"UPDATE libros SET {asignaciones} WHERE id = ?",
                (*cambios.values(), libro_id),
            )
            self._conn.commit()

        return self.get_by_id(libro_id)

    def delete(self, libro_id: int) -> bool:
        """Elimina un libro. Devuelve True si se borró, False si no existía."""
        cursor = self._conn.execute("DELETE FROM libros WHERE id = ?", (libro_id,))
        self._conn.commit()
        return cursor.rowcount > 0
