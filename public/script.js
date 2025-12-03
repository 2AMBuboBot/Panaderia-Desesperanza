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


  // Verificar sesión primero
  fetch("/api/session", { credentials: "include" })
    .then(res => res.json())
    .then(data => {
      if (!data.loggedIn) {
        window.location.href = "login.html";
        return;
      }

      // Guardar tipo de usuario
      window.userType = data.tipo;

      const menuVentas = document.getElementById("menuVentas");
if (menuVentas && window.userType === "admin") {
  menuVentas.style.display = "block";
}

      // Si es cliente → ocultar botón de agregar producto
if (window.userType === "cliente") {
  const btnAdd = document.querySelector(".btn-añadir");
  if (btnAdd) btnAdd.style.display = "none";
}

// Si es admin → ocultar botón ver carrito
if (window.userType === "admin") {
  const btnCarrito = document.getElementById("btnCarrito");
  if (btnCarrito) btnCarrito.style.display = "none";
}

      cargarProductos();
    });


  // Cargar productos
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
              <button class="btn btn-success btn-sm btn-agregar" data-id="${p.id_producto}">Agregar 🛒</button>
              <button class="btn btn-warning btn-sm btn-editar" data-id="${p.id_producto}">Editar</button>
              <button class="btn btn-danger btn-sm btn-eliminar" data-id="${p.id_producto}">Eliminar</button>
            </div>
          `;

          
          if (window.userType === "cliente") {
  // cliente → no puede editar/eliminar
  card.querySelector(".btn-editar").style.display = "none";
  card.querySelector(".btn-eliminar").style.display = "none";
} else if (window.userType === "admin") {
  // admin → NO puede agregar al carrito
  card.querySelector(".btn-agregar").style.display = "none";
}

          if (p.id_categoria == 1) trad.appendChild(card);
          else if (p.id_categoria == 2) temp.appendChild(card);
        });
      });
  }


  // Agregar al carrito (sin tocar tu lógica original)
  document.addEventListener("click", e => {
    if (e.target.classList.contains("btn-agregar")) {
      e.stopPropagation();
      const id = e.target.dataset.id;

      if (!id) {
        console.error("❌ No se encontró el ID del producto al agregar al carrito");
        alert("Error: producto sin identificador");
        return;
      }

      fetch("/api/carrito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id_producto: id, cantidad: 1 })
      })
        .then(res => {
          if (!res.ok) throw new Error("Error al agregar al carrito");
          return res.json();
        })
        .then(data => alert(data.message || "Agregado al carrito 🛒"))
        .catch(err => console.error("Error al agregar al carrito:", err));
    }
  });


  // Click en botones editar / eliminar
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


  // Agregar o editar producto 
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const descripcion = document.getElementById("descripcion").value.trim();
    const precio = parseFloat(document.getElementById("precio").value);
    const imagen = document.getElementById("imagen").value.trim();
    const id_categoria = parseInt(document.getElementById("id_categoria").value);

    const regexTexto = /^[^0-9]+$/;

    if (!regexTexto.test(nombre)) return alert("El nombre no puede contener números");
    if (!regexTexto.test(descripcion)) return alert("La descripción no puede contener números");
    if (isNaN(precio) || precio <= 0) return alert("El precio debe ser un número mayor que 0");

    const producto = { nombre, descripcion, precio, imagen, id_categoria };

    try {
      if (editando) {
        if (!idEditar) return alert("Error: producto sin identificador");

        const res = await fetch(`/api/productos/${idEditar}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(producto)
        });
        const data = await res.json();
        alert(data.message || "Producto actualizado");

        editando = false;
        idEditar = null;
      } else {
        const res = await fetch("/api/productos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(producto)
        });
        const data = await res.json();
        alert(data.message || "Producto agregado");
      }

      form.reset();
      document.getElementById("id_categoria").selectedIndex = 0;

      cargarProductos();
      bootstrap.Modal.getInstance(modalEl).hide();

    } catch (err) {
      console.error("Error al guardar producto:", err);
      alert("Error de conexión con el servidor");
    }
  });


  // Logout
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      fetch("/api/logout", { method: "POST", credentials: "include" })
        .then(res => res.json())
        .then(data => {
          alert(data.mensaje || "Sesión cerrada con éxito");
          window.location.href = "login.html";
        })
        .catch(err => {
          console.error("Error al cerrar sesión:", err);
          alert("No se pudo cerrar la sesión");
        });
    });
  }

});

