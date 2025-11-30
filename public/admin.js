// ========= CONFIGURAÇÃO DE BASE =========
const BASE_URL = window.location.origin;

// Conexão com Socket.IO (usa mesma origem automaticamente)
const socket = io(BASE_URL);

// Endpoints do servidor (dinâmicos: local ou produção)
const ENDPOINT_TRANSPORTADORAS = `${BASE_URL}/cadastros`; 
const ENDPOINT_PAINEL = `${BASE_URL}/painel`;

// Estado local
let linhasCargas = [];
let linhasAgendamento = [];
let linhasControle = [];
let listaTransportadoras = []; // nomes oficiais para seleção

const porLote = 38;

// ========= CARREGAMENTO INICIAL =========
async function carregarInicial() {
  try {
    // 1) Transportadoras cadastradas (somente leitura)
    const resT = await fetch(ENDPOINT_TRANSPORTADORAS, { credentials: "include" });
    if (!resT.ok) throw new Error("Falha ao carregar transportadoras");
    const transportadoras = await resT.json();
    listaTransportadoras = transportadoras.map(t => t.transportadora).filter(Boolean);

    // 2) Painel (cargas, agendamento, controle)
    const resP = await fetch(ENDPOINT_PAINEL, { credentials: "include" });
    if (!resP.ok) throw new Error("Falha ao carregar painel");
    const painel = await resP.json();

    linhasCargas = Array.isArray(painel.cargas) ? painel.cargas : [];
    linhasAgendamento = Array.isArray(painel.agendamento) ? painel.agendamento : [];
    linhasControle = Array.isArray(painel.controle) ? painel.controle : [];

    atualizarListaTransportadoras();
    renderTabelaCargas();
    renderTabelaAgendamento();

    console.log("✅ Painel e transportadoras carregados.");
  } catch (err) {
    console.error("⚠ Erro no carregamento inicial:", err);
    const grid = document.getElementById("gridCargas");
    if (grid) grid.innerHTML = '<p style="text-align:center; font-weight:bold; color:#555;">servidor offline.</p>';
    const tbody = document.querySelector("#tabela-semanal tbody");
    if (tbody) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="8">Erro ao carregar dados do servidor.</td>`;
      tbody.appendChild(tr);
    }
  }
}

// ========= SALVAMENTO DO PAINEL =========
function salvarPainel() {
  const payload = {
    transportadoras: listaTransportadoras.map(t => ({
      transportadora: t
    })),
    cargas: linhasCargas || [],
    agendamento: linhasAgendamento || [],
    controle: linhasControle || []
  };

  fetch(ENDPOINT_PAINEL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  })
    .then(res => {
      if (!res.ok) throw new Error("Falha ao salvar painel");
      console.log("💾 Painel salvo com sucesso.");
    })
    .catch(err => console.error("⚠ Erro ao salvar painel:", err));
}

// ========= SOCKET.IO =========
socket.on("estadoAtualizado", (painel) => {
  if (Array.isArray(painel.transportadoras)) {
    listaTransportadoras = painel.transportadoras.map(t => t.transportadora).filter(Boolean);
    atualizarListaTransportadoras();
  }
  linhasCargas = Array.isArray(painel.cargas) ? painel.cargas : [];
  linhasAgendamento = Array.isArray(painel.agendamento) ? painel.agendamento : [];
  linhasControle = Array.isArray(painel.controle) ? painel.controle : [];

  renderTabelaCargas();
  renderTabelaAgendamento();
  console.log("🔄 Estado atualizado via socket.");
});

// ========= RENDERIZAÇÃO: CARGAS =========
function renderTabelaCargas() {
  const grid = document.getElementById("gridCargas");
  grid.innerHTML = "";

  if (!linhasCargas || linhasCargas.length === 0) {
    grid.innerHTML = '<p style="text-align:center; font-weight:bold; color:#555;">Nenhuma carga cadastrada.</p>';
    return;
  }

  const total = linhasCargas.length;
  const numLotes = Math.ceil(total / porLote);

  const colunas = [document.createElement("div"), document.createElement("div")];
  colunas.forEach(col => {
    col.classList.add("linha-lotes");
    grid.appendChild(col);
  });

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
      const inputNum = document.createElement("input");
      inputNum.type = "number";
      inputNum.value = i + 1;
      inputNum.disabled = true;
      tdNum.appendChild(inputNum);
      tr.appendChild(tdNum);

      const tdTransp = document.createElement("td");
      const inputTransp = document.createElement("input");
      inputTransp.type = "text";
      inputTransp.setAttribute("list", "lista-transportadoras");
      inputTransp.value = (linhasCargas[i]?.transportadora || "");
      inputTransp.oninput = () => {
        linhasCargas[i].transportadora = inputTransp.value;
        salvarPainel();
      };
      tdTransp.appendChild(inputTransp);
      tr.appendChild(tdTransp);

      tbody.appendChild(tr);
    }

    tabela.appendChild(tbody);
    bloco.appendChild(tabela);

    const alvoColuna = l < 3 ? colunas[0] : colunas[1];
    alvoColuna.appendChild(bloco);
  }
}

// ========= RENDERIZAÇÃO: AGENDAMENTO =========
const MAPA_TABELA_PARA_GETDAY = [1, 2, 3, 4, 5, 6, 0];

function renderTabelaAgendamento() {
  const tbody = document.querySelector("#tabela-semanal tbody");
  tbody.innerHTML = "";

  if (!linhasAgendamento || linhasAgendamento.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" style="text-align:center; font-weight:bold; color:#555;">
      Nenhum agendamento cadastrado.
    </td>`;
    tbody.appendChild(tr);
    return;
  }

  linhasAgendamento.forEach((linha, index) => {
    const tr = document.createElement("tr");

    const tdTransp = document.createElement("td");
    const inputTransp = document.createElement("input");
    inputTransp.type = "text";
    inputTransp.setAttribute("list", "lista-transportadoras");
    inputTransp.value = (linha.transportadora || "");
    inputTransp.oninput = () => {
      linhasAgendamento[index].transportadora = inputTransp.value;
      salvarPainel();
    };
    tdTransp.appendChild(inputTransp);
    tr.appendChild(tdTransp);

    for (let diaIndex = 0; diaIndex < 7; diaIndex++) {
      const tdDia = document.createElement("td");
      const inputHora = document.createElement("input");
      inputHora.type = "time";

      const diaBackend = MAPA_TABELA_PARA_GETDAY[diaIndex];
      inputHora.value = (linha.dias && linha.dias[diaBackend]) ? linha.dias[diaBackend] : "";

      inputHora.oninput = () => {
        if (!Array.isArray(linhasAgendamento[index].dias)) {
          linhasAgendamento[index].dias = Array(7).fill("");
        }
        linhasAgendamento[index].dias[diaBackend] = inputHora.value;
        salvarPainel();
      };

      tdDia.appendChild(inputHora);
      tr.appendChild(tdDia);
    }

    tbody.appendChild(tr);
  });
}

