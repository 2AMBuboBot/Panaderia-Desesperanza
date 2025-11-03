document.addEventListener("DOMContentLoaded", () => {

  // Verificar sesión activa
  fetch("/api/session", { credentials: "include" })
    .then(res => res.json())
    .then(data => {
      if (data.loggedIn) window.location.href = "index.html";
    });

  const loginContainer = document.getElementById("loginContainer");
  const registerContainer = document.getElementById("registerContainer");

  // Mostrar / ocultar formularios
  document.getElementById("showRegister").onclick = () => {
    loginContainer.style.display = "none";
    registerContainer.style.display = "block";
  };
  document.getElementById("showLogin").onclick = () => {
    registerContainer.style.display = "none";
    loginContainer.style.display = "block";
  };

  // LOGIN
  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const resp = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include"
    });

    const data = await resp.json();
    if (resp.ok) {
      alert("Bienvenido " + username);
      window.location.href = "index.html";
    } else {
      alert(data.mensaje);
    }
  });

  // REGISTRO
  const registerForm = document.getElementById("registerForm");
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value.trim();

    if (!username || !password) {
      alert("Por favor completa todos los campos");
      return;
    }

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.mensaje || "Error al registrar usuario");
        return;
      }

      // Éxito: redirigir a productos
      alert(data.mensaje);
      window.location.href = "index.html";
    } catch (err) {
      console.error("Error al registrar usuario:", err);
      alert("Error al registrar usuario");
    }
  });

});