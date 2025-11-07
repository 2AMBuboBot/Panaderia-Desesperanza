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
  port: process.env.DB_PORT,
  connectTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 30,
  queueLimit: 0
});


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


// REGISTRO DEL CLIENTE

app.post("/api/registerCliente", async (req, res) => {
  const { nombre, telefono = null, email = null, direccion = null, password } = req.body;

  if (!nombre || !password)
    return res.status(400).json({ mensaje: "Nombre y contraseña son obligatorios" });

  const username = email || nombre; // si no hay email, usa el nombre como usuario

  try {
    await promisePool.query(
  "INSERT INTO cliente (nombre, telefono, email, contraseña, direccion) VALUES (?, ?, ?, ?, ?)",
  [nombre, telefono || null, email || null, password, direccion || null]
);

    res.json({ mensaje: "Cuenta creada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al registrar el cliente" });
  }
});


// LOGIN CLIENTE
app.post("/api/loginCliente", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ mensaje: "Faltan datos" });

  try {
    const [rows] = await promisePool.query(
      "SELECT * FROM cliente WHERE email = ? AND contraseña = ?",
      [email, password]
    );

    if (rows.length === 0) return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });

    req.session.loggedIn = true;
    req.session.tipo = "cliente";
    req.session.id_cliente = rows[0].id_cliente;

    res.json({ mensaje: "Login cliente exitoso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});


// LOGIN ADMIN
app.post("/api/loginAdmin", async (req, res) => {
  const { username, password } = req.body;

  // Validación básica
  if (!username || !password) {
    return res.status(400).json({ mensaje: "Faltan datos: username o password" });
  }

  try {
    // Buscar usuario
    const [rows] = await promisePool.query(
      "SELECT * FROM usuarios WHERE username = ? AND password = ?",
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
    }

    const user = rows[0];

    // Guardar sesión
    req.session.loggedIn = true;
    req.session.tipo = "admin";
    req.session.id_admin = user.id; 

    res.json({ mensaje: "Login admin exitoso", user: { id: user.id, username: user.username } });

  } catch (err) {
    console.error("Error en loginAdmin:", err);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});


// VER SESION
app.get("/api/session", (req, res) => {
  res.json({
    loggedIn: req.session.loggedIn || false,
    tipo: req.session.tipo || null,
    id_cliente: req.session.id_cliente || null,
    id_admin: req.session.id_admin || null
  });
});

// Normalizar ID de usuario en sesión
app.use((req, res, next) => {
  if (req.session.tipo === "admin") req.session.userId = req.session.id_admin;
  if (req.session.tipo === "cliente") req.session.userId = req.session.id_cliente;
  next();
});

app.get("/api/tipo-sesion", (req, res) => {
  if (req.session.id_cliente) {
    return res.json({ tipo: "cliente" });
  }
  if (req.session.id_usuario) {
    return res.json({ tipo: "admin" });
  }
  return res.json({ tipo: "ninguna" });
});

// LOGOUT
app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ mensaje: "Error al cerrar sesión" });
    res.clearCookie("connect.sid");
    res.json({ mensaje: "Sesión cerrada" });
  });
});


// PRODUCTOS 
app.get("/api/productos", requireLogin, async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
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

const [result] = await promisePool.query(
  "INSERT INTO producto (nombre, descripcion, precio, imagen, id_categoria, user_id) VALUES (?, ?, ?, ?, ?, ?)",
  [nombre, descripcion, precio, imagen, catID, userId]
);

res.json({
  message: "✅ Producto agregado correctamente",
  id_producto: result.insertId
});
  } catch (err) {
    console.error("Error al insertar producto:", err.message);
    res.status(500).json({ error: "Error al insertar producto" });
  }
});

