// app.js - auto-guardado, portadas/información y columnas visibles

function avisar(texto) {
    const aviso = document.getElementById("aviso-guardado");
    if (!aviso) return;
    aviso.textContent = texto || "Guardado ✔";
    aviso.classList.add("visible");
    setTimeout(() => aviso.classList.remove("visible"), 1600);
}

function idLibro() {
    const ficha = document.querySelector(".ficha");
    return ficha ? ficha.dataset.id : null;
}

function guardar(campo, valor, callback) {
    fetch(`/api/libro/${idLibro()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo: campo, valor: valor }),
    })
    .then(r => r.json())
    .then(datos => {
        if (datos.ok) {
            avisar();
            if (callback) callback(datos);
        } else {
            avisar("⚠ " + (datos.error || "error"));
        }
    })
    .catch(() => avisar("⚠ sin conexión con la app"));
}

function conectarAutoguardado() {
    document.querySelectorAll("[data-autoguardar]").forEach(elemento => {
        if (elemento.dataset.autoguardadoListo === "1") return;
        elemento.dataset.autoguardadoListo = "1";
        elemento.addEventListener("change", () => {
            if (elemento.value === "__nuevo__") return;
            const valor = elemento.type === "checkbox" ? (elemento.checked ? "1" : "0") : elemento.value;
            guardar(elemento.dataset.autoguardar, valor, datos => {
                if (elemento.dataset.autoguardar === "pagina_actual" && datos.racha > 0) {
                    avisar(`Guardado ✔ 🔥 racha: ${datos.racha} día${datos.racha !== 1 ? "s" : ""}`);
                }
                if (elemento.dataset.autoguardar === "codigo_p") {
                    setTimeout(() => location.reload(), 600);
                }
            });
        });
    });
}
conectarAutoguardado();

function conectarEditables() {
    document.querySelectorAll(".editable").forEach(elemento => {
        if (elemento.dataset.editableListo === "1") return;
        elemento.dataset.editableListo = "1";
        elemento.addEventListener("blur", () => {
            guardar(elemento.dataset.campo, elemento.textContent.trim());
        });
        elemento.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); elemento.blur(); }
        });
    });
}
conectarEditables();

function ponerRating(n) {
    guardar("rating", n, () => {
        document.querySelectorAll(".estrella").forEach((estrella, i) => {
            estrella.classList.toggle("llena", i < n);
        });
        const texto = document.getElementById("texto-rating");
        if (texto) texto.textContent = n + "/10";
    });
}

function manejarCodigoPropietario(select) {
    const grupo = document.getElementById("grupo-nuevo-codigo");
    if (!grupo) return;
    grupo.style.display = select.value === "__nuevo__" ? "block" : "none";
}

function guardarNuevoCodigoPropietario() {
    const input = document.getElementById("nuevo-codigo-propietario");
    const select = document.getElementById("selector-codigo-propietario");
    if (!input || !select) return;
    const codigo = input.value.trim().toUpperCase();
    if (!codigo) { avisar("⚠ escribí el nuevo código"); return; }
    let opcion = Array.from(select.options).find(o => o.value === codigo);
    if (!opcion) {
        opcion = new Option(codigo, codigo);
        select.add(opcion, select.options[select.options.length - 1]);
    }
    select.value = codigo;
    document.getElementById("grupo-nuevo-codigo").style.display = "none";
    guardar("codigo_p", codigo, () => setTimeout(() => location.reload(), 600));
}

function estadoBusqueda(texto) {
    const estado = document.getElementById("estado-busqueda");
    if (estado) estado.textContent = texto;
}

function valorFicha(campo) {
    const el = document.querySelector(`[data-campo="${campo}"]`);
    return el ? el.textContent.trim() : "";
}

function textoCorto(texto, maximo) {
    if (!texto) return "";
    return texto.length > maximo ? texto.slice(0, maximo) + "..." : texto;
}

function buscarOpcionesFicha(callback, tipo) {
    const titulo = valorFicha("titulo");
    const autor = valorFicha("autor");
    if (!titulo) { estadoBusqueda("⚠ falta el título"); return; }
    estadoBusqueda(tipo === "portadas" ? "🔎 Buscando portadas..." : "🔎 Buscando información y sinopsis...");
    const endpoint = tipo === "portadas" ? "/api/buscar_imagenes" : "/api/opciones_internet";
    fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo, autor: autor }),
    })
    .then(r => r.json())
    .then(datos => {
        if (datos.error) { estadoBusqueda("⚠ " + datos.error); return; }
        callback(datos.opciones || []);
        estadoBusqueda(`✔ Encontré ${datos.opciones.length} opción(es).`);
    })
    .catch(() => estadoBusqueda("⚠ no pude conectarme a internet"));
}

function renderPortadasFicha(opciones) {
    const cont = document.getElementById("opciones-internet");
    if (!cont) return;
    cont.innerHTML = "";
    const conPortada = opciones.filter(op => op.portada_url);
    conPortada.forEach(op => {
        const card = document.createElement("div");
        card.className = "opcion-portada opcion-solo-portada";
        card.innerHTML = `<img src="${op.portada_url}" alt=""><div><strong>${op.titulo || "Sin título"}</strong><small>${op.autor || ""}</small><small>${op.editorial || ""}</small><small>${op.fuente || ""}</small><div class="opcion-botones"><button type="button" class="mini usar-portada">Usar esta portada</button></div></div>`;
        card.querySelector(".usar-portada").addEventListener("click", () => aplicarOpcionFicha(op, "solo_portada"));
        cont.appendChild(card);
    });
    if (!conPortada.length) cont.innerHTML = `<p class="vacio">No encontré portadas para esta búsqueda.</p>`;
    cont.style.display = "grid";
}

function renderInformacionFicha(opciones) {
    const cont = document.getElementById("opciones-internet");
    if (!cont) return;
    cont.innerHTML = "";
    opciones.forEach(op => {
        const card = document.createElement("div");
        card.className = "opcion-portada";
        const img = op.portada_url ? `<img src="${op.portada_url}" alt="">` : `<div class="sin-portada mini-cover">Sin portada</div>`;
        const sinopsis = op.descripcion ? textoCorto(op.descripcion, 330) : "Sin sinopsis disponible en esta fuente";
        card.innerHTML = `${img}<div><strong>${op.titulo || "Sin título"}</strong><small>${op.autor || ""}</small><small>${op.editorial || ""}${op.paginas ? " · " + op.paginas + " pág." : ""}</small><small>${op.fuente || ""}</small><p>${sinopsis}</p><div class="opcion-botones"><button type="button" class="mini usar-info">Usar esta información</button></div></div>`;
        card.querySelector(".usar-info").addEventListener("click", () => aplicarOpcionFicha(op, "solo_info"));
        cont.appendChild(card);
    });
    cont.style.display = "grid";
}

function aplicarOpcionFicha(op, modo) {
    const payload = Object.assign({}, op, { modo: modo });
    estadoBusqueda(modo === "solo_portada" ? "Guardando portada..." : "Guardando información sin tocar portada...");
    fetch(`/api/libro/${idLibro()}/aplicar_opcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    .then(r => r.json())
    .then(datos => {
        if (datos.error) { estadoBusqueda("⚠ " + datos.error); return; }
        if (modo === "solo_portada") {
            estadoBusqueda("✔ Portada aplicada. Actualizando...");
        } else if (datos.sinopsis_guardada) {
            estadoBusqueda("✔ Información y sinopsis aplicadas. La portada no se tocó. Actualizando...");
        } else {
            estadoBusqueda("✔ Información aplicada. Esta opción no trajo sinopsis. Actualizando...");
        }
        setTimeout(() => location.reload(), 900);
    })
    .catch(() => estadoBusqueda("⚠ no pude guardar la opción"));
}

function buscarImagenesFicha() {
    const consultaEl = document.getElementById("consulta-imagen-ficha");
    const consulta = consultaEl ? consultaEl.value.trim() : "";
    const titulo = valorFicha("titulo");
    const autor = valorFicha("autor");
    if (!consulta && !titulo) { estadoBusqueda("⚠ escribí un título o una búsqueda"); return; }
    estadoBusqueda("🔎 Buscando imágenes...");
    fetch("/api/buscar_imagenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo, autor: autor, consulta: consulta }),
    })
    .then(r => r.json())
    .then(datos => {
        if (datos.error) { estadoBusqueda("⚠ " + datos.error); return; }
        renderPortadasFicha(datos.opciones || []);
        estadoBusqueda(`✔ Encontré ${datos.opciones.length} imagen(es).`);
    })
    .catch(() => estadoBusqueda("⚠ no pude conectarme a internet"));
}

