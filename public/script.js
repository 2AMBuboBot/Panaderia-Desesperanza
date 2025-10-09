document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formProducto");
  const tabla = document.querySelector("#tablaProductos tbody");

  // Mostrar productos
  function cargarProductos() {
    fetch("http://localhost:3000/api/productos")
      .then(res => res.json())
      .then(data => {
        tabla.innerHTML = "";
        data.forEach(p => {
          tabla.innerHTML += `
            <tr>
              <td><img src="${p.imagen}" alt="${p.nombre}" width="80"></td>
              <td>${p.nombre}</td>
              <td>${p.descripcion}</td>
              <td>${p.categoria || "Sin categoría"}</td>
              <td>$${p.precio}</td>
              <td>
                <button class="btn btn-warning btn-sm" onclick="editarProducto(${p.id_producto})">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${p.id_producto})">Eliminar</button>
              </td>
            </tr>`;
        });
      });
  }

  cargarProductos();

  // Agregar producto
  form.addEventListener("submit", e => {
    e.preventDefault();

    const nuevoProducto = {
      nombre: document.getElementById("nombre").value,
      descripcion: document.getElementById("descripcion").value,
      precio: document.getElementById("precio").value,
      imagen: document.getElementById("imagen").value,
      id_categoria: document.getElementById("id_categoria").value
    };

    console.log("📦 Enviando:", nuevoProducto); // 👈 te ayuda a verificar en consola

    fetch("http://localhost:3000/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoProducto)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert("⚠️ " + data.error);
        } else {
          alert("✅ Producto agregado correctamente");
          form.reset();
          cargarProductos();
          bootstrap.Modal.getInstance(document.getElementById("modalProducto")).hide();
        }
      })
      .catch(err => console.error("Error:", err));
  });
});

// Función global para eliminar
function eliminarProducto(id) {
  if (confirm("¿Seguro que quieres eliminar este producto?")) {
    fetch(`http://localhost:3000/api/productos/${id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        location.reload();
      });
  }
}