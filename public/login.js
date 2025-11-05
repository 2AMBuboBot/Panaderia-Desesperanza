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
document.getElementById("loginCliente").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const resp = await fetch("/api/loginCliente", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include"
  });

  const data = await resp.json();

  if (resp.ok) {
    alert(`🎉 Bienvenido, ${username}!`);  // <-- bienvenida
    window.location.href = "index.html";
  } else {
    alert(data.mensaje);
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
    alert(`🎉 Bienvenido, ${username}!`);  // <-- bienvenida
    window.location.href = "index.html";
  } else {
    alert(data.mensaje);
  }
});


  // REGISTRO CLIENTE
const registerForm = document.getElementById("registerCliente");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = newUsername.value.trim();
    const telefono = newTelefono.value.trim();
    const email = newEmail.value.trim();
    const direccion = newDireccion.value.trim();
    const password = newPassword.value.trim();

    if (!nombre) return alert("El nombre es obligatorio.");
    if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/.test(nombre)) return alert("El nombre solo puede contener letras.");

    if (!email) return alert("El correo es obligatorio.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return alert("Correo inválido.");

    if (!password) return alert("La contraseña es obligatoria.");
    if (!/^[A-Za-z0-9]+$/.test(password)) return alert("La contraseña solo puede contener letras y números.");

    // telefono y direccion NO SE VALIDAN COMO OBLIGATORIAS

    try {
      const resp = await fetch("/api/registerCliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nombre, telefono, email, direccion, password })
      });

      const data = await resp.json();
      alert(data.mensaje);

      if (resp.ok) {
        document.getElementById("backToLogin").click();
      }
    } catch (err) {
      console.error(err);
      alert("Error del servidor.");
    }
  });
}

});