function quitarPortadaFicha() {
    if (!idLibro()) return;
    if (!confirm("¿Quitar la portada actual?")) return;
    estadoBusqueda("Quitando portada...");
    fetch(`/api/libro/${idLibro()}/quitar_portada`, { method: "POST" })
    .then(r => r.json())
    .then(datos => {
        if (datos.error) { estadoBusqueda("⚠ " + datos.error); return; }
        estadoBusqueda("✔ Portada quitada. Actualizando...");
        setTimeout(() => location.reload(), 600);
    })
    .catch(() => estadoBusqueda("⚠ no pude quitar la portada"));
}

function buscarPortadasFicha() { buscarOpcionesFicha(renderPortadasFicha, "portadas"); }
function buscarInformacionFicha() { buscarOpcionesFicha(renderInformacionFicha, "info"); }

// Columnas visibles en catálogo
function aplicarColumnasVisibles() {
    const toggles = document.querySelectorAll("[data-col-toggle]");
    toggles.forEach(toggle => {
        const col = toggle.dataset.colToggle;
        const clave = "biblioteca_col_" + col;
        const guardado = localStorage.getItem(clave);
        if (guardado !== null) toggle.checked = guardado === "1";
        document.querySelectorAll(".col-" + col).forEach(el => {
            el.style.display = toggle.checked ? "" : "none";
        });
        toggle.addEventListener("change", () => {
            localStorage.setItem(clave, toggle.checked ? "1" : "0");
            document.querySelectorAll(".col-" + col).forEach(el => {
                el.style.display = toggle.checked ? "" : "none";
            });
        });
    });

    const toggleNumeros = document.getElementById("toggle-numeros-propietario");
    if (toggleNumeros) {
        const guardado = localStorage.getItem("biblioteca_mostrar_numeros_propietario") === "1";
        toggleNumeros.checked = guardado;
        document.body.classList.toggle("mostrar-numeros-prop", guardado);
        toggleNumeros.addEventListener("change", () => {
            localStorage.setItem("biblioteca_mostrar_numeros_propietario", toggleNumeros.checked ? "1" : "0");
            document.body.classList.toggle("mostrar-numeros-prop", toggleNumeros.checked);
        });
    }
}

