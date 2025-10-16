document.addEventListener("DOMContentLoaded", () => {
  let editando = false;
  let idEditar = null;
  const form = document.getElementById("formProducto");
  const trad = document.getElementById("productos-tradicional");
  const temp = document.getElementById("productos-temporada");
  
  const modalEl = document.getElementById("modalProducto");

// Cada vez que el modal se cierre, reseteamos el formulario y el estado de edición
modalEl.addEventListener('hidden.bs.modal', () => {
  form.reset();
  editando = false;
  idEditar = null;
  document.getElementById("id_categoria").selectedIndex = 0; // reinicia el select
});

  function cargarProductos() {
    fetch("http://localhost:3000/api/productos")
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

  cargarProductos();
  
  document.addEventListener("click", e => {
    if (e.target.classList.contains("btn-editar")) {
      editarProducto(e.target.dataset.id);
    } else if (e.target.classList.contains("btn-eliminar")) {
      eliminarProducto(e.target.dataset.id);
    }
  });

  // ===============================
  // Funciones de edición y eliminación
  // ===============================
  function editarProducto(id) {
  fetch("http://localhost:3000/api/productos")
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

      const modal = new bootstrap.Modal(document.getElementById("modalProducto"));
      modal.show();
    });
}

  function eliminarProducto(id) {
    if (confirm("¿Seguro que quieres eliminar este producto?")) {
      fetch(`http://localhost:3000/api/productos/${id}`, { method: "DELETE" })
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


    const producto = {
      nombre: document.getElementById("nombre").value,
      descripcion: document.getElementById("descripcion").value,
      precio: document.getElementById("precio").value,
      imagen: document.getElementById("imagen").value,
      id_categoria: document.getElementById("id_categoria").value
    };

    if (editando) {
      fetch(`http://localhost:3000/api/productos/${idEditar}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(producto)
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Producto actualizado");
        form.reset();
        editando = false;
        idEditar = null;
        cargarProductos();
        bootstrap.Modal.getInstance(document.getElementById("modalProducto")).hide();
      });
    } else {
      fetch("http://localhost:3000/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(producto)
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Producto agregado");
        form.reset();
        cargarProductos();
        bootstrap.Modal.getInstance(document.getElementById("modalProducto")).hide();
      });
    }
  });

});