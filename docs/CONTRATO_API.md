# Contrato de la API (fuente de verdad compartida)

Tema: **Biblioteca de libros**. Entidad: `Libro`. Tabla SQLite `libros`, archivo `backend/biblioteca.db`.

| Campo | Tipo | Reglas |
|---|---|---|
| id | int | autoincremental, solo en respuesta |
| titulo | str | obligatorio, 1–200 caracteres, se recortan espacios |
| autor | str | obligatorio, 1–120 caracteres |
| genero | str | obligatorio, uno de: Novela, Cuento, Poesía, Ensayo, Ciencia ficción, Fantasía, Historia, Biografía, Infantil, Otro |
| anio_publicacion | int \| null | opcional, 1000 ≤ x ≤ año actual |
| paginas | int | obligatorio, 1 ≤ x ≤ 10000 |
| precio | float | obligatorio, ≥ 0 |
| disponible | bool | opcional, default true |

Backend: http://localhost:8000 — Frontend: http://localhost:5500 (python -m http.server 5500 en /frontend).

| Método | Ruta | Éxito | Error |
|---|---|---|---|
| GET | /libros | 200 lista de Libro | — |
| GET | /libros/{id} | 200 Libro | 404 `{"detail": "Libro no encontrado"}` |
| POST | /libros | 201 Libro creado | 422 (validación Pydantic, formato estándar FastAPI: `{"detail":[{"loc":["body","titulo"],"msg":"...","type":"..."}]}`) |
| PUT | /libros/{id} | 200 Libro actualizado (actualización parcial: solo campos enviados, modelo LibroUpdate todo opcional) | 404, 422 |
| DELETE | /libros/{id} | 204 sin body | 404 |

Sin filtros por query string (fuera de alcance por decisión del usuario).
Al iniciar, si la tabla está vacía se insertan ~6 libros de ejemplo.