aplicarColumnasVisibles();

function conectarRatingForms() {
    document.querySelectorAll(".rating-form").forEach(form => {
        const inputs = Array.from(form.querySelectorAll('input[type="radio"]'));
        const pintar = valor => {
            form.querySelectorAll("label").forEach(label => {
                const input = document.getElementById(label.getAttribute("for"));
                const n = input ? parseInt(input.value, 10) : 0;
                label.classList.toggle("seleccionada", n <= valor);
            });
        };
        inputs.forEach(input => input.addEventListener("change", () => pintar(parseInt(input.value, 10))));
    });
}
conectarRatingForms();

function cerrarOpcionesInternet() {
    const cont = document.getElementById("opciones-internet");
    const cab = document.getElementById("opciones-cabecera");
    if (cont) { cont.innerHTML = ""; cont.style.display = "none"; }
    if (cab) cab.style.display = "none";
    estadoBusqueda("");
}

function mostrarCabeceraOpciones() {
    const cab = document.getElementById("opciones-cabecera");
    if (cab) cab.style.display = "flex";
}

// Reforzar cierre y actualización después de elegir portada/información.
const _renderPortadasFichaOriginal = typeof renderPortadasFicha === "function" ? renderPortadasFicha : null;
if (_renderPortadasFichaOriginal) {
    renderPortadasFicha = function(opciones) {
        _renderPortadasFichaOriginal(opciones);
        mostrarCabeceraOpciones();
    };
}
const _renderInformacionFichaOriginal = typeof renderInformacionFicha === "function" ? renderInformacionFicha : null;
if (_renderInformacionFichaOriginal) {
    renderInformacionFicha = function(opciones) {
        _renderInformacionFichaOriginal(opciones);
        mostrarCabeceraOpciones();
    };
}

