let listaCotizacion = [];

document.addEventListener("DOMContentLoaded", function () {
  const productos = document.querySelectorAll(".producto");
  const botonesCategoria = document.querySelectorAll(".boton-categoria");
  const inputBuscador = document.getElementById("buscador");
  const btnSubir = document.getElementById("btnSubir");

  // 1. Estructurar visualmente cada tarjeta de producto automáticamente
  productos.forEach((prod) => {
    const img = prod.querySelector("img");
    const nombre = prod.querySelector("p");
    const cat = prod.getAttribute("data-categoria") || "";

    if (img && nombre) {
      prod.innerHTML = `
        <div class="producto-img-wrap">
          <img src="${img.getAttribute("src")}" alt="${img.getAttribute("alt")}" loading="lazy">
        </div>
        <div class="producto-info">
          <span class="producto-tag">${cat}</span>
          <p>${nombre.textContent}</p>
        </div>
      `;
    }
  });

  // 2. Crear Modal de Producto Ampliado
  const modal = document.createElement("div");
  modal.id = "modal-producto";
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
    producto.addEventListener("click", () => {
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

  modal.querySelector(".cerrar").addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // 3. Filtro por Categorías
  botonesCategoria.forEach((boton) => {
    boton.addEventListener("click", function () {
      botonesCategoria.forEach((b) => b.classList.remove("activa"));
      this.classList.add("activa");

      const categoria = this.getAttribute("data-categoria");
      if (inputBuscador) inputBuscador.value = "";

      productos.forEach((producto) => {
        if (categoria === "todos" || producto.getAttribute("data-categoria") === categoria) {
          producto.style.display = "flex";
        } else {
          producto.style.display = "none";
        }
      });
    });
  });

  // 4. Buscador en tiempo real
  if (inputBuscador) {
    inputBuscador.addEventListener("input", function () {
      const texto = this.value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      botonesCategoria.forEach((b) => b.classList.remove("activa"));

      productos.forEach((producto) => {
        const nombreProd = producto.innerText
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        producto.style.display = nombreProd.includes(texto) ? "flex" : "none";
      });
    });
  }

  // 5. Botón subir
  window.addEventListener("scroll", () => {
    if (btnSubir) {
      btnSubir.style.display = window.scrollY > 300 ? "block" : "none";
    }
  });
});

function mostrarSeccion(seccion) {
  const secInicio = document.getElementById("inicio");
  const secProductos = document.getElementById("productos-section");
  const secContacto = document.getElementById("contacto-section");

  document.querySelectorAll("nav a").forEach((a) => a.classList.remove("activo"));

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
