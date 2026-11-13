// =========================================================
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYdFpAvLpJspfe9WhugCbSqUDnFIjHRXc",
  authDomain: "ferreteria-hr.firebaseapp.com",
  projectId: "ferreteria-hr",
  storageBucket: "ferreteria-hr.firebasestorage.app",
  messagingSenderId: "1091084861026",
  appId: "1:1091084861026:web:f9816ad4c8235c39245b3b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// ========================================================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let listaCotizacion = [];
let usuarioActual = null;
let favoritosUsuario = [];
let modoRegistro = true;

document.addEventListener("DOMContentLoaded", function () {
  const productos = document.querySelectorAll(".producto");
  const botonesCategoria = document.querySelectorAll(".boton-categoria");
  const inputBuscador = document.getElementById("buscador");
  const btnSubir = document.getElementById("btnSubir");

  // 1. Estructurar tarjetas con botón de favorito
  productos.forEach((prod, index) => {
    const img = prod.querySelector("img");
    const nombre = prod.querySelector("p");
    const cat = prod.getAttribute("data-categoria") || "";

    if (img && nombre) {
      const nombreTexto = nombre.textContent.trim();
      const prodId = "prod_" + index + "_" + nombreTexto.toLowerCase().replace(/[^a-z0-9]/g, "");
      prod.setAttribute("data-id", prodId);

      prod.innerHTML = `
        <button class="btn-favorito" title="Guardar en favoritos" onclick="toggleFavorito(event, '${prodId}', '${nombreTexto.replace(/'/g, "\\'")}')">🤍</button>
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

  // 2. Control de sesión del cliente
  auth.onAuthStateChanged(async (user) => {
    usuarioActual = user;
    const btnHeader = document.getElementById("btn-abrir-auth");
    const btnFavFlotante = document.getElementById("btn-favoritos-flotante");
    const botonesCorazon = document.querySelectorAll(".btn-favorito");

    if (user) {
      const nombreMostrar = user.displayName || user.email.split("@")[0];
      btnHeader.textContent = `👤 ${nombreMostrar}`;
      btnHeader.classList.add("btn-cliente-logueado");

      document.getElementById("vista-auth-formulario").style.display = "none";
      document.getElementById("vista-auth-perfil").style.display = "block";
      document.getElementById("perfil-nombre-usuario").textContent = nombreMostrar;
      document.getElementById("perfil-correo-usuario").textContent = user.email;

      if (btnFavFlotante) btnFavFlotante.style.display = "flex";
      botonesCorazon.forEach((btn) => (btn.style.display = "flex"));

      await cargarFavoritosDeNube(user.uid);
    } else {
      favoritosUsuario = [];
      btnHeader.textContent = "✨ Únete como cliente";
      btnHeader.classList.remove("btn-cliente-logueado");

      document.getElementById("vista-auth-formulario").style.display = "block";
      document.getElementById("vista-auth-perfil").style.display = "none";

      if (btnFavFlotante) btnFavFlotante.style.display = "none";
      botonesCorazon.forEach((btn) => {
        btn.style.display = "none";
        btn.textContent = "🤍";
      });
      actualizarCorazonesEnPantalla();
    }
  });

  // 3. Modal de Producto Ampliado
  const modal = document.createElement("div");
  modal.id = "modal-producto";
  modal.className = "modal-overlay";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="modal-contenido">
      <span class="cerrar">&times;</span>
      <img src="" alt="Producto ampliado" id="modal-imagen" />
      <h2 id="modal-nombre" style="margin-bottom:8px; font-size:1.3rem;"></h2>
      <p style="color:#666; font-size:0.95rem;">Consulta disponibilidad y precio al momento por WhatsApp o agrégalo a tu lista.</p>
      <div class="modal-acciones">
        <button id="btn-agregar-lista" class="btn-cotizar-add">+ Agregar a mi lista de cotización</button>
        <a id="modal-wa-directo" href="#" class="btn-social btn-whatsapp" style="justify-content:center;" target="_blank">Preguntar solo por este artículo</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalImg = document.getElementById("modal-imagen");
  const modalNombre = document.getElementById("modal-nombre");
  const modalWaDirecto = document.getElementById("modal-wa-directo");
  const btnAgregarLista = document.getElementById("btn-agregar-lista");
  let productoSeleccionadoActual = "";

  productos.forEach((producto) => {
    producto.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-favorito")) return;

      const img = producto.querySelector("img");
      const nombre = producto.querySelector("p").textContent.trim();
      productoSeleccionadoActual = nombre;

      modalImg.src = img.src;
      modalNombre.textContent = nombre;
      const textoWa = encodeURIComponent(`Hola Ferretería HR, me interesa cotizar: *${nombre}*`);
      modalWaDirecto.href = `https://wa.me/528715238245?text=${textoWa}`;
      modal.style.display = "flex";
    });
  });

  btnAgregarLista.addEventListener("click", () => {
    if (productoSeleccionadoActual) {
      listaCotizacion.push(productoSeleccionadoActual);
      actualizarBotonFlotante();
      modal.style.display = "none";
    }
  });

  modal.querySelector(".cerrar").addEventListener("click", () => (modal.style.display = "none"));

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
    if (e.target === document.getElementById("modal-cliente")) cerrarModalCliente();
    if (e.target === document.getElementById("modal-favoritos")) cerrarModalFavoritos();
  });

  // 4. Categorías
  botonesCategoria.forEach((boton) => {
    boton.addEventListener("click", function () {
      botonesCategoria.forEach((b) => b.classList.remove("activa"));
      this.classList.add("activa");

      const categoria = this.getAttribute("data-categoria");
      if (inputBuscador) inputBuscador.value = "";

      productos.forEach((producto) => {
        if (categoria === "todos") {
          producto.style.display = "flex";
        } else {
          producto.style.display = producto.getAttribute("data-categoria") === categoria ? "flex" : "none";
        }
      });
    });
  });

  // 5. Buscador
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
// FUNCIONES DE CLIENTES Y FAVORITOS
// =========================================================
function abrirModalCliente() {
  document.getElementById("modal-cliente").style.display = "flex";
}

