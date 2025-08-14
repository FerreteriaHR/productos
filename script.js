function buscarProducto() {
  const input = document.getElementById("buscador").value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const productos = document.querySelectorAll(".producto");
  const categorias = document.querySelectorAll(".categoria-titulo");

  let hayCoincidencias = false;

  productos.forEach((producto) => {
    const textoProducto = producto.innerText
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (textoProducto.includes(input)) {
      producto.style.display = "block";
      hayCoincidencias = true;
    } else {
      producto.style.display = input ? "none" : "block";
    }
  });

  categorias.forEach((categoria) => {
    categoria.style.display = input ? "none" : "block";
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const productos = document.querySelectorAll(".producto");
  const modal = document.createElement("div");
  modal.id = "modal-producto";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="modal-contenido">
      <span class="cerrar">&times;</span>
      <img src="" alt="Producto ampliado" id="modal-imagen" />
      <h2 id="modal-nombre"></h2>
      <p>Para más información de este artículo, mande mensaje por WhatsApp.</p>
      <a href="https://wa.me/528715820989" class="btn-whatsapp" target="_blank">Contactar por WhatsApp</a>
    </div>
  `;
  document.body.appendChild(modal);

  const cerrarBtn = modal.querySelector(".cerrar");
  const modalImg = modal.querySelector("#modal-imagen");
  const modalNombre = modal.querySelector("#modal-nombre");

  productos.forEach(producto => {
    producto.addEventListener("click", () => {
      const img = producto.querySelector("img");
      const nombre = producto.querySelector("p");

      modalImg.src = img.src;
      modalNombre.textContent = nombre.textContent;
      modal.style.display = "flex";
    });
  });

  cerrarBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", e => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const productos = document.querySelectorAll(".producto");

  // Ocultar todos los productos al cargar la página
  productos.forEach(function (producto) {
    producto.style.display = "none";
  });

  const botones = document.querySelectorAll(".boton-categoria");

  botones.forEach(function (boton) {
    boton.addEventListener("click", function () {
      const categoria = this.getAttribute("data-categoria");

      productos.forEach(function (producto) {
        if (producto.getAttribute("data-categoria") === categoria) {
          producto.style.display = "block";
        } else {
          producto.style.display = "none";
        }
      });
    });
  });

  // Ocultar productos al hacer clic en los botones de navegación
  const secciones = document.querySelectorAll("nav a");

  secciones.forEach(function (enlace) {
    enlace.addEventListener("click", function () {
      productos.forEach(function (producto) {
        producto.style.display = "none";
      });
    });
  });
});
