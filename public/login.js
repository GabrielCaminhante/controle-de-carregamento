document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const senha = document.getElementById("senha").value;

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha })
    });

    const data = await res.json();
    const msg = document.getElementById("mensagem");

    if (res.ok) {
      msg.textContent = "Acesso liberado!";
      msg.style.color = "green";
      setTimeout(() => {
        window.location.href = "/admin.html"; // redireciona para painel
      }, 1000);
    } else {
      msg.textContent = data.message;
      msg.style.color = "red";
    }
  } catch (err) {
    const msg = document.getElementById("mensagem");
    msg.textContent = "Erro de conexão com servidor.";
    msg.style.color = "red";
  }
});

const toggleSenha = document.getElementById("toggleSenha");
const senhaInput = document.getElementById("senha");

toggleSenha.addEventListener("click", () => {
  if (senhaInput.type === "password") {
    senhaInput.type = "text";
    toggleSenha.textContent = "🙈"; // muda ícone para "ocultar"
  } else {
    senhaInput.type = "password";
    toggleSenha.textContent = "👁️"; // volta para "mostrar"
  }
});