function prepararModoLecturaFicha() {
    const ficha = document.querySelector(".ficha");
    if (!ficha) return;
    const editando = ficha.dataset.editar === "1";
    if (!editando) {
        ficha.querySelectorAll("[data-autoguardar]").forEach(el => {
            el.setAttribute("readonly", "readonly");
            if (el.tagName === "SELECT" || el.type === "checkbox") el.setAttribute("disabled", "disabled");
        });
        ficha.querySelectorAll(".editable").forEach(el => el.setAttribute("contenteditable", "false"));
    }
    // v7: no recargar la ficha completa por tener QR oculto.
    // El refresco de portada se maneja más abajo solo cuando la ventana está abierta.
}
prepararModoLecturaFicha();

// -------------------- v7: ventana de portada, sinopsis directa y estrellas corregidas
function abrirModalPortadaFicha() {
    const modal = document.getElementById("modal-portada-ficha");
    if (modal) modal.style.display = "flex";
}
function cerrarModalPortadaFicha() {
    const modal = document.getElementById("modal-portada-ficha");
    if (modal) modal.style.display = "none";
}
function srcParaPortada(valor) {
    if (!valor) return "";
    if (valor.startsWith("http://") || valor.startsWith("https://")) return valor;
    return "/static/" + valor;
}
function actualizarPortadaVisual(valor) {
    const fichaPortada = document.querySelector(".ficha-portada");
    if (!fichaPortada) return;
    let img = document.getElementById("ficha-cover-img");
    const src = srcParaPortada(valor);
    if (src) {
        if (!img) {
            const placeholder = fichaPortada.querySelector(".sin-portada.grande");
            img = document.createElement("img");
            img.id = "ficha-cover-img";
            img.alt = "Portada";
            if (placeholder) placeholder.replaceWith(img);
            else fichaPortada.prepend(img);
        }
        img.src = src + (src.includes("?") ? "&" : "?") + "t=" + Date.now();
    } else if (img) {
        const titulo = valorFicha("titulo") || "Sin portada";
        const div = document.createElement("div");
        div.className = "sin-portada grande";
        div.innerHTML = `<span>${titulo}</span>`;
        img.replaceWith(div);
    }
}

