require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const PDFDocument = require('pdfkit');
const bcrypt = require("bcrypt");


const app = express();
const PORT = process.env.PORT || 10000;


app.use(cors({
  origin: "https://panaderia-desesperanza-srh.onrender.com",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set('trust proxy', 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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

  try {
    // Registrar cliente
    const hash = await bcrypt.hash(password, 10);

const [result] = await promisePool.query(
  "INSERT INTO cliente (nombre, telefono, email, contraseña, direccion) VALUES (?, ?, ?, ?, ?)",
  [nombre, telefono, email, hash, direccion]
);

    const id_cliente = result.insertId;

    // 🔥 INICIAR SESIÓN AUTOMÁTICAMENTE
    req.session.loggedIn = true;
    req.session.tipo = "cliente";
    req.session.id_cliente = id_cliente;
    req.session.userId = id_cliente;

    console.log("Cliente registrado y logueado:", id_cliente);

    // 🔥 Importantísimo: responder con redirect
    return res.json({
      ok: true,
      mensaje: "Cuenta creada correctamente",
      redirect: "/index.html"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al registrar el cliente" });
  }
});



// LOGIN CLIENTE
app.post("/api/loginCliente", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  try {
    const [rows] = await promisePool.query(
      "SELECT * FROM cliente WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    const cliente = rows[0];
    const passDB = cliente.contraseña;

    let esValida = false;

    // Caso 1: ya está encriptada con bcrypt
    if (passDB.startsWith("$2")) {
      esValida = await bcrypt.compare(password, passDB);
    } 
    // Caso 2: contraseña vieja en texto plano
    else {
      if (password === passDB) {
        esValida = true;

        // 🔁 Actualizar automáticamente a bcrypt
        const nuevoHash = await bcrypt.hash(password, 10);
        await promisePool.query(
          "UPDATE cliente SET contraseña = ? WHERE id_cliente = ?",
          [nuevoHash, cliente.id_cliente]
        );
        console.log("✅ Contraseña de cliente actualizada a bcrypt");
      }
    }

    if (!esValida) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    req.session.loggedIn = true;
    req.session.tipo = "cliente";
    req.session.id_cliente = cliente.id_cliente;

    res.json({ mensaje: "Login cliente exitoso" });

  } catch (err) {
    console.error("Error loginCliente:", err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
});



// LOGIN ADMIN
app.post("/api/loginAdmin", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  try {
    const [rows] = await promisePool.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
    }

    const user = rows[0];
    const passDB = user.password;

    let esValida = false;

    // Contraseña ya en bcrypt
    if (passDB.startsWith("$2")) {
      esValida = await bcrypt.compare(password, passDB);
    } 
    // Contraseña vieja en plano
    else {
      if (password === passDB) {
        esValida = true;

        // Auto-migrar a bcrypt
        const nuevoHash = await bcrypt.hash(password, 10);
        await promisePool.query(
          "UPDATE usuarios SET password = ? WHERE id = ?",
          [nuevoHash, user.id]
        );
        console.log("✅ Contraseña admin actualizada a bcrypt");
      }
    }

    if (!esValida) {
      return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
    }

    req.session.loggedIn = true;
    req.session.tipo = "admin";
    req.session.id_admin = user.id;

    res.json({
      mensaje: "Login admin exitoso",
      user: { id: user.id, username: user.username }
    });

  } catch (err) {
    console.error("Error loginAdmin:", err);
    res.status(500).json({ mensaje: "Error del servidor" });
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
app.post('/api/pagar', requireLogin, async (req, res) => {
  const id_cliente = req.session.id_cliente;
  if (!id_cliente) return res.status(403).json({ mensaje: 'No autorizado' });

  const conn = await pool.promise().getConnection(); // usando pool creado anteriormente
  try {
    await conn.query('START TRANSACTION');

    // Obtener items del carrito
    const [items] = await conn.query(`
      SELECT c.id_producto, c.cantidad, p.precio
      FROM carrito c
      JOIN producto p ON c.id_producto = p.id_producto
      WHERE c.id_cliente = ?
    `, [id_cliente]);

    if (items.length === 0) {
      await conn.query('ROLLBACK');
      conn.release();
      return res.status(400).json({ mensaje: 'Tu carrito está vacío' });
    }

    // Calcular total
    let total = 0;
    for (const it of items) {
      total += parseFloat(it.precio) * parseInt(it.cantidad);
    }

    // Verificar saldo
    const [clienteRows] = await conn.query('SELECT saldo, nombre FROM cliente WHERE id_cliente = ? FOR UPDATE', [id_cliente]);
    if (!clienteRows.length) {
      await conn.query('ROLLBACK');
      conn.release();
      return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    }
    const saldo = parseFloat(clienteRows[0].saldo || 0);
    if (saldo < total) {
      await conn.query('ROLLBACK');
      conn.release();
      return res.status(400).json({ mensaje: 'Saldo insuficiente' });
    }

    // Insertar compra
    const [compraResult] = await conn.query(`
      INSERT INTO compra (id_cliente, fecha_compra, total)
VALUES (?, NOW(), ?)
    `, [id_cliente, total]);
    const id_compra = compraResult.insertId;

    // Insertar detalles
    for (const it of items) {
      const subtotal = parseFloat(it.precio) * parseInt(it.cantidad);
      await conn.query(`
        INSERT INTO detalle_compra (id_compra, id_producto, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `, [id_compra, it.id_producto, it.cantidad, it.precio, subtotal]);
    }

    // Descontar saldo
    await conn.query('UPDATE cliente SET saldo = saldo - ? WHERE id_cliente = ?', [total, id_cliente]);

    // Vaciar carrito
    await conn.query('DELETE FROM carrito WHERE id_cliente = ?', [id_cliente]);

    await conn.query('COMMIT');

    conn.release();

    // Generar PDF y devolver enlace para descargar
    return res.json({ mensaje: 'Compra realizada', id_compra, ticket: `/api/ticket/${id_compra}` });
  } catch (err) {
    await conn.query('ROLLBACK').catch(()=>{});
    conn.release();
    console.error('Error pagar(saldo):', err);
    res.status(500).json({ mensaje: 'Error al procesar el pago' });
  }
});

app.get("/sobre", (req, res) => {
  res.render("sobre"); 
});

app.get("/ventas", (req, res) => {
  if (req.session.tipo !== "admin") {
    return res.status(403).send("No autorizado");
  }
  res.render("ventas");
});

app.get("/api/ventas", async (req, res) => {
  if (req.session.tipo !== "admin") return res.status(403).json({ error: "No autorizado" });

  try {
    const [rows] = await promisePool.query(`
      SELECT p.nombre, SUM(dp.cantidad) AS total
      FROM detalle_compra dp
      JOIN producto p ON dp.id_producto = p.id_producto
      GROUP BY p.id_producto
      ORDER BY total DESC
    `);

    res.json({
      productos: rows.map(r => r.nombre),
      cantidades: rows.map(r => r.total)
    });

  } catch (err) {
    console.error("Error al obtener ventas:", err);
    res.status(500).json({ error: "Error en servidor" });
  }
});

app.get('/api/perfil', requireLogin, async (req, res) => {
  try {
    // Solo clientes acceden a su perfil
    const id_cliente = req.session.id_cliente;
    if (!id_cliente) return res.status(403).json({ error: 'No autorizado' });

    const [rows] = await promisePool.query('SELECT id_cliente, nombre, telefono, email, direccion, saldo FROM cliente WHERE id_cliente = ?', [id_cliente]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json(rows[0]);
  } catch (err) {
    console.error('Error /api/perfil GET:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// --- RUTA: actualizar perfil (editar datos y saldo opcionalmente) ---
app.put('/api/perfil', requireLogin, async (req, res) => {
  try {
    const id_cliente = req.session.id_cliente;
    if (!id_cliente) return res.status(403).json({ error: 'No autorizado' });

    // campos permitidos editar
    const { nombre, telefono, email, direccion } = req.body;

    await promisePool.query(
      `UPDATE cliente SET nombre=?, telefono=?, email=?, direccion=? WHERE id_cliente=?`,
      [nombre || null, telefono || null, email || null, direccion || null, id_cliente]
    );

    res.json({ mensaje: 'Perfil actualizado' });
  } catch (err) {
    console.error('Error /api/perfil PUT:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// --- RUTA: agregar fondos al saldo (no pasar límite) ---
app.post('/api/perfil/fondos', requireLogin, async (req, res) => {
  try {
    const id_cliente = req.session.id_cliente;
    const { importe } = req.body; // importe a añadir (decimal)

    if (!id_cliente) return res.status(403).json({ error: 'No autorizado' });
    const add = parseFloat(importe);
    if (isNaN(add) || add <= 0) return res.status(400).json({ error: 'Importe inválido' });

    const [rows] = await promisePool.query('SELECT saldo FROM cliente WHERE id_cliente = ?', [id_cliente]);
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });

    const current = parseFloat(rows[0].saldo || 0);
    const MAX = 999999999999.00;
    if (current + add > MAX) return res.status(400).json({ error: 'No se puede exceder el límite máximo' });

    const [r] = await promisePool.query('UPDATE cliente SET saldo = saldo + ? WHERE id_cliente = ?', [add, id_cliente]);

    res.json({ mensaje: 'Fondos agregados', nuevoSaldo: current + add });
  } catch (err) {
    console.error('Error /api/perfil/fondos:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// --- RUTA: historial de compras del cliente ---
app.get('/api/perfil/compras', requireLogin, async (req, res) => {
  try {
    const id_cliente = req.session.id_cliente;

    const [compras] = await promisePool.query(`
      SELECT c.id_compra, c.fecha_compra, c.total
      FROM compra c
      WHERE c.id_cliente = ?
      ORDER BY c.fecha_compra DESC
    `, [id_cliente]);

    res.json({ compras });

  } catch (err) {
    console.error('Error /api/perfil/compras:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});


// --- RUTA: detalles de una compra ---
app.get('/api/perfil/compras/:id', requireLogin, async (req, res) => {
  try {
    const id_cliente = req.session.id_cliente;
    const id_compra = req.params.id;
    // validar que la compra pertenezca al cliente
    const [check] = await promisePool.query('SELECT id_compra FROM compra WHERE id_compra=? AND id_cliente=?', [id_compra, id_cliente]);
    if (check.length === 0) return res.status(404).json({ error: 'Compra no encontrada' });

    const [detalles] = await promisePool.query(`
      SELECT dc.id_detalle, dc.id_producto, p.nombre, dc.cantidad, dc.precio_unitario, dc.subtotal
      FROM detalle_compra dc
      JOIN producto p ON dc.id_producto = p.id_producto
      WHERE dc.id_compra = ?
    `, [id_compra]);

    res.json({ detalles });
  } catch (err) {
    console.error('Error /api/perfil/compras/:id:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.get('/api/ticket/:id_compra', requireLogin, async (req, res) => {
  try {
    const id_compra = req.params.id_compra;
    const id_cliente = req.session.id_cliente;

    // Verificamos que la compra pertenezca al cliente
    const [check] = await promisePool.query('SELECT * FROM compra WHERE id_compra = ? AND id_cliente = ?', [id_compra, id_cliente]);
    if (check.length === 0) return res.status(404).send('No autorizado o compra no encontrada');

    const compra = check[0];

    const [detalles] = await promisePool.query(`
      SELECT dc.cantidad, dc.precio_unitario, dc.subtotal, p.nombre
      FROM detalle_compra dc
      JOIN producto p ON dc.id_producto = p.id_producto
      WHERE dc.id_compra = ?
    `, [id_compra]);

    // Generar PDF con PDFKit
const doc = new PDFDocument({ margin: 40, size: 'A4' });

// Headers para descarga
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', `attachment; filename=ticket_${id_compra}.pdf`);

// Pipe al response
doc.pipe(res);

/* ===============================
   ENCABEZADO
================================ */
doc
  .fontSize(22)
  .font('Helvetica-Bold')
  .text('Panadería La Desesperanza', { align: 'center' });

doc.moveDown(0.3);

doc
  .fontSize(10)
  .font('Helvetica-Oblique')
  .text('¡Gracias por su compra!', { align: 'center' });

doc.moveDown(1);

// Línea decorativa
doc
  .moveTo(40, doc.y)
  .lineTo(550, doc.y)
  .stroke();

/* ===============================
   INFO DE COMPRA
================================ */
doc.moveDown(1);

doc.fontSize(12).font('Helvetica-Bold').text(`Folio: ${compra.id_compra}`);
doc.moveDown(0.2);

doc
  .fontSize(12)
  .font('Helvetica')
  .text(`Fecha: ${new Date(compra.fecha_compra).toLocaleString()}`);

doc.moveDown(0.8);

// Línea decorativa
doc
  .moveTo(40, doc.y)
  .lineTo(550, doc.y)
  .stroke();

/* ===============================
   LISTA DE PRODUCTOS
================================ */
doc.moveDown(1);
doc.fontSize(14).font('Helvetica-Bold').text('Productos:');

doc.moveDown(0.5);

detalles.forEach((d) => {
  doc
    .fontSize(12)
    .font('Helvetica')
    .text(
      `${d.cantidad} × ${d.nombre}`,
      { continued: true }
    )
    .text(
      `  $${parseFloat(d.subtotal).toFixed(2)}`,
      { align: 'right' }
    );
});

doc.moveDown(0.8);

// Línea decorativa
doc
  .moveTo(40, doc.y)
  .lineTo(550, doc.y)
  .stroke();

/* ===============================
   TOTAL
================================ */
doc.moveDown(1);

doc
  .fontSize(16)
  .font('Helvetica-Bold')
  .text(
    `TOTAL: $${parseFloat(compra.total).toFixed(2)}`,
    { align: 'right' }
  );

/* ===============================
   FINALIZAR PDF
================================ */
    doc.end();
  } catch (err) {
    console.error('Error generando ticket:', err);
    res.status(500).send('Error generando ticket');
  }
});

// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

