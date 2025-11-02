require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// ==============================
// Middleware
// ==============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Conexión a MySQL
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "n0m3l0",
  database: "panaderia",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.connect(err => {
  if (err) {
    console.error("❌ Error al conectar con la base de datos:", err.message);
  } else {
    console.log("✅ Conectado a la base de datos panaderia");
  }
});

const sessionStore = new MySQLStore({}, pool);

app.use(
  session({
    key: "sid",
    secret: "panaderiaSecret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hora
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    }
  })
);

app.get("/", (req, res) => {
  if (req.session.userId) {
    // Si ya inició sesión, muestra el index de la panadería
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    // Si no ha iniciado sesión, muestra el login
    res.sendFile(path.join(__dirname, "public", "login.html"));
  }
});

// ==============================
// LOGIN
// ==============================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ mensaje: "Faltan datos" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE username = ? AND password = ?",
      [username, password]
    );

    if (rows.length === 0)
      return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });

    req.session.userId = rows[0].id;
    req.session.username = rows[0].username;
    res.json({ mensaje: "Inicio de sesión exitoso" });
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

// ==============================
// CERRAR SESIÓN
// ==============================
app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ mensaje: "Error al cerrar sesión" });
    res.clearCookie("sid");
    res.json({ mensaje: "Sesión cerrada" });
  });
});

// ==============================
// VERIFICAR SESIÓN
// ==============================
app.get("/api/session", (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, usuario: req.session.username });
  } else {
    res.json({ loggedIn: false });
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