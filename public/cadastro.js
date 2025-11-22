// cadastro.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formCadastro");
  const mensagem = document.getElementById("mensagem");
  const tabela = document.getElementById("tabela-dinamica");

  // 🔧 Agora aponta para o backend no Render
  const API_URL = "https://controle-de-carregamento.onrender.com";

  // 🔄 Carregar cadastros agrupados e ordenados
  async function carregarCadastros() {
    try {
      const response = await fetch(`${API_URL}/cadastros`);
      const data = await response.json();

      if (!data || data.length === 0) {
        tabela.innerHTML = "<p>Nenhum cadastro realizado ainda.</p>";
        return;
      }

      // Agrupar por transportadora
      const grupos = {};
      data.forEach((item) => {
        if (!grupos[item.transportadora]) {
          grupos[item.transportadora] = [];
        }
        grupos[item.transportadora].push(item); // usa o id do banco
      });

      // Ordenar transportadoras alfabeticamente
      const transportadorasOrdenadas = Object.keys(grupos).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      );

      // Montar HTML
      let html = "";
      for (const transportadora of transportadorasOrdenadas) {
        const cadastrosOrdenados = grupos[transportadora].sort((a, b) =>
          a.motorista.localeCompare(b.motorista, "pt-BR")
        );

        // Pega o primeiro cadastro para mostrar responsável
        const primeiroCadastro = cadastrosOrdenados[0] || {};

        html += `
          <div class="tile-transportadora">
            <h3>🚛 Transportadora: ${transportadora}</h3>
            <div class="responsavel-header">
              <p><strong>Responsável:</strong> <span id="resp-${primeiroCadastro.id}">${primeiroCadastro.responsavel || ""}</span></p>
              <p><strong>Contato:</strong> <span id="contato-${primeiroCadastro.id}">${primeiroCadastro.contato_responsavel || ""}</span></p>
              <button type="button" onclick="editarResponsavel(${primeiroCadastro.id})">✏️ Editar</button>
            </div>
            <table border="1" cellpadding="5" cellspacing="0">
              <thead>
                <tr>
                  <th>Motoristas</th>
                  <th>Contatos Motoristas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
        `;

        cadastrosOrdenados.forEach((item) => {
          html += `
            <tr>
              <td>${item.motorista}</td>
              <td>${item.contato}</td>
              <td>
                <button onclick="editarLinha(this, ${item.id})">✏️ Editar</button>
                <button onclick="removerCadastro(${item.id})">❌ Remover</button>
              </td>
            </tr>
          `;
        });

        html += "</tbody></table></div>";
      }

      tabela.innerHTML = html;
    } catch (error) {
      console.error("Erro ao carregar cadastros:", error);
      tabela.innerHTML = "<p style='color:red'>Erro ao carregar cadastros.</p>";
    }
  }

  // 📩 Envio do formulário
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dados = {
      transportadora: document.getElementById("transportadora").value.trim(),
      motorista: document.getElementById("motorista").value.trim(),
      contato: document.getElementById("contato").value.trim(),
      responsavel: "",          // inicia vazio
      contatoResponsavel: ""    // inicia vazio
    };

    try {
      const response = await fetch(`${API_URL}/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const result = await response.json();
      mensagem.textContent = result.message;
      mensagem.style.color = "green";

      form.reset();
      carregarCadastros();
    } catch (error) {
      console.error("Erro ao salvar cadastro:", error);
      mensagem.textContent = "Erro ao salvar cadastro.";
      mensagem.style.color = "red";
    }
  });

  // 📌 Função editar/salvar linha
  window.editarLinha = async (botao, id) => {
    const linha = botao.closest("tr");

    if (botao.textContent.includes("Editar")) {
      for (let i = 0; i < linha.cells.length - 1; i++) {
        linha.cells[i].setAttribute("contenteditable", "true");
      }
      botao.textContent = "💾 Salvar";
    } else {
      const dadosAtualizados = {
        motorista: linha.cells[0].innerText.trim(),
        contato: linha.cells[1].innerText.trim(),
        transportadora: linha.closest(".tile-transportadora")
                             .querySelector("h3")
                             .textContent.replace("🚛 Transportadora: ", "")
                             .trim()
      };

      try {
        const response = await fetch(`${API_URL}/cadastro/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dadosAtualizados),
        });
        const result = await response.json();
        mensagem.textContent = result.message;
        mensagem.style.color = "green";

        for (let i = 0; i < linha.cells.length - 1; i++) {
          linha.cells[i].removeAttribute("contenteditable");
        }
        botao.textContent = "✏️ Editar";
      } catch (error) {
        console.error("Erro ao editar cadastro:", error);
        mensagem.textContent = "Erro ao editar cadastro.";
        mensagem.style.color = "red";
      }
    }
  };

  // 📌 Função remover
  window.removerCadastro = async (id) => {
    try {
      const response = await fetch(`${API_URL}/cadastro/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      mensagem.textContent = result.message;
      mensagem.style.color = "green";
      carregarCadastros();
    } catch (error) {
      console.error("Erro ao remover cadastro:", error);
      mensagem.textContent = "Erro ao remover cadastro.";
      mensagem.style.color = "red";
    }
  };
  // 📌 Função editar responsável/contato
  window.editarResponsavel = (id) => {
    const spanResp = document.getElementById(`resp-${id}`);
    const spanContato = document.getElementById(`contato-${id}`);
    const botao = spanResp.closest('.responsavel-header').querySelector('button');

    if (botao.textContent.includes("Editar")) {
      // transforma em inputs
      spanResp.innerHTML = `<input type="text" id="inputResp-${id}" value="${spanResp.textContent}" />`;
      spanContato.innerHTML = `<input type="text" id="inputContato-${id}" value="${spanContato.textContent}" />`;
      botao.textContent = "💾 Salvar";
    } else {
      // pega valores dos inputs
      const novoResp = document.getElementById(`inputResp-${id}`).value.trim();
      const novoContato = document.getElementById(`inputContato-${id}`).value.trim();

      // envia para servidor (rota PUT /cadastro/:id)
      fetch(`${API_URL}/cadastro/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responsavel: novoResp,
          contatoResponsavel: novoContato
        })
      })
      .then(res => res.json())
      .then(result => {
        mensagem.textContent = result.message;
        mensagem.style.color = "green";
      })
      .catch(err => {
        console.error("Erro ao salvar responsável/contato:", err);
        mensagem.textContent = "Erro ao salvar responsável/contato.";
        mensagem.style.color = "red";
      });

      // volta para texto
      spanResp.textContent = novoResp;
      spanContato.textContent = novoContato;
      botao.textContent = "✏️ Editar";
    }
  };

  // 🔄 Carregar cadastros ao iniciar
  carregarCadastros();
});
