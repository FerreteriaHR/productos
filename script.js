// =========================================================
// CONFIGURACIÓN FIREBASE
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyBYdFpAvLpJspfe9WhugCbSqUDnFIjHRXc",
  authDomain: "ferreteria-hr.firebaseapp.com",
  projectId: "ferreteria-hr",
  storageBucket: "ferreteria-hr.firebasestorage.app",
  messagingSenderId: "1091084861026",
  appId: "1:1091084861026:web:f9816ad4c8235c39245b3b"
};

if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();
}

let listaCotizacion = [];
let listaCompras = [];
let usuarioActual = null;
let favoritosUsuario = [];
let modoRegistro = true;

document.addEventListener("DOMContentLoaded", function () {
  const productos = document.querySelectorAll(".producto");
  const botonesCategoria = document.querySelectorAll(".boton-categoria");
  const inputBuscador = document.getElementById("buscador");
  const btnSubir = document.getElementById("btnSubir");

  // Cargar modo oscuro guardado
  if (localStorage.getItem("ferre_modo_oscuro") === "true") {
    document.body.classList.add("modo-oscuro");
    const btnOscuro = document.getElementById("btn-modo-oscuro");
    if (btnOscuro) btnOscuro.textContent = "☀️ Modo Claro";
  }

  // 1. Estructurar tarjetas de productos
  productos.forEach((prod, index) => {
    const img = prod.querySelector("img");
    const nombre = prod.querySelector("p");
    const cat = prod.getAttribute("data-categoria") || "";

    if (img && nombre) {
      const nombreTexto = nombre.textContent.trim();
      const prodId = "prod_" + index + "_" + nombreTexto.toLowerCase().replace(/[^a-z0-9]/g, "");
      prod.setAttribute("data-id", prodId);

      prod.innerHTML = `
        <button class="btn-favorito" title="Guardar en favoritos" onclick="toggleFavorito(event, '${prodId}')">🤍</button>
        <div class="producto-img-wrap">
          <img src="${img.getAttribute("src")}" alt="${img.getAttribute("alt")}" loading="lazy">
        </div>
        <div class="producto-info">
          <span class="producto-tag">${cat}</span>
          <p>${nombreTexto}</p>
        </div>
      `;
    }
  });

  // 2. Auth listener
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
      usuarioActual = user;
      const btnHeader = document.getElementById("btn-abrir-auth");
      const btnFavFlotante = document.getElementById("btn-favoritos-flotante");
      const btnComprarFlotante = document.getElementById("btn-comprar-flotante");
      const btnFavComprarTodos = document.getElementById("btn-fav-comprar-todos");
      const botonesCorazon = document.querySelectorAll(".btn-favorito");

      if (user) {
        const nombreMostrar = user.displayName || user.email.split("@")[0];
        if (btnHeader) {
          btnHeader.textContent = `👤 ${nombreMostrar}`;
          btnHeader.classList.add("btn-cliente-logueado");
        }
        document.getElementById("vista-auth-formulario").style.display = "none";
        document.getElementById("vista-auth-perfil").style.display = "block";
        document.getElementById("perfil-nombre-usuario").textContent = nombreMostrar;
        document.getElementById("perfil-correo-usuario").textContent = user.email;

        if (btnFavFlotante) btnFavFlotante.style.display = "flex";
        if (btnFavComprarTodos) btnFavComprarTodos.style.display = "inline-flex";
        actualizarBotonFlotanteCompra();
        botonesCorazon.forEach((btn) => (btn.style.display = "flex"));
        await cargarFavoritosDeNube(user.uid);
      } else {
        favoritosUsuario = [];
        listaCompras = [];
        actualizarBotonFlotanteCompra();
        if (btnHeader) {
          btnHeader.textContent = "✨ Únete como cliente";
          btnHeader.classList.remove("btn-cliente-logueado");
        }
        document.getElementById("vista-auth-formulario").style.display = "block";
        document.getElementById("vista-auth-perfil").style.display = "none";
        if (btnFavFlotante) btnFavFlotante.style.display = "none";
        if (btnFavComprarTodos) btnFavComprarTodos.style.display = "none";
        if (btnComprarFlotante) btnComprarFlotante.style.display = "none";
        botonesCorazon.forEach((btn) => {
          btn.style.display = "none";
          btn.textContent = "🤍";
        });
        actualizarCorazonesEnPantalla();
      }
    });
  }

  // 3. Modal de Producto Ampliado
  const modal = document.createElement("div");
  modal.id = "modal-producto";
  modal.className = "modal-overlay";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="modal-contenido">
      <span class="cerrar">&times;</span>
      <img src="" alt="Producto ampliado" id="modal-imagen" />
      <h2 id="modal-nombre" style="margin-bottom:6px; font-size:1.15rem;"></h2>
      <p style="color:var(--texto-suave); font-size:0.85rem; margin-bottom:12px;">Elige una opción para tu artículo:</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <button id="btn-agregar-cotizacion-modal" class="btn-social" style="width:100%; justify-content:center; border:none; cursor:pointer; background:var(--negro); color:var(--amarillo); padding:10px; font-size:0.9rem;">
          📋 Agregar a lista de cotización
        </button>
        <button id="btn-agregar-compra-modal" class="btn-social" style="width:100%; justify-content:center; border:none; cursor:pointer; background:#1b5e20; color:#fff; padding:10px; font-size:0.9rem; display:none;">
          🛒 Comprar / Apartar (Exclusivo Clientes)
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalImg = document.getElementById("modal-imagen");
  const modalNombre = document.getElementById("modal-nombre");
  const btnAgregarCotiz = document.getElementById("btn-agregar-cotizacion-modal");
  const btnAgregarCompra = document.getElementById("btn-agregar-compra-modal");
  let productoSeleccionadoActual = "";

  productos.forEach((producto) => {
    producto.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-favorito")) return;
      const img = producto.querySelector("img");
      const nombre = producto.querySelector("p").textContent.trim();
      productoSeleccionadoActual = nombre;
      if (modalImg && img) modalImg.src = img.src;
      if (modalNombre) modalNombre.textContent = nombre;

      if (usuarioActual) {
        if (btnAgregarCompra) btnAgregarCompra.style.display = "inline-flex";
      } else {
        if (btnAgregarCompra) btnAgregarCompra.style.display = "none";
      }

      modal.style.display = "flex";
    });
  });

  if (btnAgregarCotiz) {
    btnAgregarCotiz.addEventListener("click", () => {
      if (productoSeleccionadoActual) {
        listaCotizacion.push(productoSeleccionadoActual);
        actualizarBotonFlotanteCotizar();
        modal.style.display = "none";
      }
    });
  }

  if (btnAgregarCompra) {
    btnAgregarCompra.addEventListener("click", () => {
      if (productoSeleccionadoActual && usuarioActual) {
        const existente = listaCompras.find(item => item.nombre === productoSeleccionadoActual);
        if (existente) {
          existente.cantidad += 1;
        } else {
          listaCompras.push({ nombre: productoSeleccionadoActual, cantidad: 1 });
        }
        actualizarBotonFlotanteCompra();
        modal.style.display = "none";
      }
    });
  }

  modal.querySelector(".cerrar").addEventListener("click", () => (modal.style.display = "none"));

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
    if (e.target === document.getElementById("modal-cliente")) cerrarModalCliente();
    if (e.target === document.getElementById("modal-favoritos")) cerrarModalFavoritos();
    if (e.target === document.getElementById("modal-cotizador")) cerrarModalCotizador();
    if (e.target === document.getElementById("modal-carrito")) cerrarModalCarrito();
  });

  // 4. Categorías
  botonesCategoria.forEach((boton) => {
    boton.addEventListener("click", function () {
      botonesCategoria.forEach((b) => b.classList.remove("activa"));
      this.classList.add("activa");
      const categoria = this.getAttribute("data-categoria");
      if (inputBuscador) inputBuscador.value = "";
      productos.forEach((producto) => {
        producto.style.display = (categoria === "todos" || producto.getAttribute("data-categoria") === categoria) ? "flex" : "none";
      });
    });
  });

  // 5. BUSCADOR INSTANTÁNEO ULTRARRÁPIDO
  if (inputBuscador) {
    inputBuscador.addEventListener("input", function () {
      const texto = this.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      botonesCategoria.forEach((b) => b.classList.remove("activa"));
      
      productos.forEach((producto) => {
        const nombreProd = producto.innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        producto.style.display = nombreProd.includes(texto) ? "flex" : "none";
      });
    });
  }

  window.addEventListener("scroll", () => {
    if (btnSubir) btnSubir.style.display = window.scrollY > 300 ? "block" : "none";
  });
});

