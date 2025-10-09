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

// ===========================
// CONEXIÓN BASE DE DATOS
// ===========================
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
// CRUD PRODUCTOS
// ===========================

// Obtener todos los productos
app.get("/api/productos", (req, res) => {
  db.query(
    `SELECT p.*, c.nombre AS categoria
     FROM producto p
     LEFT JOIN categoria c ON p.id_categoria = c.id_categoria`,
    (err, rows) => {
      if (err) {
        console.error("Error al obtener productos:", err.message);
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.json(rows);
    }
  );
});

// Crear producto
app.post("/api/productos", (req, res) => {
  const { nombre, descripcion, precio, imagen, categoria } = req.body; // <--- Cambiado id_categoria a categoria

  if (!nombre || !descripcion || !precio || !categoria) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  // Primero obtenemos el id_categoria de la palabra
  db.query(
    "SELECT id_categoria FROM categoria WHERE nombre_categoria = ?",
    [categoria],
    (err, rows) => {
      if (err) {
        console.error("Error al buscar categoría:", err.message);
        return res.status(500).json({ error: "Error en la base de datos" });
      }

      if (rows.length === 0) {
        return res.status(400).json({ error: "Categoría no válida" });
      }

      const id_categoria = rows[0].id_categoria;

      const sql =
        "INSERT INTO producto (nombre, descripcion, precio, imagen, id_categoria) VALUES (?, ?, ?, ?, ?)";
      db.query(sql, [nombre, descripcion, precio, imagen, id_categoria], err => {
        if (err) {
          console.error("Error al insertar producto:", err.message);
          return res.status(500).json({ error: "Error en la base de datos" });
        }
        res.json({ message: "Producto agregado exitosamente" });
      });
    }
  );
});

// Actualizar producto
app.put("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, imagen, id_categoria } = req.body;

  if (!nombre || !descripcion || !precio || !id_categoria) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const sql =
    "UPDATE producto SET nombre=?, descripcion=?, precio=?, imagen=?, id_categoria=? WHERE id_producto=?";
  db.query(sql, [nombre, descripcion, precio, imagen, id_categoria, id], err => {
    if (err) {
      console.error("Error al actualizar producto:", err.message);
      return res.status(500).json({ error: "Error en la base de datos" });
    }
    res.json({ message: "Producto actualizado correctamente" });
  });
});

// Eliminar producto
app.delete("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM producto WHERE id_producto=?", [id], err => {
    if (err) {
      console.error("Error al eliminar producto:", err.message);
      return res.status(500).json({ error: "Error en la base de datos" });
    }
    res.json({ message: "Producto eliminado correctamente" });
  });
});

// ===========================
// INICIO SERVIDOR
// ===========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});