import sqlite3
from models import Libro, LibroCreate, LibroUpdate


class LibroManager:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def get_all(self) -> list[Libro]:
        filas = self.conn.execute("SELECT * FROM libros").fetchall()
        return [Libro(**dict(f)) for f in filas]

    def get_by_id(self, id: int) -> Libro | None:
        fila = self.conn.execute("SELECT * FROM libros WHERE id = ?", (id,)).fetchone()
        return Libro(**dict(fila)) if fila else None

    def create(self, data: LibroCreate) -> Libro:
        cur = self.conn.execute(
            "INSERT INTO libros (titulo, autor, año, precio, disponible) VALUES (?, ?, ?, ?, ?)",
            (data.titulo, data.autor, data.año, data.precio, data.disponible),
        )
        self.conn.commit()
        return self.get_by_id(cur.lastrowid)

    def update(self, id: int, data: LibroUpdate) -> Libro | None:
        actual = self.get_by_id(id)
        if actual is None:
            return None
        nuevo = actual.model_copy(update=data.model_dump(exclude_unset=True))
        self.conn.execute(
            "UPDATE libros SET titulo = ?, autor = ?, año = ?, precio = ?, disponible = ? WHERE id = ?",
            (nuevo.titulo, nuevo.autor, nuevo.año, nuevo.precio, nuevo.disponible, id),
        )
        self.conn.commit()
        return nuevo

    def delete(self, id: int) -> bool:
        cur = self.conn.execute("DELETE FROM libros WHERE id = ?", (id,))
        self.conn.commit()
        return cur.rowcount > 0
