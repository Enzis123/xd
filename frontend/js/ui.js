// Manipulación del DOM.
const campos = ["titulo", "autor", "año", "precio"];

function mostrarLibros(libros) {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";
  for (const libro of libros) {
    const fila = document.createElement("tr");
    for (const valor of [libro.titulo, libro.autor, libro.año ?? "-", "$" + libro.precio, libro.disponible ? "Sí" : "No"]) {
      const celda = document.createElement("td");
      celda.textContent = valor;
      fila.appendChild(celda);
    }
    const acciones = document.createElement("td");
    acciones.innerHTML = `<button data-editar="${libro.id}">Editar</button> <button data-eliminar="${libro.id}">Eliminar</button>`;
    fila.appendChild(acciones);
    lista.appendChild(fila);
  }
}

function mostrarMensaje(texto, tipo) {
  const mensaje = document.getElementById("mensaje");
  mensaje.textContent = texto;
  mensaje.className = tipo;
}

function mostrarCargando(activo) {
  document.getElementById("cargando").hidden = !activo;
}

function leerFormulario() {
  const año = document.getElementById("año").value;
  return {
    titulo: document.getElementById("titulo").value,
    autor: document.getElementById("autor").value,
    año: año === "" ? null : Number(año),
    precio: Number(document.getElementById("precio").value),
    disponible: document.getElementById("disponible").checked,
  };
}

function llenarFormulario(libro) {
  document.getElementById("id").value = libro.id;
  for (const campo of campos) document.getElementById(campo).value = libro[campo] ?? "";
  document.getElementById("disponible").checked = libro.disponible;
  document.getElementById("form-titulo").textContent = "Editar libro";
}

function limpiarFormulario() {
  document.getElementById("form").reset();
  document.getElementById("id").value = "";
  document.getElementById("form-titulo").textContent = "Nuevo libro";
  limpiarErrores();
}

// Pinta los errores 422 que devuelve FastAPI debajo de cada campo.
function mostrarErrores(errores) {
  for (const error of errores) {
    const campo = error.loc[error.loc.length - 1];
    if (!campos.includes(campo)) continue;
    document.getElementById(campo).classList.add("invalido");
    document.getElementById("error-" + campo).textContent = error.msg;
  }
}

function limpiarErrores() {
  for (const campo of campos) {
    document.getElementById(campo).classList.remove("invalido");
    document.getElementById("error-" + campo).textContent = "";
  }
}
