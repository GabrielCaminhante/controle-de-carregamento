// cadastro.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formCadastro");
  const mensagem = document.getElementById("mensagem");
  const tabela = document.getElementById("tabela-dinamica");

  const API_URL = "http://localhost:3000";

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
      data.forEach((item, index) => {
        if (!grupos[item.transportadora]) {
          grupos[item.transportadora] = [];
        }
        grupos[item.transportadora].push({ ...item, index });
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
              <p><strong>Responsável:</strong> <span id="resp-${transportadora}">${primeiroCadastro.responsavel || ""}</span></p>
              <p><strong>Contato:</strong> <span id="contato-${transportadora}">${primeiroCadastro.contatoResponsavel || ""}</span></p>
              <button type="button" onclick="editarResponsavel('${transportadora}')">✏️ Editar</button>
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
                <button onclick="editarLinha(this, ${item.index})">✏️ Editar</button>
                <button onclick="removerCadastro(${item.index})">❌ Remover</button>
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
      responsavel: "",          // 🔧 inicia vazio
      contatoResponsavel: ""    // 🔧 inicia vazio
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
  window.editarLinha = async (botao, index) => {
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
        const response = await fetch(`${API_URL}/cadastro/${index}`, {
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
  window.removerCadastro = async (index) => {
    try {
      const response = await fetch(`${API_URL}/cadastro/${index}`, {
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

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      // título principal centralizado
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(16);
      doc.text("Lista de contatos para carregamento de Braspolpa", pageWidth / 2, 50, { align: "center" });

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

        doc.setFontSize(13);
        doc.text(`Transportadora: ${transportadora}`, pageWidth / 2, startY, { align: "center" });

        const cadastrosOrdenados = grupos[transportadora].sort((a, b) =>
          (a.motorista || "").localeCompare(b.motorista || "", "pt-BR")
        );

        const head = [["Responsável", "Contatos Resp.", "Motoristas", "Contatos Motoristas"]];
                const body = cadastrosOrdenados.map(item => [
          item.responsavel || "",
          item.contatoResponsavel || "",
          item.motorista || "",
          item.contato || ""
        ]);

        // cor dinâmica para cada transportadora
        const corCabecalho = cores[idx % cores.length];

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

  // 📌 Função editar responsável/contato
  window.editarResponsavel = (transportadora) => {
    const spanResp = document.getElementById(`resp-${transportadora}`);
    const spanContato = document.getElementById(`contato-${transportadora}`);
    const botao = spanResp.closest('.responsavel-header').querySelector('button');

    if (botao.textContent.includes("Editar")) {
      // transforma em inputs
      spanResp.innerHTML = `<input type="text" id="inputResp-${transportadora}" value="${spanResp.textContent}" />`;
      spanContato.innerHTML = `<input type="text" id="inputContato-${transportadora}" value="${spanContato.textContent}" />`;
      botao.textContent = "💾 Salvar";
    } else {
      // pega valores dos inputs
      const novoResp = document.getElementById(`inputResp-${transportadora}`).value.trim();
      const novoContato = document.getElementById(`inputContato-${transportadora}`).value.trim();

      // envia para servidor
      fetch(`${API_URL}/atualizarResponsavel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transportadora, responsavel: novoResp })
      })
      .then(res => res.json())
      .then(result => {
        mensagem.textContent = result.message;
        mensagem.style.color = "green";
      })
      .catch(err => {
        console.error("Erro ao salvar responsável:", err);
        mensagem.textContent = "Erro ao salvar responsável.";
        mensagem.style.color = "red";
      });

      fetch(`${API_URL}/atualizarContatoResponsavel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transportadora, contatoResponsavel: novoContato })
      })
      .then(res => res.json())
      .then(result => {
        mensagem.textContent = result.message;
        mensagem.style.color = "green";
      })
      .catch(err => {
        console.error("Erro ao salvar contato:", err);
        mensagem.textContent = "Erro ao salvar contato.";
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