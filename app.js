require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


// Conexión MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Para queries con async/await
const promisePool = pool.promise();


// Sesiones
const sessionStore = new MySQLStore({}, pool);

app.use(session({
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
}));


function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "No autorizado" });
  next();
}


// LOGIN
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ mensaje: "Faltan datos" });

  try {
    const [rows] = await promisePool.query(
      "SELECT * FROM usuarios WHERE username = ? AND password = ?",
      [username, password]
    );

    if (rows.length === 0) return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });

    // Guardar sesión
    req.session.userId = rows[0].id;
    req.session.username = rows[0].username;

    res.json({ mensaje: "Inicio de sesión exitoso" });
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});


// REGISTRAR USUARIO
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ mensaje: "Faltan datos" });

  try {
    // Verificar si el usuario ya existe
    const [rows] = await promisePool.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username]
    );

    if (rows.length > 0)
      return res.status(409).json({ mensaje: "El usuario ya existe" });

    // Insertar nuevo usuario
    const [result] = await promisePool.query(
      "INSERT INTO usuarios (username, password) VALUES (?, ?)",
      [username, password]
    );

    // Crear sesión automática
    req.session.userId = result.insertId;
    req.session.username = username;

    // Devolver éxito
    res.json({ mensaje: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("Error al registrar usuario:", err);
    res.status(500).json({ mensaje: "Error al registrar usuario" });
  }
});


// CERRAR SESIÓN
app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ mensaje: "Error al cerrar sesión" });
    res.clearCookie("sid");
    res.json({ mensaje: "Sesión cerrada" });
  });
});


// VERIFICAR SESIÓN
app.get("/api/session", (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, usuario: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});


// PRODUCTOS 
app.get("/api/productos", requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
const [rows] = await promisePool.query(`
  SELECT p.*, c.nombre AS categoria
  FROM producto p
  LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
  WHERE p.user_id = ?
`, [userId]);
    res.json(rows);
  } catch (err) {
    console.error("Error al obtener productos:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/api/productos", requireLogin, async (req, res) => {
  const { nombre, descripcion, precio, imagen, id_categoria } = req.body;
  if (!nombre || !descripcion || !precio || !imagen || !id_categoria) return res.status(400).json({ error: "Todos los campos son obligatorios" });

  const catID = parseInt(id_categoria);
  try {
    const [rows] = await promisePool.query(
      "SELECT * FROM categoria WHERE id_categoria = ?",
      [catID]
    );

    if (rows.length === 0) {
      const nombreCat = catID === 1 ? "Tradicional" : "Temporada";
      await promisePool.query(
        "INSERT INTO categoria (id_categoria, nombre, descripcion) VALUES (?, ?, ?)",
        [catID, nombreCat, "Creado automáticamente desde la web"]
      );
    }

    const userId = req.session.userId;

await promisePool.query(
  "INSERT INTO producto (nombre, descripcion, precio, imagen, id_categoria, user_id) VALUES (?, ?, ?, ?, ?, ?)",
  [nombre, descripcion, precio, imagen, catID, userId]
);

    res.json({ message: "✅ Producto agregado correctamente" });
  } catch (err) {
    console.error("Error al insertar producto:", err.message);
    res.status(500).json({ error: "Error al insertar producto" });
  }
});

app.put("/api/productos/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, imagen, id_categoria } = req.body;
  if (!nombre || !descripcion || !precio || !id_categoria) return res.status(400).json({ error: "Todos los campos son obligatorios" });

  try {
    const userId = req.session.userId;
await promisePool.query(`
  UPDATE producto
  SET nombre=?, descripcion=?, precio=?, imagen=?, id_categoria=?
  WHERE id_producto=? AND user_id=?
`, [nombre, descripcion, precio, imagen, id_categoria, id, userId]);

    res.json({ message: "✅ Producto actualizado correctamente" });
  } catch (err) {
    console.error("Error al actualizar producto:", err.message);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

app.delete("/api/productos/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId; 
  try {
    const [result] = await promisePool.query(
      "DELETE FROM producto WHERE id_producto=? AND user_id=?", 
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado o no autorizado" });
    }

    res.json({ message: "🗑️ Producto eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar producto:", err.message);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});


// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

