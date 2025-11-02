document.addEventListener("DOMContentLoaded", () => {
  // Si ya hay sesión, ir al index
  fetch("/api/session")
    .then(res => res.json())
    .then(data => {
      if (data.loggedIn) window.location.href = "index.html";
    });

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
});
