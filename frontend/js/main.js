// =====================================================================
// main.js — Orquestación: eventos de la página y coordinación entre la
// capa de datos (api.js) y la capa de presentación (ui.js).
// Ningún handler llama a fetch directamente.
// =====================================================================

import { listarLibros, crearLibro, actualizarLibro, eliminarLibro } from "./api.js";
import * as ui from "./ui.js";

const form = document.getElementById("form-libro");
const btnCancelar = document.getElementById("btn-cancelar");
const btnRecargar = document.getElementById("btn-recargar");

let guardando = false;

/** Muestra un error de la API (red, 404, 422 u otro) en la interfaz. */
function manejarError(error, contexto) {
  console.error(contexto, error);
  if (error?.esValidacion) {
    const sinCampo = ui.mostrarErroresCampos(error.detail);
    ui.mostrarMensaje(error.message, "error", sinCampo);
    return;
  }
  ui.mostrarMensaje(`${contexto}: ${error?.message ?? "Error desconocido"}`, "error");
}

/** Pide la lista al backend y la dibuja. */
async function cargarLibros() {
  ui.mostrarCargando(true);
  btnRecargar.disabled = true;
  try {
    const libros = await listarLibros();
    ui.renderizarLibros(libros, { onEditar: editarLibro, onEliminar: borrarLibro });
  } catch (error) {
    ui.limpiarListado();
    manejarError(error, "No se pudo cargar el listado");
  } finally {
    ui.mostrarCargando(false);
    btnRecargar.disabled = false;
  }
}

/** Submit del formulario: crea o actualiza según el modo. */
async function guardarLibro(evento) {
  evento.preventDefault();
  if (guardando) return; // evita doble envío

  const id = ui.obtenerIdEnEdicion();
  const datos = ui.leerFormulario();

  ui.limpiarErroresCampos();
  ui.limpiarMensaje();
  guardando = true;
  ui.setGuardando(true);

  try {
    if (id === null) {
      const nuevo = await crearLibro(datos);
      ui.mostrarMensaje(`Libro «${nuevo.titulo}» creado correctamente.`, "exito");
    } else {
      const actualizado = await actualizarLibro(id, datos);
      ui.mostrarMensaje(`Libro «${actualizado.titulo}» actualizado correctamente.`, "exito");
    }
    ui.resetearFormulario();
    await cargarLibros();
  } catch (error) {
    if (error?.status === 404) {
      // El libro fue borrado mientras se editaba: salimos del modo edición.
      ui.resetearFormulario();
      await cargarLibros();
    }
    manejarError(error, id === null ? "No se pudo crear el libro" : "No se pudo actualizar el libro");
  } finally {
    guardando = false;
    ui.setGuardando(false);
  }
}

/** Botón "Editar" de una fila: carga el libro en el formulario. */
function editarLibro(libro) {
  ui.limpiarMensaje();
  ui.cargarLibroEnFormulario(libro);
}

/** Botón "Eliminar" de una fila: pide confirmación y borra. */
async function borrarLibro(libro) {
  if (!confirm(`¿Seguro que querés eliminar «${libro.titulo}»? Esta acción no se puede deshacer.`)) {
    return;
  }
  try {
    await eliminarLibro(libro.id);
    // Si estábamos editando ese mismo libro, salimos del modo edición.
    if (ui.obtenerIdEnEdicion() === libro.id) ui.resetearFormulario();
    ui.mostrarMensaje(`Libro «${libro.titulo}» eliminado.`, "exito");
    await cargarLibros();
  } catch (error) {
    manejarError(error, "No se pudo eliminar el libro");
    // 404: ya no existía, refrescamos para mostrar el estado real.
    if (error?.status === 404) await cargarLibros();
  }
}

// ----------------------------- Eventos -------------------------------

form.addEventListener("submit", guardarLibro);

btnCancelar.addEventListener("click", () => {
  ui.resetearFormulario();
  ui.limpiarMensaje();
});

btnRecargar.addEventListener("click", () => {
  ui.limpiarMensaje();
  cargarLibros();
});

// Al modificar un campo con error, se le quita la marca roja.
form.addEventListener("input", (e) => {
  if (e.target.name) ui.limpiarErrorCampo(e.target.name);
});
form.addEventListener("change", (e) => {
  if (e.target.name) ui.limpiarErrorCampo(e.target.name);
});

// Carga inicial
cargarLibros();