// =========================================================
// MODO OSCURO
// =========================================================
function alternarModoOscuro() {
  document.body.classList.toggle("modo-oscuro");
  const esOscuro = document.body.classList.contains("modo-oscuro");
  localStorage.setItem("ferre_modo_oscuro", esOscuro);
  const btnOscuro = document.getElementById("btn-modo-oscuro");
  if (btnOscuro) {
    btnOscuro.textContent = esOscuro ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
  }
}

// =========================================================
// NAVEGACIÓN Y SECCIONES
// =========================================================
function mostrarSeccion(seccion) {
  const secInicio = document.getElementById("inicio");
  const secProductos = document.getElementById("productos-section");
  const secUbicacion = document.getElementById("ubicacion-section");
  const secHorarios = document.getElementById("horarios-section");

  document.querySelectorAll("nav a").forEach(a => a.classList.remove("activo"));

  if (seccion === "inicio") {
    if (secInicio) secInicio.style.display = "flex";
    if (secProductos) secProductos.style.display = "block";
    if (secUbicacion) secUbicacion.style.display = "none";
    if (secHorarios) secHorarios.style.display = "none";
  } else if (seccion === "productos") {
    if (secInicio) secInicio.style.display = "none";
    if (secProductos) {
      secProductos.style.display = "block";
      secProductos.scrollIntoView({ behavior: "smooth" });
    }
    if (secUbicacion) secUbicacion.style.display = "none";
    if (secHorarios) secHorarios.style.display = "none";
  } else if (seccion === "ubicacion") {
    if (secInicio) secInicio.style.display = "none";
    if (secProductos) secProductos.style.display = "none";
    if (secUbicacion) {
      secUbicacion.style.display = "block";
      secUbicacion.scrollIntoView({ behavior: "smooth" });
    }
    if (secHorarios) secHorarios.style.display = "none";
  } else if (seccion === "horarios") {
    if (secInicio) secInicio.style.display = "none";
    if (secProductos) secProductos.style.display = "none";
    if (secUbicacion) secUbicacion.style.display = "none";
    if (secHorarios) {
      secHorarios.style.display = "block";
      secHorarios.scrollIntoView({ behavior: "smooth" });
    }
  }
}