app.put("/api/productos/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, imagen, id_categoria } = req.body;

  // Validar id solo si es edición
  if (!id) return res.status(400).json({ error: "Producto sin identificador" });
  if (!nombre || !descripcion || !precio || !id_categoria)
      return res.status(400).json({ error: "Todos los campos son obligatorios" });

  try {
    const userId = req.session.userId;
    await promisePool.query(`
      UPDATE producto
      SET nombre=?, descripcion=?, precio=?, imagen=?, id_categoria=?
      WHERE id_producto=?
    `, [nombre, descripcion, precio, imagen, id_categoria, id]);

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
      "DELETE FROM producto WHERE id_producto=?",
      [id]
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

// Obtener carrito
app.get("/api/carrito", requireLogin, async (req, res) => {
  const id_cliente = req.session.id_cliente;

  try {
    const [rows] = await promisePool.query(`
      SELECT c.id_carrito, c.cantidad, p.nombre, p.precio, p.imagen
      FROM carrito c
      JOIN producto p ON c.id_producto = p.id_producto
      WHERE c.id_cliente = ?
    `, [id_cliente]);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error al obtener carrito:", err.message);
    res.status(500).json({ error: "Error al obtener el carrito" });
  }
});

// Agregar al carrito
app.post("/api/carrito", requireLogin, async (req, res) => {
  const { id_producto, cantidad } = req.body;
  const id_cliente = req.session.id_cliente;

  try {
    // Ver si el producto ya está en el carrito
    const [rows] = await promisePool.query(
      "SELECT * FROM carrito WHERE id_cliente = ? AND id_producto = ?",
      [id_cliente, id_producto]
    );

    if (rows.length > 0) {
      await promisePool.query(
        "UPDATE carrito SET cantidad = cantidad + ? WHERE id_cliente = ? AND id_producto = ?",
        [cantidad || 1, id_cliente, id_producto]
      );
    } else {
      await promisePool.query(
        "INSERT INTO carrito (id_cliente, id_producto, cantidad) VALUES (?, ?, ?)",
        [id_cliente, id_producto, cantidad || 1]
      );
    }

    res.json({ message: "Producto agregado al carrito 🛍️" });
  } catch (err) {
    console.error("❌ Error al agregar al carrito:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Actualizar cantidad
app.put("/api/carrito/:id_carrito", requireLogin, async (req, res) => {
  const { id_carrito } = req.params;
  const { cantidad } = req.body;
  const id_cliente = req.session.id_cliente;

  try {
    await promisePool.query(
      "UPDATE carrito SET cantidad = ? WHERE id_carrito = ? AND id_cliente = ?",
      [cantidad, id_carrito, id_cliente]
    );
    res.json({ message: "Cantidad actualizada" });
  } catch (err) {
    console.error("Error al actualizar carrito:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Eliminar del carrito
app.delete("/api/carrito/:id_carrito", requireLogin, async (req, res) => {
  const { id_carrito } = req.params;
  const id_cliente = req.session.id_cliente;

  try {
    await promisePool.query(
      "DELETE FROM carrito WHERE id_carrito = ? AND id_cliente = ?",
      [id_carrito, id_cliente]
    );
    res.json({ message: "Producto eliminado del carrito" });
  } catch (err) {
    console.error("❌ Error al eliminar producto:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

//Pagar
app.post("/api/pagar", requireLogin, async (req, res) => {
  const id_cliente = req.session.id_cliente;

  try {
    // obtener carrito
    const [items] = await promisePool.query(`
      SELECT c.id_producto, c.cantidad, p.precio
      FROM carrito c
      JOIN producto p ON c.id_producto = p.id_producto
      WHERE c.id_cliente = ?
    `, [id_cliente]);

    if (items.length === 0) {
      return res.json({ mensaje: "Tu carrito está vacío" });
    }

    // calcular total
    const total = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    // crear pedido
    const [pedido] = await promisePool.query(`
      INSERT INTO pedido (id_cliente, fecha_pedido, total, estado)
      VALUES (?, NOW(), ?, 'pendiente')
    `, [id_cliente, total]);

    const id_pedido = pedido.insertId;

    for (const item of items) {
  const subtotal = item.precio * item.cantidad;

  await promisePool.query(`
    INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
    VALUES (?, ?, ?, ?, ?)
  `, [id_pedido, item.id_producto, item.cantidad, item.precio, subtotal]);
}

    // vaciar carrito
    await promisePool.query(`DELETE FROM carrito WHERE id_cliente = ?`, [id_cliente]);

    res.json({ mensaje: "Compra realizada con éxito 🎉 Orden #" + id_pedido });

  } catch (err) {
    console.error("❌ Error al pagar:", err);
    res.status(500).json({ mensaje: "Error al procesar el pago" });
  }
});


// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

