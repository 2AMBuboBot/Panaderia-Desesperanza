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
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;

    const resp = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await resp.json();

    if (resp.ok) {
      alert("Usuario registrado con éxito. Bienvenido " + username);
      window.location.href = "index.html"; // redirigir directo
    } else {
      alert(data.mensaje || "Error al registrar usuario");
    }
  });
});