// =========================================================
// COTIZADOR WHATSAPP
// =========================================================
function actualizarBotonFlotanteCotizar() {
  const btn = document.getElementById("btn-carrito-flotante");
  if (!btn) return;
  if (listaCotizacion.length > 0) {
    btn.style.display = "flex";
    btn.innerHTML = `📋 Cotización (${listaCotizacion.length})`;
  } else {
    btn.style.display = "none";
  }
}

function abrirModalCotizador() {
  const modal = document.getElementById("modal-cotizador");
  const contenedor = document.getElementById("lista-cotizador-modal");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  if (listaCotizacion.length === 0) {
    contenedor.innerHTML = `<p style="text-align:center; color:var(--texto-suave); padding:15px;">Tu lista está vacía.</p>`;
  } else {
    listaCotizacion.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "item-cotizador-modal";
      div.innerHTML = `
        <span>${index + 1}. ${item}</span>
        <button class="btn-mini-quitar" onclick="eliminarItemCotizacion(${index})">Eliminar</button>
      `;
      contenedor.appendChild(div);
    });
  }
  if (modal) modal.style.display = "flex";
}

function cerrarModalCotizador() {
  const modal = document.getElementById("modal-cotizador");
  if (modal) modal.style.display = "none";
}

function eliminarItemCotizacion(index) {
  listaCotizacion.splice(index, 1);
  actualizarBotonFlotanteCotizar();
  abrirModalCotizador();
}

