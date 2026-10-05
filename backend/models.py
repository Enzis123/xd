"""Modelos Pydantic (schemas) de la entidad Libro."""

from datetime import date
from typing import Annotated, Literal, Optional

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator

# Géneros permitidos (deben coincidir con el contrato de la API)
Genero = Literal[
    "Novela",
    "Cuento",
    "Poesía",
    "Ensayo",
    "Ciencia ficción",
    "Fantasía",
    "Historia",
    "Biografía",
    "Infantil",
    "Otro",
]


def validar_anio(valor: Optional[int]) -> Optional[int]:
    """El año de publicación no puede ser posterior al año actual."""
    anio_actual = date.today().year
    if valor is not None and valor > anio_actual:
        raise ValueError(f"El año de publicación no puede ser mayor a {anio_actual}")
    return valor


# Tipos reutilizables, así LibroBase y LibroUpdate comparten las mismas reglas
Titulo = Annotated[str, Field(min_length=1, max_length=200, description="Título del libro")]
Autor = Annotated[str, Field(min_length=1, max_length=120, description="Autor del libro")]
AnioPublicacion = Annotated[
    Optional[int],
    Field(ge=1000, description="Año de publicación (1000 a año actual)"),
    AfterValidator(validar_anio),
]
Paginas = Annotated[int, Field(ge=1, le=10000, description="Cantidad de páginas")]
Precio = Annotated[float, Field(ge=0, description="Precio del libro")]


class LibroBase(BaseModel):
    """Campos comunes de un libro."""

    # str_strip_whitespace recorta los espacios antes de validar el largo
    model_config = ConfigDict(str_strip_whitespace=True)

    titulo: Titulo
    autor: Autor
    genero: Genero
    anio_publicacion: AnioPublicacion = None
    paginas: Paginas
    precio: Precio
    disponible: bool = True


class LibroCreate(LibroBase):
    """Datos necesarios para crear un libro (sin id)."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "titulo": "El Aleph",
                "autor": "Jorge Luis Borges",
                "genero": "Cuento",
                "anio_publicacion": 1949,
                "paginas": 208,
                "precio": 13500.0,
                "disponible": True,
            }
        }
    )


class LibroUpdate(BaseModel):
    """Datos para actualizar un libro. Todos los campos son opcionales (actualización parcial)."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={"example": {"precio": 9999.0, "disponible": False}},
    )

    titulo: Optional[Titulo] = None
    autor: Optional[Autor] = None
    genero: Optional[Genero] = None
    anio_publicacion: AnioPublicacion = None
    paginas: Optional[Paginas] = None
    precio: Optional[Precio] = None
    disponible: Optional[bool] = None

    @field_validator("titulo", "autor", "genero", "paginas", "precio", "disponible")
    @classmethod
    def no_permitir_null(cls, valor):
        """Los campos obligatorios se pueden omitir, pero no mandar como null."""
        if valor is None:
            raise ValueError("Este campo no puede ser null")
        return valor


class Libro(LibroBase):
    """Libro tal como se devuelve en las respuestas (incluye id)."""

    id: int
