"""Conexión a la base de datos SQLite y creación inicial de la tabla."""

import sqlite3
from pathlib import Path

# La ruta es relativa a este archivo, así funciona sin importar desde dónde se ejecute uvicorn
DB_PATH = Path(__file__).parent / "biblioteca.db"

# Libros de ejemplo que se cargan si la tabla está vacía
LIBROS_EJEMPLO = [
    ("Cien años de soledad", "Gabriel García Márquez", "Novela", 1967, 471, 15999.0, 1),
    ("Ficciones", "Jorge Luis Borges", "Cuento", 1944, 224, 12500.0, 1),
    ("Rayuela", "Julio Cortázar", "Novela", 1963, 736, 18900.0, 0),
    ("Fahrenheit 451", "Ray Bradbury", "Ciencia ficción", 1953, 256, 11000.0, 1),
    ("El señor de los anillos", "J. R. R. Tolkien", "Fantasía", 1954, 1216, 32000.0, 1),
    ("El principito", "Antoine de Saint-Exupéry", "Infantil", 1943, 96, 8500.0, 1),
]


def get_db():
    """Dependencia de FastAPI: abre una conexión por request y la cierra al terminar."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def crear_tabla(conn: sqlite3.Connection) -> None:
    """Crea la tabla libros si no existe."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS libros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            autor TEXT NOT NULL,
            genero TEXT NOT NULL,
            anio_publicacion INTEGER,
            paginas INTEGER NOT NULL,
            precio REAL NOT NULL,
            disponible INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    conn.commit()


def cargar_datos_ejemplo(conn: sqlite3.Connection) -> None:
    """Inserta los libros de ejemplo solo si la tabla está vacía."""
    cantidad = conn.execute("SELECT COUNT(*) FROM libros").fetchone()[0]
    if cantidad == 0:
        conn.executemany(
            """
            INSERT INTO libros (titulo, autor, genero, anio_publicacion, paginas, precio, disponible)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            LIBROS_EJEMPLO,
        )
        conn.commit()


def init_db(db_path: Path = DB_PATH) -> None:
    """Inicializa la base: crea la tabla y carga los datos de ejemplo."""
    conn = sqlite3.connect(db_path)
    try:
        crear_tabla(conn)
        cargar_datos_ejemplo(conn)
    finally:
        conn.close()