function enviarCotizacionWhatsAppPro() {
  if (listaCotizacion.length === 0) return;

  const fechaActual = new Date().toLocaleDateString();
  const horaActual = new Date().toLocaleTimeString();
  const nombreCliente = usuarioActual ? (usuarioActual.displayName || usuarioActual.email) : "Cliente Mostrador";

  let textoItems = listaCotizacion.map((item, i) => `🔹 ${i + 1}. ${item}`).join("\n");

  const mensaje = encodeURIComponent(
    `🛠️ *FERRETERÍA HR - COTIZACIÓN* 🛠️\n\n` +
    `📅 *Fecha:* ${fechaActual} - ${horaActual}\n` +
    `👤 *Cliente:* ${nombreCliente}\n\n` +
    `📋 *Artículos solicitados:*\n${textoItems}\n\n` +
    `⚠️ *Nota:* Precios vigentes únicamente al día de hoy en mostrador.\n` +
    `✨ ¡Quedo a la espera de su confirmación o disponibilidad!`
  );

  window.open(`https://wa.me/528715238245?text=${mensaje}`, "_blank");
  
  listaCotizacion = [];
  actualizarBotonFlotanteCotizar();
  cerrarModalCotizador();
}

// =========================================================
// CARRITO DE COMPRAS / APARTAR EN MOSTRADOR
// =========================================================
function actualizarBotonFlotanteCompra() {
  const btn = document.getElementById("btn-comprar-flotante");
  if (!btn || !usuarioActual) {
    if (btn) btn.style.display = "none";
    return;
  }
  const totalItems = listaCompras.reduce((sum, item) => sum + item.cantidad, 0);
  if (totalItems > 0) {
    btn.style.display = "flex";
    btn.innerHTML = `🛒 Comprar (${totalItems})`;
  } else {
    btn.style.display = "none";
  }
}

function abrirModalCarrito() {
  if (!usuarioActual) {
    alert("Debes iniciar sesión como cliente para usar el carrito de compras.");
    abrirModalCliente();
    return;
  }
  const modal = document.getElementById("modal-carrito");
  const contenedor = document.getElementById("lista-carrito-modal");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  if (listaCompras.length === 0) {
    contenedor.innerHTML = `<p style="text-align:center; color:var(--texto-suave); padding:15px;">Tu carrito de compras está vacío.</p>`;
  } else {
    listaCompras.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "item-carrito-modal";
      div.innerHTML = `
        <span style="flex:1;">${index + 1}. ${item.nombre}</span>
        <input type="number" min="1" value="${item.cantidad}" class="input-cantidad" onchange="actualizarCantidadCompra(${index}, this.value)">
        <button class="btn-mini-quitar" onclick="eliminarItemCompra(${index})">Eliminar</button>
      `;
      contenedor.appendChild(div);
    });
  }
  if (modal) modal.style.display = "flex";
}

function cerrarModalCarrito() {
  const modal = document.getElementById("modal-carrito");
  if (modal) modal.style.display = "none";
}

function actualizarCantidadCompra(index, nuevaCantidad) {
  const cant = parseInt(nuevaCantidad);
  if (cant > 0) {
    listaCompras[index].cantidad = cant;
    actualizarBotonFlotanteCompra();
  }
}

function eliminarItemCompra(index) {
  listaCompras.splice(index, 1);
  actualizarBotonFlotanteCompra();
  abrirModalCarrito();
}

