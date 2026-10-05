// Capa de comunicación con la API: el único archivo que usa fetch.
const API_URL = "http://localhost:8000/libros";

async function pedir(url, metodo = "GET", datos = null) {
  const opciones = { method: metodo, headers: { "Content-Type": "application/json" } };
  if (datos) opciones.body = JSON.stringify(datos);

  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    throw { status: 0, detail: "No se pudo conectar con la API" };
  }

  const json = await respuesta.json();
  if (!respuesta.ok) throw { status: respuesta.status, detail: json.detail };
  return json;
}

const listarLibros = () => pedir(API_URL);
const crearLibro = (datos) => pedir(API_URL, "POST", datos);
const actualizarLibro = (id, datos) => pedir(`${API_URL}/${id}`, "PUT", datos);
const eliminarLibro = (id) => pedir(`${API_URL}/${id}`, "DELETE");
