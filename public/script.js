const tabla = document.querySelector("#tablaProductos tbody");
const form = document.querySelector("#formProducto");
const modal = new bootstrap.Modal(document.getElementById("modalProducto"));
let editando = false;
let idEditando = null;

// Cargar productos al iniciar
async function cargarProductos() {
  const res = await fetch("/api/productos");
  const data = await res.json();
  tabla.innerHTML = "";

  data.forEach(p => {
    tabla.innerHTML += `
      <tr>
        <td><img src="${p.imagen || 'img/default.jpg'}" width="70" class="rounded"></td>
        <td>${p.nombre}</td>
        <td>${p.descripcion}</td>
        <td>${p.categoria || 'Sin categoría'}</td>
        <td>$${p.precio.toFixed(2)}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="editar(${p.id_producto})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="eliminar(${p.id_producto})">🗑️</button>
        </td>
      </tr>
    `;
  });
}

cargarProductos();

// Guardar producto
form.addEventListener("submit", async e => {
  e.preventDefault();
  const producto = {
    nombre: nombre.value.trim(),
    descripcion: descripcion.value.trim(),
    precio: parseFloat(precio.value),
    imagen: imagen.value.trim(),
    id_categoria: parseInt(id_categoria.value)
  };

  // Validación básica
  if (!producto.nombre || !producto.descripcion || !producto.precio || !producto.id_categoria) {
    alert("Todos los campos son obligatorios");
    return;
  }

  const url = editando ? `/api/productos/${idEditando}` : "/api/productos";
  const method = editando ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(producto)
  });

  if (res.status === 400) {
    const err = await res.json();
    alert("⚠️ Error: " + err.error);
    return;
  }

  if (res.status === 500) {
    alert("❌ Error interno del servidor");
    return;
  }

  modal.hide();
  form.reset();
  editando = false;
  cargarProductos();
});

// Editar
async function editar(id) {
  const res = await fetch("/api/productos");
  const data = await res.json();
  const p = data.find(x => x.id_producto === id);

  idEditando = p.id_producto;
  nombre.value = p.nombre;
  descripcion.value = p.descripcion;
  precio.value = p.precio;
  imagen.value = p.imagen;
  id_categoria.value = p.id_categoria;
  editando = true;
  modal.show();
}

// Eliminar
async function eliminar(id) {
  if (!confirm("¿Eliminar este producto?")) return;
  const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
  if (res.ok) cargarProductos();
}