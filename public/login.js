document.addEventListener("DOMContentLoaded", () => {

  const loginCliente = document.getElementById("loginCliente");
  const loginAdmin = document.getElementById("loginAdmin");
  const registerContainer = document.getElementById("registerContainer");

  // Mostrar login admin
  document.getElementById("showAdmin").onclick = () => {
    loginCliente.style.display = "none";
    loginAdmin.style.display = "block";
  };

  // Regresar a login cliente
  document.getElementById("backToCliente").onclick = () => {
    loginAdmin.style.display = "none";
    loginCliente.style.display = "block";
  };

  // Mostrar registro
  document.getElementById("showRegister").onclick = () => {
    loginCliente.style.display = "none";
    registerContainer.style.display = "block";
  };

  // Regresar a login normal
  document.getElementById("backToLogin").onclick = () => {
    registerContainer.style.display = "none";
    loginCliente.style.display = "block";
  };


  // LOGIN CLIENTE
document.getElementById("loginClienteForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("clienteUser").value.trim(); 
  const password = document.getElementById("clientePass").value.trim();

  if (!email || !password) return alert("Correo y contraseña son obligatorios");

  try {
    const resp = await fetch("/api/loginCliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });

    const data = await resp.json();
    alert(data.mensaje);

    if (resp.ok) {
      window.location.href = "index.html";
    }
  } catch (err) {
    console.error(err);
    alert("Error al conectarse con el servidor");
  }
});




  // LOGIN ADMIN
  document.getElementById("loginAdmin").addEventListener("submit", async e => {
  e.preventDefault();
  const username = document.getElementById("adminUser").value.trim();
  const password = document.getElementById("adminPass").value.trim();

  const resp = await fetch("/api/loginAdmin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include"
  });

  const data = await resp.json();

  if (resp.ok) {
    alert(`🎉 Bienvenido, ${username}!`); 
    window.location.href = "index.html";
  } else {
    alert(data.mensaje);
  }
});


  // REGISTRO CLIENTE
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("newUsername").value.trim();
  const telefono = document.getElementById("newTelefono").value.trim() || null;
  const email = document.getElementById("newEmail").value.trim() || null;
  const direccion = document.getElementById("newDireccion").value.trim() || null;
  const password = document.getElementById("newPassword").value.trim();

  if (!nombre || !password) {
    return alert("Nombre y contraseña son obligatorios");
  }

  // Validaciones
  const regexNombre = /^[A-Za-z\s]+$/;
  const regexPassword = /^[A-Za-z0-9]+$/;

  if (!regexNombre.test(nombre)) return alert("El nombre solo puede contener letras");
  if (!regexPassword.test(password)) return alert("La contraseña solo puede contener letras y números");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return alert("Correo no válido");
  if (telefono && !/^\d{7,15}$/.test(telefono)) return alert("Teléfono no válido");

  try {
    const resp = await fetch("/api/registerCliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono, email, direccion, password })
    });

    const data = await resp.json();
    alert(data.mensaje);

    if (data.ok && data.redirect) {
  window.location.href = data.redirect;
}
  } catch (err) {
    console.error(err);
    alert("Error al conectarse con el servidor");
  }
});

});
