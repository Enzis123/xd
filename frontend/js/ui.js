// =====================================================================
// ui.js — Solo manipulación del DOM. No conoce fetch ni la API.
// Regla de seguridad: los datos del usuario se insertan SIEMPRE con
// textContent / createElement (nunca innerHTML) para evitar XSS.
// =====================================================================

// Referencias a elementos del DOM
const el = {
  form: document.getElementById("form-libro"),
  id: document.getElementById("libro-id"),
  tituloForm: document.getElementById("titulo-form"),
  btnGuardar: document.getElementById("btn-guardar"),
  btnCancelar: document.getElementById("btn-cancelar"),
  mensajes: document.getElementById("mensajes"),
  cargando: document.getElementById("cargando"),
  vacio: document.getElementById("vacio"),
  tabla: document.getElementById("tabla-libros"),
  lista: document.getElementById("lista-libros"),
};

// Campos del formulario según el contrato de la API
const CAMPOS = ["titulo", "autor", "genero", "anio_publicacion", "paginas", "precio", "disponible"];

const formatoPrecio = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

// ------------------------------ Listado ------------------------------

/** Crea una celda <td> con texto plano y una etiqueta para la vista móvil. */
function celda(texto, etiqueta, clase) {
  const td = document.createElement("td");
  td.textContent = texto;
  td.dataset.label = etiqueta;
  if (clase) td.className = clase;
  return td;
}

/** Crea el badge de disponibilidad. */
function badgeDisponible(disponible) {
  const span = document.createElement("span");
  span.className = "badge " + (disponible ? "badge--si" : "badge--no");
  span.textContent = disponible ? "Disponible" : "No disponible";
  return span;
}

/**
 * Dibuja la lista de libros en la tabla.
 * @param {Array} libros
 * @param {{onEditar: Function, onEliminar: Function}} handlers
 */
export function renderizarLibros(libros, { onEditar, onEliminar }) {
  el.lista.replaceChildren();

  const hayLibros = Array.isArray(libros) && libros.length > 0;
  el.vacio.hidden = hayLibros;
  el.tabla.hidden = !hayLibros;
  if (!hayLibros) return;

  const fragmento = document.createDocumentFragment();
  for (const libro of libros) {
    const tr = document.createElement("tr");
    tr.dataset.id = libro.id;

    tr.append(
      celda(libro.titulo, "Título", "col-titulo"),
      celda(libro.autor, "Autor"),
      celda(libro.genero, "Género"),
      celda(libro.anio_publicacion ?? "—", "Año"),
      celda(libro.paginas, "Páginas"),
      celda(formatoPrecio.format(libro.precio), "Precio")
    );

    const tdEstado = document.createElement("td");
    tdEstado.dataset.label = "Estado";
    tdEstado.append(badgeDisponible(libro.disponible));

    const tdAcciones = document.createElement("td");
    tdAcciones.className = "col-acciones";

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "btn btn--chico btn--secundario";
    btnEditar.textContent = "Editar";
    btnEditar.setAttribute("aria-label", `Editar «${libro.titulo}»`);
    btnEditar.addEventListener("click", () => onEditar(libro));

    const btnEliminar = document.createElement("button");
    btnEliminar.type = "button";
    btnEliminar.className = "btn btn--chico btn--peligro";
    btnEliminar.textContent = "Eliminar";
    btnEliminar.setAttribute("aria-label", `Eliminar «${libro.titulo}»`);
    btnEliminar.addEventListener("click", () => onEliminar(libro));

    tdAcciones.append(btnEditar, btnEliminar);
    tr.append(tdEstado, tdAcciones);
    fragmento.append(tr);
  }
  el.lista.append(fragmento);
}

/** Vacía la tabla (p. ej. cuando la API está caída). */
export function limpiarListado() {
  el.lista.replaceChildren();
  el.tabla.hidden = true;
  el.vacio.hidden = true;
}

// ------------------------------ Carga --------------------------------

export function mostrarCargando(visible) {
  el.cargando.hidden = !visible;
}

/** Deshabilita el botón de guardar mientras se envía la petición. */
export function setGuardando(guardando) {
  el.btnGuardar.disabled = guardando;
  el.btnGuardar.classList.toggle("btn--cargando", guardando);
  el.btnGuardar.textContent = guardando
    ? "Guardando…"
    : el.id.value ? "Guardar cambios" : "Crear libro";
}

// ----------------------------- Mensajes ------------------------------

let temporizadorMensaje = null;

/**
 * Muestra un mensaje en el área de alertas.
 * @param {string} texto
 * @param {"exito"|"error"|"info"} tipo
 * @param {string[]} [detalles] líneas extra (se muestran como lista)
 */
export function mostrarMensaje(texto, tipo = "info", detalles = []) {
  clearTimeout(temporizadorMensaje);

  const alerta = document.createElement("div");
  alerta.className = `alerta alerta--${tipo}`;
  alerta.setAttribute("role", tipo === "error" ? "alert" : "status");

  const p = document.createElement("p");
  p.textContent = texto;
  alerta.append(p);

  if (detalles.length) {
    const ul = document.createElement("ul");
    for (const d of detalles) {
      const li = document.createElement("li");
      li.textContent = d;
      ul.append(li);
    }
    alerta.append(ul);
  }

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "alerta__cerrar";
  cerrar.setAttribute("aria-label", "Cerrar mensaje");
  cerrar.textContent = "×";
  cerrar.addEventListener("click", limpiarMensaje);
  alerta.append(cerrar);

  el.mensajes.replaceChildren(alerta);

  // Los mensajes de éxito se ocultan solos; los errores quedan hasta cerrarlos.
  if (tipo === "exito") {
    temporizadorMensaje = setTimeout(limpiarMensaje, 4000);
  }
}

