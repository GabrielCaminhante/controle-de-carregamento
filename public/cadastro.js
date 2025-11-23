// cadastro.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formCadastro");
  const mensagem = document.getElementById("mensagem");
  const tabela = document.getElementById("tabela-dinamica");

  // 🔧 Backend no Render
  const API_URL = "https://controle-de-carregamento.onrender.com";

  // 🔄 Carregar cadastros agrupados e ordenados
  async function carregarCadastros() {
    try {
      const resposta = await fetch(`${API_URL}/cadastros`);
      const cadastros = await resposta.json();

      let html = "";

      if (cadastros.length > 0) {
        // Ordena cadastros por transportadora
        const cadastrosOrdenados = cadastros.sort((a, b) =>
          a.transportadora.localeCompare(b.transportadora)
        );

        const transportadora = cadastrosOrdenados[0].transportadora;
        const primeiroCadastro = cadastrosOrdenados[0] || {};

        html += `
          <div class="tile-transportadora">
            <h3>🚛 Transportadora: ${transportadora}</h3>
            <div class="responsavel-header">
              <p><strong>Responsável:</strong> 
                <span id="resp-${primeiroCadastro.id}">${primeiroCadastro.responsavel || ""}</span>
              </p>
              <p><strong>Contato:</strong> 
                <span id="contato-${primeiroCadastro.id}">${primeiroCadastro.contato_responsavel || ""}</span>
              </p>
              <div class="acoes-responsavel">
                <button type="button" onclick="editarResponsavel(${primeiroCadastro.id})">✏️ Editar</button>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Motoristas</th>
                  <th>Contatos Motoristas</th>
                  <th class="acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
        `;

        cadastrosOrdenados.forEach((item) => {
          html += `
            <tr>
              <td>${item.motorista}</td>
              <td>${item.contato}</td>
              <td class="acoes">
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

      // envia para servidor
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

 // 📌 Gerar PDF agrupado e ordenado
document.getElementById("btnPDF").addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_URL}/cadastros`);
    const data = await response.json();

    if (!data || data.length === 0) {
      alert("Nenhum cadastro para imprimir.");
      return;
    }

    // Agrupar por transportadora
    const grupos = {};
    data.forEach(item => {
      const t = (item.transportadora || "").trim();
      if (!grupos[t]) grupos[t] = [];
      grupos[t].push(item);
    });

    // Ordenar transportadoras
    const transportadorasOrdenadas = Object.keys(grupos).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

    // ✅ Instanciar jsPDF corretamente
    const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });

    // título principal centralizado
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(16);
    doc.text(
      "Lista de contatos para carregamento de Braspolpa",
      pageWidth / 2,
      50,
      { align: "center" }
    );

    let startY = 80;

    // Paleta de cores para cabeçalhos
    const cores = [
      [41, 128, 185],   // Azul
      [39, 174, 96],    // Verde
      [192, 57, 43],    // Vermelho
      [243, 156, 18],   // Laranja
      [142, 68, 173],   // Roxo
      [44, 62, 80]      // Cinza escuro
    ];

    transportadorasOrdenadas.forEach((transportadora, idx) => {
      if (startY > doc.internal.pageSize.getHeight() - 120) {
        doc.addPage();
        startY = 60;
      }

      // cor dinâmica para cada transportadora
      const corCabecalho = cores[idx % cores.length];

      // título da transportadora na mesma cor do cabeçalho
      doc.setFontSize(13);
      doc.setTextColor(...corCabecalho);
      doc.text(`Transportadora: ${transportadora}`, pageWidth / 2, startY, { align: "center" });
      doc.setTextColor(0, 0, 0); // volta para preto para o restante

      const cadastrosOrdenados = grupos[transportadora].sort((a, b) =>
        (a.motorista || "").localeCompare(b.motorista || "", "pt-BR")
      );

      const head = [["Responsável", "Contatos Resp.", "Motoristas", "Contatos Motoristas"]];
      const body = cadastrosOrdenados.map(item => [
        item.responsavel || "",
        item.contato_responsavel || "",
        item.motorista || "",
        item.contato || ""
      ]);

      doc.autoTable({
        head,
        body,
        startY: startY + 12,
        styles: { 
          fontSize: 9,
          cellPadding: 1.5,
          halign: "center",
          valign: "middle",
          lineHeight: 1.0,
          textColor: [0, 0, 0],
          lineColor: [200, 200, 200],
          lineWidth: 0.5
        },
        headStyles: { 
          fillColor: corCabecalho,
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
          lineColor: [150, 150, 150],
          lineWidth: 0.5
        },
        bodyStyles: {
          halign: "center"
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 40, right: 40 },
        tableWidth: "auto",
        theme: "grid"
      });

      startY = doc.lastAutoTable.finalY + 24;

      // rodapé na última página
      if (idx === transportadorasOrdenadas.length - 1) {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.text("Gerado automaticamente pelo sistema de cadastro", 40, pageHeight - 30);
      }
    });

    doc.save("lista_contatos_braspolpa.pdf");
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    alert("Erro ao gerar PDF. Verifique se o servidor está rodando.");
  }
});
      //função para gerar login para a tela de cadastro
  document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("loginModal");
  const closeBtn = document.querySelector(".close");
  const btnLoginModal = document.getElementById("btnLoginModal");
  const loginMsgModal = document.getElementById("login-msg-modal");

  const SENHA_CORRETA = "braspolpa123"; // 🔧 senha fixa

  // quando clicar no botão de cadastro, abre modal
  document.getElementById("btnCadastro").addEventListener("click", (e) => {
    e.preventDefault(); // evita envio imediato
    modal.style.display = "block";
  });

  // fechar modal
  closeBtn.onclick = () => modal.style.display = "none";
  window.onclick = (event) => {
    if (event.target === modal) modal.style.display = "none";
  };

  // validar login
  btnLoginModal.addEventListener("click", () => {
    const senhaDigitada = document.getElementById("senhaModal").value.trim();
    if (senhaDigitada === SENHA_CORRETA) {
      loginMsgModal.textContent = "Acesso liberado!";
      loginMsgModal.style.color = "green";
      modal.style.display = "none";
      // aqui você chama a função de salvar cadastro
      document.getElementById("formCadastro").requestSubmit();
    } else {
      loginMsgModal.textContent = "Senha incorreta!";
      loginMsgModal.style.color = "red";
    }
  });
});

  // 🔄 Carregar cadastros ao iniciar
  carregarCadastros();
});