// Sobrescribe la aplicación de portada para no cerrar ni recargar la ventana.
function aplicarOpcionFicha(op, modo) {
    const payload = Object.assign({}, op, { modo: modo });
    estadoBusqueda(modo === "solo_portada" ? "Guardando portada..." : "Guardando información sin tocar portada...");
    fetch(`/api/libro/${idLibro()}/aplicar_opcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    .then(r => r.json())
    .then(datos => {
        if (datos.error) { estadoBusqueda("⚠ " + datos.error); return; }
        if (modo === "solo_portada") {
            actualizarPortadaVisual(datos.portada || op.portada_url);
            estadoBusqueda("✔ Portada aplicada. La ventana queda abierta hasta que vos la cierres.");
        } else {
            ["autor", "editorial", "paginas", "isbn", "idioma", "descripcion"].forEach(campo => {
                const el = document.querySelector(`[data-autoguardar="${campo}"]`);
                if (el && !el.value && payload[campo]) el.value = payload[campo];
            });
            estadoBusqueda(datos.sinopsis_guardada ? "✔ Información y sinopsis aplicadas." : "✔ Información aplicada. Esta fuente no trajo sinopsis nueva.");
        }
    })
    .catch(() => estadoBusqueda("⚠ no pude guardar la opción"));
}

function quitarPortadaFicha() {
    if (!idLibro()) return;
    if (!confirm("¿Quitar la portada actual?")) return;
    estadoBusqueda("Quitando portada...");
    fetch(`/api/libro/${idLibro()}/quitar_portada`, { method: "POST" })
    .then(r => r.json())
    .then(datos => {
        if (datos.error) { estadoBusqueda("⚠ " + datos.error); return; }
        actualizarPortadaVisual(null);
        estadoBusqueda("✔ Portada quitada. La ventana sigue abierta.");
    })
    .catch(() => estadoBusqueda("⚠ no pude quitar la portada"));
}

function estadoSinopsisFicha(texto) {
    const el = document.getElementById("estado-sinopsis-ficha");
    if (el) el.textContent = texto;
}
function urlGoogleSinopsis(titulo, autor) {
    const consulta = [titulo || "", autor || "", "sinopsis"].map(x => x.trim()).filter(Boolean).join(" ");
    return "https://www.google.com/search?q=" + encodeURIComponent(consulta);
}
function abrirBusquedaGoogleSinopsis(titulo, autor) {
    const url = urlGoogleSinopsis(titulo, autor);
    const ventana = window.open(url, "_blank", "noopener");
    return { url: url, abierta: !!ventana };
}
function fallbackSinopsisFicha(titulo, autor, mensaje) {
    const google = abrirBusquedaGoogleSinopsis(titulo, autor);
    estadoSinopsisFicha("⚠ " + mensaje + " Abrí Google con título + autor + sinopsis y también una ventana para pegarla manualmente.");
    abrirVentanaSinopsisManual("ficha", titulo, autor);
}
function buscarOtrasSinopsisFicha() {
    const titulo = valorFicha("titulo");
    const autor = valorFicha("autor");
    if (!titulo) { estadoSinopsisFicha("⚠ falta el título"); return; }
    abrirBusquedaGoogleSinopsis(titulo, autor);
    abrirVentanaSinopsisManual("ficha", titulo, autor);
    estadoSinopsisFicha("🔎 Abrí Google con título + autor + sinopsis. También podés pegar acá otra sinopsis manualmente.");
}
function cerrarSinopsisFicha() {
    const cont = document.getElementById("opciones-sinopsis-ficha");
    const cab = document.getElementById("cabecera-sinopsis-ficha");
    if (cont) { cont.innerHTML = ""; cont.style.display = "none"; }
    if (cab) cab.style.display = "none";
    estadoSinopsisFicha("");
}
function renderSinopsisFicha(opciones) {
    const cont = document.getElementById("opciones-sinopsis-ficha");
    const cab = document.getElementById("cabecera-sinopsis-ficha");
    if (!cont) return;
    if (cab) {
        cab.innerHTML = `<strong>Sinopsis encontradas</strong><div class="acciones-cabecera"><button type="button" class="mini secundario" onclick="buscarOtrasSinopsisFicha()">🔎 Buscar otras opciones en Google</button><button type="button" class="mini secundario" onclick="cerrarSinopsisFicha()">Limpiar resultados</button></div>`;
        cab.style.display = "flex";
    }
    cont.innerHTML = "";
    opciones.forEach(op => {
        const card = document.createElement("div");
        card.className = "opcion-portada opcion-sinopsis";
        const sinopsis = op.descripcion ? textoCorto(op.descripcion, 760) : "Sin texto disponible";
        card.innerHTML = `<div><strong>${op.titulo || "Sinopsis encontrada"}</strong><small>${op.fuente || "Google / Internet"}</small><p>${sinopsis}</p><div class="opcion-botones"><button type="button" class="mini usar-sinopsis">Pegar en sinopsis</button></div></div>`;
        card.querySelector(".usar-sinopsis").addEventListener("click", () => {
            const el = document.getElementById("campo-descripcion-ficha") || document.querySelector('[data-autoguardar="descripcion"]');
            if (el) {
                el.value = op.descripcion || "";
                guardar("descripcion", el.value);
            }
            estadoSinopsisFicha("✔ Sinopsis pegada y guardada. La podés editar si querés.");
        });
        cont.appendChild(card);
    });
    cont.style.display = "grid";
}
function buscarSinopsisFicha() {
    const titulo = valorFicha("titulo");
    const autor = valorFicha("autor");
    if (!titulo) { estadoSinopsisFicha("⚠ falta el título"); return; }
    estadoSinopsisFicha("🔎 Buscando en Google con título + autor + sinopsis...");
    fetch("/api/buscar_sinopsis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo, autor: autor }),
    })
    .then(r => r.json())
    .then(datos => {
        if (datos.error) {
            fallbackSinopsisFicha(titulo, autor, datos.error);
            return;
        }
        if (!datos.opciones || !datos.opciones.length) {
            fallbackSinopsisFicha(titulo, autor, "No apareció ninguna sinopsis.");
            return;
        }
        renderSinopsisFicha(datos.opciones || []);
        estadoSinopsisFicha(`✔ Encontré ${datos.opciones.length} texto(s) posibles.`);
    })
    .catch(() => {
        fallbackSinopsisFicha(titulo, autor, "no pude conectarme a internet.");
    });
}

function abrirVentanaSinopsisManual(contexto, titulo, autor) {
    let modal = document.getElementById("modal-sinopsis-manual");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-sinopsis-manual";
        modal.className = "modal-portada";
        modal.innerHTML = `
            <div class="modal-portada-contenido modal-sinopsis-contenido">
                <div class="modal-portada-header">
                    <h3>✍️ Pegar sinopsis manual</h3>
                    <button type="button" class="mini secundario" onclick="cerrarVentanaSinopsisManual()">Cerrar</button>
                </div>
                <p class="nota mini-nota">Pegá acá la sinopsis que encontraste y después tocá “Usar esta sinopsis”.</p>
                <p id="sinopsis-manual-google" class="nota enlace-google-sinopsis"></p>
                <textarea id="sinopsis-manual-texto" rows="9" placeholder="Pegá acá la sinopsis..."></textarea>
                <div class="botones">
                    <button type="button" class="principal" onclick="guardarSinopsisManual()">Usar esta sinopsis</button>
                    <button type="button" class="secundario" onclick="cerrarVentanaSinopsisManual()">Cancelar</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
    modal.dataset.contexto = contexto || "ficha";
    const tituloBase = titulo || valorFicha("titulo") || document.getElementById("campo-titulo")?.value || "";
    const autorBase = autor || valorFicha("autor") || document.getElementById("campo-autor")?.value || "";
    const urlGoogle = urlGoogleSinopsis(tituloBase, autorBase);
    modal.dataset.googleUrl = urlGoogle;
    const enlaceGoogle = document.getElementById("sinopsis-manual-google");
    if (enlaceGoogle) enlaceGoogle.innerHTML = `<a href="${urlGoogle}" target="_blank" rel="noopener">🔎 Abrir búsqueda en Google: título + autor + sinopsis</a>`;
    const destino = contexto === "nueva" ? document.getElementById("campo-descripcion") : (document.getElementById("campo-descripcion-ficha") || document.querySelector('[data-autoguardar="descripcion"]'));
    const textarea = document.getElementById("sinopsis-manual-texto");
    textarea.value = destino ? destino.value : "";
    modal.style.display = "flex";
    setTimeout(() => textarea.focus(), 50);
}
function cerrarVentanaSinopsisManual() {
    const modal = document.getElementById("modal-sinopsis-manual");
    if (modal) modal.style.display = "none";
}
function guardarSinopsisManual() {
    const modal = document.getElementById("modal-sinopsis-manual");
    const texto = (document.getElementById("sinopsis-manual-texto")?.value || "").trim();
    if (!texto) { alert("Pegá una sinopsis antes de guardar."); return; }
    const contexto = modal ? modal.dataset.contexto : "ficha";
    if (contexto === "nueva") {
        const el = document.getElementById("campo-descripcion");
        if (el) el.value = texto;
        if (typeof estadoSinopsisNueva === "function") estadoSinopsisNueva("✔ Sinopsis manual pegada. La podés editar antes de guardar.");
    } else {
        const el = document.getElementById("campo-descripcion-ficha") || document.querySelector('[data-autoguardar="descripcion"]');
        if (el) { el.value = texto; guardar("descripcion", texto); }
        estadoSinopsisFicha("✔ Sinopsis manual pegada y guardada.");
    }
    cerrarVentanaSinopsisManual();
}

function estadoIsbnFicha(texto) {
    const el = document.getElementById("estado-isbn-ficha");
    if (el) el.textContent = texto;
}
function autoguardarSiVacio(campo, valor) {
    if (!valor) return false;
    const el = document.querySelector(`[data-autoguardar="${campo}"]`);
    if (!el) return false;
    const actual = (el.value || el.textContent || "").trim();
    if (actual) return false;
    if ("value" in el) el.value = valor;
    else el.textContent = valor;
    guardar(campo, valor);
    return true;
}
function aplicarDatosIsbnFicha(datos) {
    let cambios = 0;
    ["autor", "editorial", "paginas", "isbn", "idioma", "descripcion"].forEach(campo => {
        if (autoguardarSiVacio(campo, datos[campo])) cambios++;
    });
    if (datos.dewey_sugerido && autoguardarSiVacio("dewey", datos.dewey_sugerido)) cambios++;
    estadoIsbnFicha(cambios ? "✔ Datos completados por ISBN" : "⚠ no había campos vacíos para completar");
}
function buscarIsbnFicha() {
    const isbnEl = document.querySelector('[data-autoguardar="isbn"]');
    const isbn = isbnEl ? isbnEl.value.trim() : "";
    if (!isbn) { estadoIsbnFicha("⚠ escribí el número de ISBN para completar los datos"); return; }
    estadoIsbnFicha("🔎 Buscando datos por ISBN...");
    fetch("/api/isbn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: isbn }),
    })
    .then(r => r.json())
    .then(datos => {
        if (datos.error) { estadoIsbnFicha("⚠ " + datos.error); return; }
        aplicarDatosIsbnFicha(datos);
    })
    .catch(() => estadoIsbnFicha("⚠ no pude conectarme a internet"));
}