function enviarCompraWhatsApp() {
  if (listaCompras.length === 0 || !usuarioActual) return;

  const fechaActual = new Date().toLocaleDateString();
  const horaActual = new Date().toLocaleTimeString();
  const nombreCliente = usuarioActual.displayName || usuarioActual.email;

  let textoItems = listaCompras.map((item, i) => `🔹 ${i + 1}. ${item.nombre} (Cant: *${item.cantidad}*)`).join("\n");

  const mensaje = encodeURIComponent(
    `🛍️ *FERRETERÍA HR - NUEVA COMPRA / APARTADO* 🛍️\n\n` +
    `📅 *Fecha:* ${fechaActual} - ${horaActual}\n` +
    `👤 *Cliente:* ${nombreCliente}\n\n` +
    `📦 *Material solicitado:*\n${textoItems}\n\n` +
    `📍 *Aviso:* Realicé una compra y en un momento pasaré por el material a sucursal.\n` +
    `💬 ¡Quedo pendiente de su confirmación con el total a pagar!`
  );

  window.open(`https://wa.me/528715238245?text=${mensaje}`, "_blank");
  
  listaCompras = [];
  actualizarBotonFlotanteCompra();
  cerrarModalCarrito();
}

// =========================================================
// CLIENTES Y FAVORITOS
// =========================================================
function abrirModalCliente() {
  const modal = document.getElementById("modal-cliente");
  if (modal) modal.style.display = "flex";
}
function cerrarModalCliente() {
  const modal = document.getElementById("modal-cliente");
  if (modal) modal.style.display = "none";
}
function alternarModoAuth(e) {
  e.preventDefault();
  modoRegistro = !modoRegistro;
  const titulo = document.getElementById("auth-titulo");
  const grupoNom = document.getElementById("grupo-nombre");
  const btnSub = document.getElementById("btn-submit-auth");
  const txtModo = document.getElementById("texto-cambiar-modo");
  const linkModo = document.getElementById("link-cambiar-modo");

  if (modoRegistro) {
    if (titulo) titulo.textContent = "Únete como cliente";
    if (grupoNom) grupoNom.style.display = "block";
    if (btnSub) btnSub.textContent = "Crear mi cuenta gratis";
    if (txtModo) txtModo.textContent = "¿Ya tienes cuenta aquí?";
    if (linkModo) linkModo.textContent = "Inicia sesión";
  } else {
    if (titulo) titulo.textContent = "Inicia sesión";
    if (grupoNom) grupoNom.style.display = "none";
    if (btnSub) btnSub.textContent = "Entrar a mi cuenta";
    if (txtModo) txtModo.textContent = "¿Aún no tienes cuenta?";
    if (linkModo) linkModo.textContent = "Regístrate gratis";
  }
}

