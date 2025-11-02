document.addEventListener("DOMContentLoaded", () => {
  // Verificar sesión activa
  fetch("/api/session")
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
  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const resp = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
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
  document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // ⚠ Muy importante para que no recargue la página

    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value.trim();

    if (!username || !password) {
      alert("Ingresa usuario y contraseña");
      return;
    }

    try {
      const res = await fetch("/register", { // si tu backend sigue con /register
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.mensaje || "Error al registrar");
      } else {
        alert(data.mensaje || "Usuario registrado correctamente");
        window.location.href = "login.html"; // redirige al login
      }
    } catch (err) {
      console.error("Error en registro:", err);
      alert("Error en el servidor");
    }
  });
});


});