// Solo refresca por QR cuando la ventana de portada está abierta.
function prepararRefrescoQRv7() {
    setInterval(() => {
        if (document.hidden) return;
        const modal = document.getElementById("modal-portada-ficha");
        if (modal && modal.style.display !== "none") {
            const img = document.getElementById("ficha-cover-img");
            if (img) img.src = img.src.split("?")[0] + "?t=" + Date.now();
        }
    }, 12000);
}
prepararRefrescoQRv7();

// Estrellas de izquierda a derecha.
function conectarRatingFormsV7() {
    document.querySelectorAll(".rating-form").forEach(form => {
        const inputs = Array.from(form.querySelectorAll('input[type="radio"]'));
        const labels = Array.from(form.querySelectorAll("label"));
        const pintar = valor => {
            labels.forEach(label => {
                const input = document.getElementById(label.getAttribute("for"));
                const n = input ? parseInt(input.value, 10) : 0;
                label.classList.toggle("seleccionada", n <= valor);
            });
        };
        const valorActual = () => {
            const checked = inputs.find(i => i.checked);
            return checked ? parseInt(checked.value, 10) : 0;
        };
        labels.forEach(label => {
            const input = document.getElementById(label.getAttribute("for"));
            const n = input ? parseInt(input.value, 10) : 0;
            label.addEventListener("mouseenter", () => pintar(n));
            label.addEventListener("click", () => pintar(n));
        });
        form.addEventListener("mouseleave", () => pintar(valorActual()));
        inputs.forEach(input => input.addEventListener("change", () => pintar(parseInt(input.value, 10))));
        pintar(valorActual());
    });
}
conectarRatingFormsV7();