function cerrarModalCliente() {
  document.getElementById("modal-cliente").style.display = "none";
  document.getElementById("auth-error").style.display = "none";
}

function alternarModoAuth(e) {
  e.preventDefault();
  modoRegistro = !modoRegistro;
  document.getElementById("auth-error").style.display = "none";

  if (modoRegistro) {
    document.getElementById("auth-titulo").textContent = "Únete como cliente";
    document.getElementById("grupo-nombre").style.display = "block";
    document.getElementById("btn-submit-auth").textContent = "Crear mi cuenta gratis";
    document.getElementById("texto-cambiar-modo").textContent = "¿Ya tienes cuenta aquí?";
    document.getElementById("link-cambiar-modo").textContent = "Inicia sesión";
  } else {
    document.getElementById("auth-titulo").textContent = "Inicia sesión";
    document.getElementById("grupo-nombre").style.display = "none";
    document.getElementById("btn-submit-auth").textContent = "Entrar a mi cuenta";
    document.getElementById("texto-cambiar-modo").textContent = "¿Aún no tienes cuenta?";
    document.getElementById("link-cambiar-modo").textContent = "Regístrate gratis";
  }
}

async function procesarAuthCliente(e) {
  e.preventDefault();
  const nombre = document.getElementById("cliente-nombre").value.trim();
  const email = document.getElementById("cliente-email").value.trim();
  const pass = document.getElementById("cliente-pass").value;
  const aceptaNotif = document.getElementById("cliente-notificaciones").checked;
  const errorBox = document.getElementById("auth-error");

  errorBox.style.display = "none";

  try {
    if (modoRegistro) {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      if (nombre) {
        await cred.user.updateProfile({ displayName: nombre });
      }
      await db.collection("clientes").doc(cred.user.uid).set({
        nombre: nombre || email.split("@")[0],
        email: email,
        recibirPromociones: aceptaNotif,
        favoritos: [],
        fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await auth.signInWithEmailAndPassword(email, pass);
    }
    cerrarModalCliente();
  } catch (err) {
    errorBox.style.display = "block";
    if (err.code === "auth/email-already-in-use") {
      errorBox.textContent = "Este correo ya está registrado. Inicia sesión.";
    } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      errorBox.textContent = "Correo o contraseña incorrectos.";
    } else if (err.code === "auth/weak-password") {
      errorBox.textContent = "La contraseña debe tener al menos 6 caracteres.";
    } else {
      errorBox.textContent = "Error: " + err.message;
    }
  }
}

function cerrarSesionCliente() {
  auth.signOut();
  cerrarModalCliente();
}

async function cargarFavoritosDeNube(uid) {
  try {
    const doc = await db.collection("clientes").doc(uid).get();
    if (doc.exists && doc.data().favoritos) {
      favoritosUsuario = doc.data().favoritos;
      actualizarCorazonesEnPantalla();
    }
  } catch (e) {
    console.error("Error al cargar favoritos:", e);
  }
}

function actualizarCorazonesEnPantalla() {
  document.querySelectorAll(".producto").forEach((prod) => {
    const id = prod.getAttribute("data-id");
    const btn = prod.querySelector(".btn-favorito");
    if (btn) {
      btn.textContent = favoritosUsuario.includes(id) ? "❤️" : "🤍";
    }
  });

  const contador = document.getElementById("contador-favoritos");
  if (contador) {
    contador.textContent = favoritosUsuario.length;
  }
}

async function toggleFavorito(e, prodId, nombreProd) {
  e.stopPropagation();
  if (!usuarioActual) return;

  const index = favoritosUsuario.indexOf(prodId);
  if (index > -1) {
    favoritosUsuario.splice(index, 1);
  } else {
    favoritosUsuario.push(prodId);
  }

  actualizarCorazonesEnPantalla();

  await db.collection("clientes").doc(usuarioActual.uid).set(
    { favoritos: favoritosUsuario },
    { merge: true }
  );
}

function abrirModalFavoritos() {
  const modalFav = document.getElementById("modal-favoritos");
  const contenedor = document.getElementById("lista-favoritos-modal");
  contenedor.innerHTML = "";

  if (favoritosUsuario.length === 0) {
    contenedor.innerHTML = `<p style="text-align:center; color:#888; padding:20px 0;">Aún no tienes favoritos guardados. Toca el corazón 🤍 en cualquier producto.</p>`;
  } else {
    favoritosUsuario.forEach((prodId) => {
      const tarjeta = document.querySelector(`.producto[data-id="${prodId}"]`);
      if (tarjeta) {
        const nombre = tarjeta.querySelector("p").textContent.trim();
        const itemDiv = document.createElement("div");
        itemDiv.className = "item-fav-modal";
        itemDiv.innerHTML = `
          <span>${nombre}</span>
          <div class="item-fav-acciones">
            <button class="btn-mini-cotizar" onclick="agregarFavoritoACotizacion('${nombre.replace(/'/g, "\\'")}')">+ Cotizar</button>
            <button class="btn-mini-quitar" title="Quitar" onclick="quitarFavoritoDesdeModal('${prodId}')">✕</button>
          </div>
        `;
        contenedor.appendChild(itemDiv);
      }
    });
  }

  modalFav.style.display = "flex";
}

function cerrarModalFavoritos() {
  document.getElementById("modal-favoritos").style.display = "none";
}

function agregarFavoritoACotizacion(nombre) {
  listaCotizacion.push(nombre);
  actualizarBotonFlotante();
  cerrarModalFavoritos();
}

async function quitarFavoritoDesdeModal(prodId) {
  const index = favoritosUsuario.indexOf(prodId);
  if (index > -1) {
    favoritosUsuario.splice(index, 1);
    actualizarCorazonesEnPantalla();
    abrirModalFavoritos();
    if (usuarioActual) {
      await db.collection("clientes").doc(usuarioActual.uid).set(
        { favoritos: favoritosUsuario },
        { merge: true }
      );
    }
  }
}

// =========================================================
// NAVEGACIÓN Y COTIZADOR
// =========================================================
function mostrarSeccion(seccion) {
  const secInicio = document.getElementById("inicio");
  const secProductos = document.getElementById("productos-section");
  const secContacto = document.getElementById("contacto-section");

  if (seccion === "inicio") {
    secInicio.style.display = "flex";
    secProductos.style.display = "block";
    if (secContacto) secContacto.style.display = "none";
  } else if (seccion === "productos") {
    secInicio.style.display = "none";
    secProductos.style.display = "block";
    if (secContacto) secContacto.style.display = "none";
    secProductos.scrollIntoView({ behavior: "smooth" });
  } else if (seccion === "contacto") {
    secInicio.style.display = "none";
    secProductos.style.display = "none";
    if (secContacto) secContacto.style.display = "block";
  }
}

function actualizarBotonFlotante() {
  const btn = document.getElementById("btn-carrito-flotante");
  if (!btn) return;
  if (listaCotizacion.length > 0) {
    btn.style.display = "flex";
    btn.innerHTML = `📋 Cotizar lista (${listaCotizacion.length})`;
  } else {
    btn.style.display = "none";
  }
}

function enviarCotizacionWhatsApp() {
  if (listaCotizacion.length === 0) return;
  const itemsTexto = listaCotizacion.map((item, i) => `${i + 1}. ${item}`).join("\n");
  const mensaje = encodeURIComponent(
    `Hola Ferretería HR, me gustaría cotizar los siguientes artículos:\n\n${itemsTexto}`
  );
  window.open(`https://wa.me/528715238245?text=${mensaje}`, "_blank");
}

function subirArriba() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
