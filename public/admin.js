const porLote = 38;
let linhasCargas = [];
let linhasAgendamento = [];
let listaTransportadoras = ["Transp A", "Transp B", "Transp C"]; // exemplo

// ========= RENDERIZAÇÃO DE CARGAS =========
function renderTabelaCargas() {
  const grid = document.getElementById("gridCargas");
  grid.innerHTML = "";

  const total = linhasCargas.length;
  const numLotes = Math.ceil(total / porLote);

  for (let l = 0; l < numLotes; l++) {
    const bloco = document.createElement("div");
    bloco.classList.add("tabela-bloco-carga");

    const titulo = document.createElement("h2");
    titulo.textContent = `Seguimento ${l + 1}`;
    bloco.appendChild(titulo);

    const tabela = document.createElement("table");
    tabela.innerHTML = `<thead><tr><th>Nº</th><th>Transportadora</th></tr></thead>`;
    const tbody = document.createElement("tbody");

    for (let i = l * porLote; i < Math.min((l + 1) * porLote, total); i++) {
      const tr = document.createElement("tr");

      const tdNum = document.createElement("td");
      tdNum.textContent = i + 1;
      tr.appendChild(tdNum);

      const tdTransp = document.createElement("td");
      const inputTransp = document.createElement("input");
      inputTransp.type = "text";
      inputTransp.setAttribute("list", "lista-transportadoras");
      inputTransp.value = linhasCargas[i]?.transportadora_nome || "";
      inputTransp.oninput = () => {
        linhasCargas[i].transportadora_nome = inputTransp.value;
        salvarCarga(linhasCargas[i]); // auto‑save
      };
      tdTransp.appendChild(inputTransp);
      tr.appendChild(tdTransp);

      tbody.appendChild(tr);
    }

    tabela.appendChild(tbody);
    bloco.appendChild(tabela);
    grid.appendChild(bloco);
  }
}

// ========= RENDERIZAÇÃO DE AGENDAMENTOS =========
function renderTabelaAgendamento() {
  const tbody = document.querySelector("#tabela-semanal tbody");
  tbody.innerHTML = "";

  linhasAgendamento.forEach((linha, index) => {
    const tr = document.createElement("tr");

    const tdTransp = document.createElement("td");
    const inputTransp = document.createElement("input");
    inputTransp.type = "text";
    inputTransp.setAttribute("list", "lista-transportadoras");
    inputTransp.value = linha.transportadora_nome || "";
    inputTransp.oninput = () => {
      linhasAgendamento[index].transportadora_nome = inputTransp.value;
      salvarAgendamento(linhasAgendamento[index]); // auto‑save
    };
    tdTransp.appendChild(inputTransp);
    tr.appendChild(tdTransp);

    const diasSemana = ["segunda","terca","quarta","quinta","sexta","sabado","domingo"];
    diasSemana.forEach((dia) => {
      const tdDia = document.createElement("td");
      const inputHora = document.createElement("input");
      inputHora.type = "time";
      inputHora.value = linha[dia] || "";
      inputHora.oninput = () => {
        linhasAgendamento[index][dia] = inputHora.value;
        salvarAgendamento(linhasAgendamento[index]); // auto‑save
      };
      tdDia.appendChild(inputHora);
      tr.appendChild(tdDia);
    });

    tbody.appendChild(tr);
  });
}

// ========= BOTÕES =========
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnAdicionarLinha").onclick = () => {
    const qtd = parseInt(document.getElementById("quantidade-linhas").value) || 1;
    for (let i = 0; i < qtd; i++) {
      linhasCargas.push({ transportadora_nome: "" });
    }
    renderTabelaCargas();
  };

  document.getElementById("btnRemoverLinha").onclick = () => {
    const qtd = parseInt(document.getElementById("quantidade-linhas").value) || 1;
    linhasCargas.splice(-qtd, qtd);
    renderTabelaCargas();
  };

  document.getElementById("btnAdicionarAgendamento").onclick = () => {
    linhasAgendamento.push({ transportadora_nome: "", segunda:"", terca:"", quarta:"", quinta:"", sexta:"", sabado:"", domingo:"" });
    renderTabelaAgendamento();
  };

  document.getElementById("btnRemoverAgendamento").onclick = () => {
    linhasAgendamento.pop();
    renderTabelaAgendamento();
  };

  // inicial
  renderTabelaCargas();
  renderTabelaAgendamento();
});

// ========= AUTO‑SAVE =========
function salvarCarga(carga) {
  fetch("/cargas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(carga)
  })
  .then(res => res.json())
  .then(data => console.log("💾 Carga salva:", data))
  .catch(err => console.error("Erro ao salvar carga:", err));
}

function salvarAgendamento(agendamento) {
  fetch("/agendamento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(agendamento)
  })
  .then(res => res.json())
  .then(data => console.log("💾 Agendamento salvo:", data))
  .catch(err => console.error("Erro ao salvar agendamento:", err));
}

// ========= ABERTURA DE PAINÉIS =========
function abrirPainelMotorista() {
  window.open("motorista.html", "painelMotorista");
}

function abrirPainelControle() {
  window.open("controle.html", "painelControle");
}

function abrirPainelCadastro() {
  window.open("cadastro.html", "painelCadastro");
}