async function procesarAuthCliente(e) {
  e.preventDefault();
  if (typeof auth === 'undefined') { alert("Firebase pendiente de configurar."); return; }
  const nombre = document.getElementById("cliente-nombre").value.trim();
  const email = document.getElementById("cliente-email").value.trim();
  const pass = document.getElementById("cliente-pass").value;
  const errorBox = document.getElementById("auth-error");

  if (errorBox) errorBox.style.display = "none";

  try {
    if (modoRegistro) {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      if (nombre && cred.user) await cred.user.updateProfile({ displayName: nombre });
      await db.collection("clientes").doc(cred.user.uid).set({
        nombre: nombre || email.split("@")[0],
        email: email,
        favoritos: [],
        fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await auth.signInWithEmailAndPassword(email, pass);
    }
    cerrarModalCliente();
  } catch (err) {
    if (errorBox) {
      errorBox.style.display = "block";
      let mensajeError = "Ocurrió un error al procesar tu cuenta.";
      if (err.code === "auth/email-already-in-use") {
        mensajeError = "Este correo ya está registrado. Intenta iniciar sesión.";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        mensajeError = "Correo o contraseña incorrectos. Verifica tus datos.";
      } else if (err.code === "auth/weak-password") {
        mensajeError = "La contraseña debe tener al menos 6 caracteres.";
      } else if (err.code === "auth/invalid-email") {
        mensajeError = "El formato del correo electrónico no es válido.";
      }
      errorBox.textContent = mensajeError;
    }
  }
}

function cerrarSesionCliente() {
  if (typeof auth !== 'undefined') auth.signOut();
  cerrarModalCliente();
}

async function cargarFavoritosDeNube(uid) {
  try {
    const doc = await db.collection("clientes").doc(uid).get();
    if (doc.exists && doc.data().favoritos) {
      favoritosUsuario = doc.data().favoritos;
      actualizarCorazonesEnPantalla();
    }
  } catch (e) { console.error(e); }
}

function actualizarCorazonesEnPantalla() {
  document.querySelectorAll(".producto").forEach((prod) => {
    const id = prod.getAttribute("data-id");
    const btn = prod.querySelector(".btn-favorito");
    if (btn) btn.textContent = favoritosUsuario.includes(id) ? "❤️" : "🤍";
  });
  const contador = document.getElementById("contador-favoritos");
  if (contador) contador.textContent = favoritosUsuario.length;
}

async function toggleFavorito(e, prodId) {
  e.stopPropagation();
  if (!usuarioActual) {
    alert("Inicia sesión para guardar favoritos.");
    abrirModalCliente();
    return;
  }
  const index = favoritosUsuario.indexOf(prodId);
  if (index > -1) favoritosUsuario.splice(index, 1);
  else favoritosUsuario.push(prodId);

  actualizarCorazonesEnPantalla();
  await db.collection("clientes").doc(usuarioActual.uid).set({ favoritos: favoritosUsuario }, { merge: true });
}

function abrirModalFavoritos() {
  const modalFav = document.getElementById("modal-favoritos");
  const contenedor = document.getElementById("lista-favoritos-modal");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  if (favoritosUsuario.length === 0) {
    contenedor.innerHTML = `<p style="text-align:center; color:var(--texto-suave); padding:15px;">No tienes favoritos guardados.</p>`;
  } else {
    favoritosUsuario.forEach((prodId) => {
      const tarjeta = document.querySelector(`.producto[data-id="${prodId}"]`);
      if (tarjeta) {
        const nombre = tarjeta.querySelector("p").textContent.trim();
        const itemDiv = document.createElement("div");
        itemDiv.className = "item-fav-modal";
        itemDiv.innerHTML = `
          <span>${nombre}</span>
          <button class="btn-mini-quitar" onclick="quitarFavoritoDesdeModal('${prodId}')">Eliminar</button>
        `;
        contenedor.appendChild(itemDiv);
      }
    });
  }
  if (modalFav) modalFav.style.display = "flex";
}

function cerrarModalFavoritos() {
  const modalFav = document.getElementById("modal-favoritos");
  if (modalFav) modalFav.style.display = "none";
}

async function quitarFavoritoDesdeModal(prodId) {
  const index = favoritosUsuario.indexOf(prodId);
  if (index > -1) {
    favoritosUsuario.splice(index, 1);
    actualizarCorazonesEnPantalla();
    abrirModalFavoritos();
    if (usuarioActual) await db.collection("clientes").doc(usuarioActual.uid).set({ favoritos: favoritosUsuario }, { merge: true });
  }
}

function agregarTodosFavoritosACotizacion() {
  if (favoritosUsuario.length === 0) return;
  favoritosUsuario.forEach((prodId) => {
    const tarjeta = document.querySelector(`.producto[data-id="${prodId}"]`);
    if (tarjeta) {
      const nombre = tarjeta.querySelector("p").textContent.trim();
      if (!listaCotizacion.includes(nombre)) {
        listaCotizacion.push(nombre);
      }
    }
  });
  actualizarBotonFlotanteCotizar();
  cerrarModalFavoritos();
  abrirModalCotizador();
}

function agregarTodosFavoritosACompras() {
  if (!usuarioActual || favoritosUsuario.length === 0) return;
  favoritosUsuario.forEach((prodId) => {
    const tarjeta = document.querySelector(`.producto[data-id="${prodId}"]`);
    if (tarjeta) {
      const nombre = tarjeta.querySelector("p").textContent.trim();
      const existente = listaCompras.find(item => item.nombre === nombre);
      if (existente) {
        existente.cantidad += 1;
      } else {
        listaCompras.push({ nombre: nombre, cantidad: 1 });
      }
    }
  });
  actualizarBotonFlotanteCompra();
  cerrarModalFavoritos();
  abrirModalCarrito();
}

function subirArriba() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
