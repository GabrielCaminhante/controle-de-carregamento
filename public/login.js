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
    loginTitle.textContent = "Login Do Operador";
    body.style.background = "linear-gradient(135deg, #007bff, #6c757d)";
  } else if (role === "motorista") {
    loginTitle.classList.add("motorista-title");
    loginTitle.textContent = "Login do Motorista";
    body.style.background = "linear-gradient(135deg, #ff9800, #ffc107)";
  }
}


// Alternar senha
document.getElementById("toggleSenha").addEventListener("click", () => {
  const senha = document.getElementById("password");
  senha.type = senha.type === "password" ? "text" : "password";
});

// Alternar senha
document.getElementById("toggleSenha").addEventListener("click", () => {
  const senha = document.getElementById("password");
  senha.type = senha.type === "password" ? "text" : "password";
});

// Exibir mensagem ao carregar a página
window.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("welcome-message");
  msg.classList.add("show");

  // Mantém por 10 segundos e depois sobe
  setTimeout(() => {
    msg.classList.remove("show");
  }, 10000); // 10 segundos
});

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
      // mensagem mais clara para senha incorreta
      msg.textContent = "Usuário ou senha incorretos. Tente novamente.";
      msg.style.color = "red";
    }
  } catch (err) {
    const msg = document.getElementById("mensagem");
    msg.textContent = "Erro de conexão com o servidor.";
    msg.style.color = "red";
  }
});

// alternar visibilidade da senha
document.addEventListener("DOMContentLoaded", () => {
  const toggleSenha = document.getElementById("toggleSenha");
  const senhaInput = document.getElementById("password");

  if (!toggleSenha || !senhaInput) {
    console.error("Elemento não encontrado");
    return;
  }

  // ícone inicial: senha oculta
  toggleSenha.textContent = "👁️";

  toggleSenha.addEventListener("click", () => {
    if (senhaInput.type === "password") {
      senhaInput.type = "text";
      toggleSenha.textContent = "🙈"; // senha visível
    } else {
      senhaInput.type = "password";
      toggleSenha.textContent = "👁️"; // senha oculta
    }
  });
});
