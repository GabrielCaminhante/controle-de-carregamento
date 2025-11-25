// captura elementos
const roleSelect = document.getElementById("role");
const loginTitle = document.getElementById("loginTitle");
const body = document.body;

// função para atualizar cor do título e fundo
function updateTitleColor() {
  const role = roleSelect.value;

  // remove classes antigas
  loginTitle.classList.remove("admin-title", "user-title", "motorista-title");

  if (role === "admin") {
    loginTitle.classList.add("admin-title");
    loginTitle.textContent = "Login do Administrador";
    body.style.background = "linear-gradient(135deg, #ff6b6b, #28a745)";
  } else if (role === "user") {
    loginTitle.classList.add("user-title");
    loginTitle.textContent = "Login do Usuário";
    body.style.background = "linear-gradient(135deg, #007bff, #6c757d)";
  } else if (role === "motorista") {
    loginTitle.classList.add("motorista-title");
    loginTitle.textContent = "Login do Motorista";
    body.style.background = "linear-gradient(135deg, #ff9800, #ffc107)";
  }
}

// evento para mudar cor ao selecionar
roleSelect.addEventListener("change", updateTitleColor);

// chama uma vez ao carregar a página
updateTitleColor();

// envio do login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    const msg = document.getElementById("mensagem");

    if (res.ok) {
      msg.textContent = "Acesso liberado!";
      msg.style.color = "green";

      setTimeout(() => {
        if (role === "admin") {
          window.location.href = "/admin.html";
        } else if (role === "user") {
          window.location.href = "/user.html";
        } else if (role === "motorista") {
          window.location.href = "/motorista.html";
        }
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

// alternar visibilidade da senha
const toggleSenha = document.getElementById("toggleSenha");
const senhaInput = document.getElementById("password");

toggleSenha.addEventListener("click", () => {
  if (senhaInput.type === "password") {
    senhaInput.type = "text";
    toggleSenha.textContent = "🙈"; // muda ícone para "ocultar"
  } else {
    senhaInput.type = "password";
    toggleSenha.textContent = "👁️"; // volta para "mostrar"
  }
});
