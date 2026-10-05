// =====================================================================
// api.js — ÚNICA capa que habla con el backend (único lugar con fetch).
// =====================================================================

const API_URL = "http://localhost:8000";

/**
 * Error de la API. `status` es el código HTTP (0 si no hubo respuesta, p. ej.
 * error de red) y `detail` es el contenido de `detail` que devuelve FastAPI:
 *  - string en 404 ("Libro no encontrado")
 *  - lista de {loc, msg, type} en 422 (errores de validación)
 */
export class ApiError extends Error {
  constructor(message, status, detail = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  /** true si es un error de validación con detalle por campo. */
  get esValidacion() {
    return this.status === 422 && Array.isArray(this.detail);
  }

  /** true si no se pudo contactar al servidor. */
  get esDeRed() {
    return this.status === 0;
  }
}

/**
 * Envoltorio de fetch: arma la request, maneja errores de red, respuestas
 * sin body (204) y convierte los códigos de error en ApiError.
 */
async function request(ruta, { method = "GET", body } = {}) {
  const opciones = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(body);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones);
  } catch (err) {
    // fetch solo rechaza ante fallas de red / CORS / servidor caído (TypeError).
    throw new ApiError(
      "No se pudo conectar con la API. Verificá que el backend esté corriendo en " + API_URL + ".",
      0,
      String(err && err.message ? err.message : err)
    );
  }

  // 204 No Content (DELETE): no hay body que parsear.
  if (respuesta.status === 204) return null;

  // Intentamos parsear JSON; si el body está vacío o no es JSON, queda null.
  const texto = await respuesta.text();
  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = texto;
    }
  }

  if (!respuesta.ok) {
    const detail = datos && typeof datos === "object" && "detail" in datos ? datos.detail : datos;
    throw new ApiError(mensajeDeError(respuesta.status, detail), respuesta.status, detail);
  }

  return datos;
}

/** Arma un mensaje legible a partir del status y el detail de FastAPI. */
function mensajeDeError(status, detail) {
  if (status === 422 && Array.isArray(detail)) {
    return "Hay errores de validación. Revisá los campos marcados.";
  }
  if (typeof detail === "string" && detail) return detail;
  if (status === 404) return "Recurso no encontrado.";
  if (status >= 500) return `Error interno del servidor (${status}).`;
  return `Error inesperado (${status}).`;
}

// --------------------------- Endpoints -------------------------------

export function listarLibros() {
  return request("/libros");
}

export function obtenerLibro(id) {
  return request(`/libros/${encodeURIComponent(id)}`);
}

export function crearLibro(data) {
  return request("/libros", { method: "POST", body: data });
}

export function actualizarLibro(id, data) {
  return request(`/libros/${encodeURIComponent(id)}`, { method: "PUT", body: data });
}

export function eliminarLibro(id) {
  return request(`/libros/${encodeURIComponent(id)}`, { method: "DELETE" });
}
