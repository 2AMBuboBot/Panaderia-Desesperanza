const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Conexión a MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "n0m3l0",
  database: "panaderia"
});

db.connect(err => {
  if (err) {
    console.error("❌ Error al conectar con la base de datos:", err.message);
  } else {
    console.log("✅ Conectado a la base de datos panaderia");
  }
});

// ===========================
// Obtener todos los productos
// ===========================
app.get("/api/productos", (req, res) => {
  const sql = `
    SELECT p.*, c.nombre AS categoria
    FROM producto p
    LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Error al obtener productos:", err.message);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
    res.json(rows);
  });
});

// ===========================
// Crear nuevo producto
// ===========================
app.post("/api/productos", (req, res) => {
  const { nombre, descripcion, precio, imagen, id_categoria } = req.body;

  if (!nombre || !descripcion || !precio || !imagen || !id_categoria) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  // Convertimos id_categoria a número (por si viene como string)
  const catID = parseInt(id_categoria);

  // Primero revisamos si la categoría existe
  db.query("SELECT * FROM categoria WHERE id_categoria = ?", [catID], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error en la base de datos" });

    if (rows.length === 0) {
      // Si no existe, la creamos con un nombre genérico
      const nombreCat = catID === 1 ? "Tradicional" : "Temporada";
      db.query("INSERT INTO categoria (id_categoria, nombre, descripcion) VALUES (?, ?, ?)", [catID, nombreCat, "Creado automáticamente desde la web"], (err2) => {
        if (err2) return res.status(500).json({ error: "Error al crear categoría" });
        insertarProducto(catID);
      });
    } else {
      // Si existe, insertamos directamente
      insertarProducto(catID);
    }
  });

  function insertarProducto(catID) {
    const sql = "INSERT INTO producto (nombre, descripcion, precio, imagen, id_categoria) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [nombre, descripcion, precio, imagen, catID], (err) => {
      if (err) {
        console.error("Error al insertar producto:", err.message);
        return res.status(500).json({ error: "Error al insertar producto" });
      }
      res.json({ message: "✅ Producto agregado correctamente" });
    });
  }
});

// ===========================
// Actualizar producto
// ===========================
app.put("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, imagen, id_categoria } = req.body;

  if (!nombre || !descripcion || !precio || !id_categoria) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const sql = `
    UPDATE producto
    SET nombre=?, descripcion=?, precio=?, imagen=?, id_categoria=?
    WHERE id_producto=?
  `;
  db.query(sql, [nombre, descripcion, precio, imagen, id_categoria, id], err => {
    if (err) {
      console.error("Error al actualizar producto:", err.message);
      return res.status(500).json({ error: "Error en la base de datos" });
    }
    res.json({ message: "✅ Producto actualizado correctamente" });
  });
});

// ===========================
// Eliminar producto
// ===========================
app.delete("/api/productos/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM producto WHERE id_producto=?", [id], err => {
    if (err) {
      console.error("Error al eliminar producto:", err.message);
      return res.status(500).json({ error: "Error en la base de datos" });
    }
    res.json({ message: "🗑️ Producto eliminado correctamente" });
  });
});

// ===========================
// Iniciar servidor
// ===========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});