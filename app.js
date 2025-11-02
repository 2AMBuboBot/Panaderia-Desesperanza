require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// Middleware
// ==============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// Conexión a MySQL (Promise)
// ==============================
let pool;
(async () => {
  try {
    pool = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log("✅ Conectado a la base de datos", process.env.DB_NAME);
  } catch (err) {
    console.error("❌ Error al conectar con la base de datos:", err.message);
  }
})();

// ==============================
// Sesiones con MySQLStore
// ==============================
const sessionStore = new MySQLStore(
  {
    expiration: 1000 * 60 * 60, // 1 hora
    createDatabaseTable: true,
  },
  {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  }
);

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
      sameSite: "lax",
    },
  })
);

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
      return res
        .status(401)
        .json({ mensaje: "Usuario o contraseña incorrectos" });

    req.session.userId = rows[0].id;
    req.session.username = rows[0].username;
    res.json({ mensaje: "Inicio de sesión exitoso" });
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

// ===========================
// Registrar usuario nuevo
// ===========================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ mensaje: "Faltan datos" });

  try {
    // Verificar si ya existe el usuario
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username]
    );

    if (rows.length > 0)
      return res.status(409).json({ mensaje: "El usuario ya existe" });

    // Registrar nuevo usuario
    await pool.query("INSERT INTO usuarios (username, password) VALUES (?, ?)", [
      username,
      password,
    ]);

    res.json({ mensaje: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("Error al registrar usuario:", err.message);
    res.status(500).json({ mensaje: "Error al registrar usuario" });
  }
});

// ==============================
// CERRAR SESIÓN
// ==============================
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
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
app.get("/api/productos", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.nombre AS categoria
      FROM producto p
      LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error al obtener productos:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ===========================
// Crear nuevo producto
// ===========================
app.post("/api/productos", async (req, res) => {
  const { nombre, descripcion, precio, imagen, id_categoria } = req.body;

  if (!nombre || !descripcion || !precio || !imagen || !id_categoria) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const catID = parseInt(id_categoria);

  try {
    const [rows] = await pool.query(
      "SELECT * FROM categoria WHERE id_categoria = ?",
      [catID]
    );

    if (rows.length === 0) {
      const nombreCat = catID === 1 ? "Tradicional" : "Temporada";
      await pool.query(
        "INSERT INTO categoria (id_categoria, nombre, descripcion) VALUES (?, ?, ?)",
        [catID, nombreCat, "Creado automáticamente desde la web"]
      );
    }

    await pool.query(
      "INSERT INTO producto (nombre, descripcion, precio, imagen, id_categoria) VALUES (?, ?, ?, ?, ?)",
      [nombre, descripcion, precio, imagen, catID]
    );

    res.json({ message: "✅ Producto agregado correctamente" });
  } catch (err) {
    console.error("Error al insertar producto:", err.message);
    res.status(500).json({ error: "Error al insertar producto" });
  }
});

// ===========================
// Actualizar producto
// ===========================
app.put("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, imagen, id_categoria } = req.body;

  if (!nombre || !descripcion || !precio || !id_categoria) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    await pool.query(
      `
      UPDATE producto
      SET nombre=?, descripcion=?, precio=?, imagen=?, id_categoria=?
      WHERE id_producto=?
    `,
      [nombre, descripcion, precio, imagen, id_categoria, id]
    );

    res.json({ message: "✅ Producto actualizado correctamente" });
  } catch (err) {
    console.error("Error al actualizar producto:", err.message);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// ===========================
// Eliminar producto
// ===========================
app.delete("/api/productos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM producto WHERE id_producto=?", [id]);
    res.json({ message: "🗑️ Producto eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar producto:", err.message);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// ===========================
// Iniciar servidor
// ===========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
