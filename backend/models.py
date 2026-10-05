from pydantic import BaseModel, Field


class LibroBase(BaseModel):
    titulo: str = Field(min_length=1)
    autor: str = Field(min_length=1)
    año: int | None = Field(default=None, ge=1000, le=2100)
    precio: float = Field(ge=0)
    disponible: bool = True


class LibroCreate(LibroBase):
    pass


class LibroUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1)
    autor: str | None = Field(default=None, min_length=1)
    año: int | None = Field(default=None, ge=1000, le=2100)
    precio: float | None = Field(default=None, ge=0)
    disponible: bool | None = None


class Libro(LibroBase):
    id: int