// ========= LISTA DE TRANSPORTADORAS =========
function atualizarListaTransportadoras() {
  const datalist = document.getElementById("lista-transportadoras");
  if (!datalist) return;

  datalist.innerHTML = "";
  [...new Set(listaTransportadoras)].sort().forEach(nome => {
    const opt = document.createElement("option");
    opt.value = nome;
    datalist.appendChild(opt);
  });
}

// ========= AÇÕES DOS BOTÕES =========
function bindBotoes() {
  const btnAdicionarLinha = document.getElementById("btnAdicionarLinha");
  const btnRemoverLinha = document.getElementById("btnRemoverLinha");
  const qtdInput = document.getElementById("quantidade-linhas");

  const btnAdicionarAgendamento = document.getElementById("btnAdicionarAgendamento");
  const btnRemoverAgendamento = document.getElementById("btnRemoverAgendamento");

  // Criar linhas em Cargas
  if (btnAdicionarLinha) {
    btnAdicionarLinha.addEventListener("click", () => {
      const qtd = parseInt(qtdInput?.value, 10) || 1;
      for (let i = 0; i < qtd; i++) {
        linhasCargas.push({ transportadora: "" });
      }
      renderTabelaCargas();
      salvarPainel();
    });
  }

  // Remover linhas em Cargas
  if (btnRemoverLinha) {
    btnRemoverLinha.addEventListener("click", () => {
      const qtd = parseInt(qtdInput?.value, 10) || 1;
      if (qtd > linhasCargas.length) {
        alert("⚠ Não há tantas linhas para remover.");
        return;
      }
      for (let i = 0; i < qtd; i++) {
        linhasCargas.pop();
      }
      renderTabelaCargas();
      salvarPainel();
    });
  }

  // Criar 1 linha no Agendamento
  if (btnAdicionarAgendamento) {
    btnAdicionarAgendamento.addEventListener("click", () => {
      linhasAgendamento.push({ transportadora: "", dias: Array(7).fill(""), status: Array(7).fill("não confirmado") });
      renderTabelaAgendamento();
      salvarPainel();
    });
  }

  // Remover 1 linha no Agendamento
  if (btnRemoverAgendamento) {
    btnRemoverAgendamento.addEventListener("click", () => {
      if (linhasAgendamento.length > 0) {
        linhasAgendamento.pop();
        renderTabelaAgendamento();
        salvarPainel();
      }
    });
  }
}

// ========= ABERTURA DE PAINÉIS =========
function abrirPainelMotorista() {
  window.open("motorista.html", "painelMotorista");
}

function abrirPainelCadastro() {
  window.open("cadastro.html", "painelCadastro");
}

function abrirPainelControle() {
  window.open("controle.html", "painelControle");
}

// referência da janela de cadastro
let janelaCadastro = null;

function abrirCadastro() {
  if (janelaCadastro && !janelaCadastro.closed) {
    janelaCadastro.focus();
    alert("⚠ A página de cadastro já está aberta.");
    return;
  }
  janelaCadastro = window.open("cadastro.html", "painelCadastro");
}

// ligar ao botão existente
document.addEventListener("DOMContentLoaded", () => {
  const btnCadastro = document.getElementById("btnCadastro");
  if (btnCadastro) {
    btnCadastro.addEventListener("click", abrirCadastro);
  }
});

// ========= INICIALIZAÇÃO =========
document.addEventListener("DOMContentLoaded", () => {
  carregarInicial().then(() => bindBotoes());
});