export function limpiarMensaje() {
  clearTimeout(temporizadorMensaje);
  el.mensajes.replaceChildren();
}

// ------------------------- Errores por campo -------------------------

/**
 * Pinta los errores 422 de FastAPI en cada campo.
 * Cada error tiene la forma {loc: ["body", "campo"], msg, type};
 * el nombre del campo es el último elemento de `loc`.
 * @returns {string[]} errores que no pudieron asociarse a un campo del form.
 */
export function mostrarErroresCampos(errores) {
  limpiarErroresCampos();
  const sinCampo = [];
  let primerInvalido = null;

  for (const error of errores) {
    const loc = Array.isArray(error.loc) ? error.loc : [];
    const campo = loc[loc.length - 1];
    const input = CAMPOS.includes(campo) ? el.form.elements[campo] : null;
    const msg = limpiarMensajePydantic(error.msg);

    if (!input) {
      sinCampo.push(campo ? `${campo}: ${msg}` : msg);
      continue;
    }

    input.classList.add("invalido");
    input.setAttribute("aria-invalid", "true");
    const contenedorError = el.form.querySelector(`[data-error-for="${campo}"]`);
    if (contenedorError) {
      // Si un campo tiene más de un error, los concatenamos.
      contenedorError.textContent = contenedorError.textContent
        ? `${contenedorError.textContent} ${msg}`
        : msg;
      input.setAttribute("aria-describedby", contenedorError.id || "");
    }
    primerInvalido ??= input;
  }

  primerInvalido?.focus();
  return sinCampo;
}

/** Pydantic v2 antepone "Value error, " a los errores de validadores propios. */
function limpiarMensajePydantic(msg) {
  return String(msg ?? "Valor inválido").replace(/^Value error,\s*/i, "");
}

export function limpiarErroresCampos() {
  for (const input of el.form.querySelectorAll(".invalido")) {
    input.classList.remove("invalido");
    input.removeAttribute("aria-invalid");
  }
  for (const p of el.form.querySelectorAll(".error-campo")) {
    p.textContent = "";
  }
}

/** Quita el error de un campo cuando el usuario lo modifica. */
export function limpiarErrorCampo(campo) {
  const input = el.form.elements[campo];
  if (!input) return;
  input.classList.remove("invalido");
  input.removeAttribute("aria-invalid");
  const p = el.form.querySelector(`[data-error-for="${campo}"]`);
  if (p) p.textContent = "";
}

// ---------------------------- Formulario -----------------------------

/** Pasa el formulario a modo edición con los datos del libro. */
export function cargarLibroEnFormulario(libro) {
  limpiarErroresCampos();
  const f = el.form.elements;
  el.id.value = libro.id;
  f.titulo.value = libro.titulo ?? "";
  f.autor.value = libro.autor ?? "";
  f.genero.value = libro.genero ?? "";
  f.anio_publicacion.value = libro.anio_publicacion ?? "";
  f.paginas.value = libro.paginas ?? "";
  f.precio.value = libro.precio ?? "";
  f.disponible.checked = Boolean(libro.disponible);

  el.tituloForm.textContent = `Editando: ${libro.titulo}`;
  el.btnGuardar.textContent = "Guardar cambios";
  el.btnCancelar.hidden = false;
  el.form.classList.add("form--edicion");
  el.form.scrollIntoView({ behavior: "smooth", block: "start" });
  f.titulo.focus({ preventScroll: true });
}

/** Vuelve el formulario a modo alta y lo vacía. */
export function resetearFormulario() {
  el.form.reset();
  el.id.value = "";
  limpiarErroresCampos();
  el.tituloForm.textContent = "Nuevo libro";
  el.btnGuardar.textContent = "Crear libro";
  el.btnCancelar.hidden = true;
  el.form.classList.remove("form--edicion");
}

/** Devuelve el id del libro en edición, o null si estamos en modo alta. */
export function obtenerIdEnEdicion() {
  return el.id.value ? Number(el.id.value) : null;
}

/**
 * Convierte un valor de input numérico:
 *  - vacío -> null (el backend decide si es obligatorio)
 *  - número válido -> Number
 *  - texto no numérico -> se envía tal cual para que el backend lo rechace
 */
function aNumero(valor) {
  const v = valor.trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
}

/** Lee el formulario y devuelve el objeto Libro con los tipos correctos. */
export function leerFormulario() {
  const f = el.form.elements;
  return {
    titulo: f.titulo.value,
    autor: f.autor.value,
    genero: f.genero.value,
    anio_publicacion: aNumero(f.anio_publicacion.value),
    paginas: aNumero(f.paginas.value),
    precio: aNumero(f.precio.value),
    disponible: f.disponible.checked,
  };
}

// Damos id a los contenedores de error para enlazarlos con aria-describedby.
for (const p of el.form.querySelectorAll(".error-campo")) {
  p.id = `error-${p.dataset.errorFor}`;
}
