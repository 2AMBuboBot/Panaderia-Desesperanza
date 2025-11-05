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
  document.getElementById("loginClienteForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("clienteUser").value;
    const password = document.getElementById("clientePass").value;

    const resp = await fetch("/api/loginCliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include"
    });

    const data = await resp.json();
    if (resp.ok) window.location.href = "index.html";
    else alert(data.mensaje);
  });


  // LOGIN ADMIN
  document.getElementById("loginAdminForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("adminUser").value;
    const password = document.getElementById("adminPass").value;

    const resp = await fetch("/api/loginAdmin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include"
    });

    const data = await resp.json();
    if (resp.ok) window.location.href = "index.html";
    else alert(data.mensaje);
  });


  // REGISTRO CLIENTE
  document.getElementById("registerForm").addEventListener("submit", async e => {
    e.preventDefault();

    const user = {
      nombre: newUsername.value,
      telefono: newTelefono.value,
      email: newEmail.value,
      direccion: newDireccion.value,
      password: newPassword.value
    };

    const resp = await fetch("/api/registerCliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
      credentials: "include"
    });

    const data = await resp.json();
    if (resp.ok) window.location.href = "index.html";
    else alert(data.mensaje);
  });

});
