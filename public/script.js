document.addEventListener("DOMContentLoaded", () => {
  let editando = false;
  let idEditar = null;
  const form = document.getElementById("formProducto");
  const trad = document.getElementById("productos-tradicional");
  const temp = document.getElementById("productos-temporada");
  const modalEl = document.getElementById("modalProducto");
  const btnLogout = document.getElementById("btnLogout"); 

  // Cada vez que el modal se cierre, reseteamos el formulario y el estado de edición
  modalEl.addEventListener('hidden.bs.modal', () => {
    form.reset();
    editando = false;
    idEditar = null;
    document.getElementById("id_categoria").selectedIndex = 0;
  });

  // ===============================
  // Verificar sesión primero
  // ===============================
  fetch("/api/session", { credentials: "include" })
    .then(res => res.json())
    .then(data => {
      if (!data.loggedIn) {
        window.location.href = "login.html";
      } else {
        cargarProductos();
      }
    });

  // ===============================
  // Cargar productos
  // ===============================
  function cargarProductos() {
    fetch("/api/productos", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        trad.innerHTML = "";
        temp.innerHTML = "";

        data.forEach(p => {
          const card = document.createElement("div");
          card.classList.add("producto");
          card.innerHTML = `
            <img src="${p.imagen}" alt="${p.nombre}">
            <h3>${p.nombre}</h3>
            <p>${p.descripcion}</p>
            <span class="precio">$${p.precio}</span>
            <div class="mt-2">
              <button class="btn btn-warning btn-sm btn-editar" data-id="${p.id_producto}">Editar</button>
              <button class="btn btn-danger btn-sm btn-eliminar" data-id="${p.id_producto}">Eliminar</button>
            </div>
          `;

          if (p.id_categoria == 1) trad.appendChild(card);
          else if (p.id_categoria == 2) temp.appendChild(card);
        });
      });
  }

  // ===============================
  // Click en botones editar / eliminar
  // ===============================
  document.addEventListener("click", e => {
    if (e.target.classList.contains("btn-editar")) {
      editarProducto(e.target.dataset.id);
    } else if (e.target.classList.contains("btn-eliminar")) {
      eliminarProducto(e.target.dataset.id);
    }
  });

  function editarProducto(id) {
    fetch("/api/productos", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        const p = data.find(item => item.id_producto == id);
        if (!p) return alert("Producto no encontrado");

        document.getElementById("nombre").value = p.nombre;
        document.getElementById("descripcion").value = p.descripcion;
        document.getElementById("precio").value = p.precio;
        document.getElementById("imagen").value = p.imagen;
        document.getElementById("id_categoria").value = p.id_categoria;

        editando = true;
        idEditar = id;

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      });
  }

  function eliminarProducto(id) {
    if (confirm("¿Seguro que quieres eliminar este producto?")) {
      fetch(`/api/productos/${id}`, {
        method: "DELETE",
        credentials: "include"
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Producto eliminado");
        cargarProductos();
      });
    }
  }

  // ===============================
  // Agregar o editar producto
  // ===============================
  form.addEventListener("submit", e => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const descripcion = document.getElementById("descripcion").value.trim();
    const precio = document.getElementById("precio").value;
    const imagen = document.getElementById("imagen").value;
    const id_categoria = document.getElementById("id_categoria").value;

    const regexTexto = /^[^0-9]+$/;
    if (!regexTexto.test(nombre)) { alert("El nombre no puede contener números"); return; }
    if (!regexTexto.test(descripcion)) { alert("La descripción no puede contener números"); return; }

    const producto = { nombre, descripcion, precio, imagen, id_categoria };

    if (editando) {
      fetch(`/api/productos/${idEditar}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(producto)
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Producto actualizado");
        form.reset();
        editando = false;
        idEditar = null;
        cargarProductos();
        bootstrap.Modal.getInstance(modalEl).hide();
      });
    } else {
      fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(producto)
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Producto agregado");
        form.reset();
        cargarProductos();
        bootstrap.Modal.getInstance(modalEl).hide();
      });
    }
  });

  // ===============================
  // Logout
  // ===============================
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      fetch("/api/logout", { method: "POST", credentials: "include" })
        .then(() => { window.location.href = "login.html"; });
    });
  }

});
