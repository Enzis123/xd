// Orquestación: eventos que conectan la interfaz (ui.js) con la API (api.js).
let librosCargados = [];

async function cargarLibros() {
  mostrarCargando(true);
  try {
    librosCargados = await listarLibros();
    mostrarLibros(librosCargados);
  } catch (error) {
    mostrarMensaje(error.detail, "error");
  } finally {
    mostrarCargando(false);
  }
}

document.getElementById("form").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limpiarErrores();
  const id = document.getElementById("id").value;
  try {
    if (id) await actualizarLibro(id, leerFormulario());
    else await crearLibro(leerFormulario());
    mostrarMensaje("Libro guardado", "ok");
    limpiarFormulario();
    cargarLibros();
  } catch (error) {
    if (error.status === 422) {
      mostrarErrores(error.detail);
      mostrarMensaje("Revisá los campos marcados", "error");
    } else {
      mostrarMensaje(error.detail, "error");
    }
  }
});

document.getElementById("cancelar").addEventListener("click", limpiarFormulario);

document.getElementById("lista").addEventListener("click", async (evento) => {
  const idEditar = evento.target.dataset.editar;
  const idEliminar = evento.target.dataset.eliminar;

  if (idEditar) {
    llenarFormulario(librosCargados.find((libro) => libro.id == idEditar));
  }

  if (idEliminar && confirm("¿Eliminar este libro?")) {
    try {
      await eliminarLibro(idEliminar);
      mostrarMensaje("Libro eliminado", "ok");
      cargarLibros();
    } catch (error) {
      mostrarMensaje(error.detail, "error");
    }
  }
});

cargarLibros();
