// 🔃 Variáveis globais
let linhasAgendamentoControle = [];
const tabelaCarregamento = document.getElementById("tabela-carregamento");
const tabelaAgendamento = document.querySelector("#tabela-agendamento-semanal tbody");
const API_URL = "http://localhost:3000";

// =======================
// Utilitários de estado
// =======================
async function carregarEstadoGlobal() {
  try {
    const res = await fetch(`${API_URL}/painel`);
    if (!res.ok) throw new Error(`Erro ao carregar estado global: ${res.status}`);
    const json = await res.json();
    return json || {};
  } catch (err) {
    console.error("carregarEstadoGlobal falhou:", err);
    return { cargas: [], controle: [], agendamento: [], transportadoras: [], marcadorAtual: 1 };
  }
}

async function salvarEstadoGlobal(estado) {
  try {
    await fetch(`${API_URL}/painel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(estado)
    });
  } catch (err) {
    console.error("salvarEstadoGlobal falhou:", err);
    alert("Não foi possível salvar o estado. Verifique o servidor.");
  }
}

// =========================================
// Geração da Tabela de Controle de Cargas
// =========================================
async function gerarTabelaControleDeCargas() {
  tabelaCarregamento.innerHTML = "";

  const estadoGlobal = await carregarEstadoGlobal();
  const dados = Array.isArray(estadoGlobal.cargas) ? estadoGlobal.cargas : [];
  const controleSalvo = Array.isArray(estadoGlobal.controle) ? estadoGlobal.controle : [];

  // Normaliza controle com base nas cargas atuais
  estadoGlobal.controle = dados.map((item, i) => {
    const existente = controleSalvo.find(c => c.numero === i + 1) || {};
    return {
      numero: i + 1,
      transportadora: item.transportadora || existente.transportadora || "",
      nome: existente.nome || "",
      horario: existente.horario || "",
      status: existente.status || "",
      data: existente.data || ""
    };
  });

  await salvarEstadoGlobal(estadoGlobal);

  // Constroi linhas
  dados.forEach((item, i) => {
    const linha = document.createElement("tr");
    linha.dataset.numero = i + 1;

    const existente = estadoGlobal.controle[i];
    const datalistId = `motoristas-${i}`;

    linha.innerHTML = `
      <td><input type="date" value="${existente.data || ""}"></td>
      <td><input type="text" value="${item.transportadora || ""}" disabled></td>
      <td>
        <input type="text" list="${datalistId}" placeholder="Nome Motorista" value="${existente.nome || ""}">
        <datalist id="${datalistId}"></datalist>
      </td>
      <td><input type="time" value="${existente.horario || ""}"></td>
      <td class="numero-carga">${i + 1}</td>
      <td class="acoes">
        <button onclick="marcarSaida(this)">Saiu</button>
        <button onclick="pularCarga(this)">Pular</button>
      </td>
    `;

    tabelaCarregamento.appendChild(linha);

    // Datalist de motoristas por transportadora
    const datalistMotoristas = linha.querySelector(`#${datalistId}`);
    preencherListaMotoristasPorTransportadora(
      item.transportadora,
      datalistMotoristas,
      Array.isArray(estadoGlobal.transportadoras) ? estadoGlobal.transportadoras : []
    );

    // 👉 Captura alteração do nome do motorista e salva no JSON
    const inputNome = linha.querySelector(`input[list="${datalistId}"]`);
    inputNome.addEventListener("change", async () => {
      const novoNome = inputNome.value.trim();
      if (!novoNome) return;

      const estadoGlobalAtual = await carregarEstadoGlobal();

      // Atualiza controle
      estadoGlobalAtual.controle[i].nome = novoNome;

      // Atualiza transportadoras (espelhamento)
      const transportadoraObj = estadoGlobalAtual.transportadoras.find(
        t => (t.transportadora || "").trim() === (item.transportadora || "").trim()
      );

      if (transportadoraObj) {
        transportadoraObj.motorista = novoNome;
      } else {
        // Se não existir, cria novo registro
        estadoGlobalAtual.transportadoras.push({
          transportadora: item.transportadora,
          motorista: novoNome,
          contato: "",
          responsavel: "",
          contatoResponsavel: ""
        });
      }

      await salvarEstadoGlobal(estadoGlobalAtual);
    });

    // Estado visual inicial
    linha.classList.remove("saida-realizada", "pulou-vez", "carga-atual");
    removerAlerta(linha);

    if (existente.status === "saiu") {
      linha.classList.add("saida-realizada");
      adicionarAlerta(linha, "✅ Carga OK");
      desativarLinha(linha);
    } else if (existente.status === "pulou") {
      linha.classList.add("pulou-vez");
      adicionarAlerta(linha, "⚠ Carga com Pendência");
    }
  });
}


// ========================================
// Datalist de motoristas por transportadora
// ========================================
function preencherListaMotoristasPorTransportadora(transportadora, datalistElement, listaTransportadoras) {
  datalistElement.innerHTML = "";
  if (!Array.isArray(listaTransportadoras)) return;

  const motoristas = listaTransportadoras
    .filter(t => (t.transportadora || "").trim() === (transportadora || "").trim() && (t.motorista || "").trim())
    .map(t => t.motorista.trim());

  [...new Set(motoristas)].forEach(m => {
    const option = document.createElement("option");
    option.value = m;
    datalistElement.appendChild(option);
  });
}

// =======================
// Utilitários visuais
// =======================
function desativarLinha(linha, status) {
  // Desabilita botões sempre
  linha.querySelectorAll("button").forEach(btn => btn.disabled = true);

  // Desabilita todos os inputs, com exceção do campo motorista em casos específicos
  linha.querySelectorAll("input").forEach(input => {
    const isMotorista = input.getAttribute("list") !== null; // campo com datalist

    if (isMotorista) {
      // 👉 Motorista habilitado apenas para pendências ou cargas sem status
      if (status === "pulou" || !status) {
        input.disabled = false;
      } else {
        input.disabled = true; // Saiu → bloqueado
      }
    } else {
      // Data e horário sempre desabilitados após ação
      input.disabled = true;
    }
  });
}

function adicionarAlerta(linha, texto) {
  removerAlerta(linha);
  const celula = linha.querySelector("td:last-child");
  const alerta = document.createElement("div");
  alerta.className = "alerta-status";
  alerta.textContent = texto;
  celula.appendChild(alerta);
}

function removerAlerta(linha) {
  const alerta = linha.querySelector(".alerta-status");
  if (alerta) alerta.remove();
}

// =======================
// Atualização da carga atual
// =======================
async function atualizarCargaAtual(numero) {
  // Remove marcação anterior
  document.querySelectorAll(".carga-atual").forEach(el => el.classList.remove("carga-atual"));

  const linhas = [...tabelaCarregamento.rows];
  let proxima = numero;

  const estadoGlobal = await carregarEstadoGlobal();

  while (proxima <= linhas.length) {
    const linha = linhas.find(row => parseInt(row.dataset.numero, 10) === proxima);
    if (linha && !linha.classList.contains("saida-realizada")) {
      linha.classList.add("carga-atual");
      estadoGlobal.marcadorAtual = proxima;
      await salvarEstadoGlobal(estadoGlobal);
      return;
    }
    proxima++;
  }

  // ✅ Todas as cargas finalizadas
  alert("✅ Todas as cargas finalizadas.");
  estadoGlobal.marcadorAtual = null;
  await salvarEstadoGlobal(estadoGlobal);

  // Habilita botão de reset manual
  const botaoReset = document.getElementById("botao-resetar");
  if (botaoReset) botaoReset.disabled = false;
}

// =======================
// Utilitários visuais
// =======================
function rolarParaCargaAtual() {
  const linhaAtual = document.querySelector(".carga-atual");
  if (linhaAtual) {
    linhaAtual.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}


// =======================
// Botões de ação painel
// =======================

function abrirPainelMotorista() {
  // Abre ou foca a aba chamada "painelMotorista"
  window.open("motorista.html", "painelMotorista");
}

function abrirPainelCadastro() {
  // Abre ou foca a aba chamada "painelCadastro"
  window.open("cadastro.html", "painelCadastro");
}

// =======================
// Restaurar estado visual
// =======================
async function restaurarEstadoControleDeCargas() {
  const estadoGlobal = await carregarEstadoGlobal();
  const controle = estadoGlobal.controle || [];

  controle.forEach(item => {
    const linha = tabelaCarregamento.querySelector(`tr[data-numero="${item.numero}"]`);
    if (!linha) return;

    // Preenche campos
    linha.querySelector('input[type="date"]').value = item.data || "";
    const inputsTexto = linha.querySelectorAll('input[type="text"]');
    if (inputsTexto[1]) inputsTexto[1].value = item.nome || "";
    linha.querySelector('input[type="time"]').value = item.horario || "";

    // Estado visual
    linha.classList.remove("saida-realizada", "pulou-vez", "carga-atual");
    removerAlerta(linha);

    if (item.status === "saiu") {
      linha.classList.add("saida-realizada");
      adicionarAlerta(linha, "✅ Carga OK");
      desativarLinha(linha);
    } else if (item.status === "pulou") {
      linha.classList.add("pulou-vez");
      adicionarAlerta(linha, "⚠ Carga com Pendência");
    }
  });

  const marcador = estadoGlobal.marcadorAtual || 1;
  await atualizarCargaAtual(marcador);
}

// =======================
// Agendamento semanal
// =======================
// Mapeamento entre índice da tabela (Segunda→Domingo) e índice real do JS (0=Dom, 1=Seg, ..., 6=Sáb)
const MAPA_TABELA_PARA_GETDAY = [1, 2, 3, 4, 5, 6, 0];
const NOMES_DIAS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

async function preencherTabelaAgendamentoSemanal() {
  const tabelaAgendamento = document.querySelector("#tabela-agendamento-semanal tbody");
  tabelaAgendamento.innerHTML = "";

  const estadoGlobal = await carregarEstadoGlobal();
  const agendamento = Array.isArray(estadoGlobal.agendamento) ? estadoGlobal.agendamento : [];

  linhasAgendamentoControle = agendamento.map(item => ({
    transportadora: item.transportadora || "",
    dias: Array.isArray(item.dias) && item.dias.length === 7 ? item.dias : Array(7).fill(""),
    status: Array.isArray(item.status) && item.status.length === 7 ? item.status : Array(7).fill("não confirmado")
  }));

  const hojeTabela = (new Date().getDay() + 6) % 7; // 0=Seg, ..., 6=Dom

  linhasAgendamentoControle.forEach((linha, idx) => {
    const tr = document.createElement("tr");

    // Transportadora
    const tdTransportadora = document.createElement("td");
    tdTransportadora.textContent = linha.transportadora;
    tr.appendChild(tdTransportadora);

    // Dias da semana
    for (let iTabela = 0; iTabela < 7; iTabela++) {
      const diaBackend = MAPA_TABELA_PARA_GETDAY[iTabela];
      const tdDia = document.createElement("td");

      // 👉 Apenas exibe o horário como texto
      const horario = linha.dias[diaBackend] || "";
      tdDia.textContent = horario;

      // Classes visuais
      tdDia.classList.remove("agendamento-confirmado","agendamento-nao-confirmado","agendamento-dia-atual","agendamento-padrao");

      if (horario) {
        if (iTabela === hojeTabela) {
          tdDia.classList.add("agendamento-dia-atual");
        } else {
          tdDia.classList.add("agendamento-padrao");
        }

        if (linha.status[diaBackend] === "confirmado") {
          tdDia.classList.add("agendamento-confirmado");
        } else {
          tdDia.classList.add("agendamento-nao-confirmado");
        }
      }

      // Clique só funciona no dia atual → alterna status
      tdDia.onclick = async () => {
        if (iTabela !== hojeTabela) {
          alert(`⚠ Só é possível confirmar agendamento para ${NOMES_DIAS[hojeTabela+1]}.`);
          return;
        }
        await alternarAgendamento(idx, diaBackend, tr, horario);
      };

      tr.appendChild(tdDia);
    }

    tabelaAgendamento.appendChild(tr);
  });
}


async function alternarAgendamento(idxLinha, idxDia, tr, horarioExistente) {
  const estadoGlobal = await carregarEstadoGlobal();
  const linha = estadoGlobal.agendamento[idxLinha];

  if (!linha.status) linha.status = Array(7).fill("não confirmado");
  if (!linha.dias) linha.dias = Array(7).fill("");

  // 👉 Mantém o horário já salvo, não altera
  const horario = horarioExistente || "";

  // Alterna apenas o status
  linha.status[idxDia] = linha.status[idxDia] === "confirmado" ? "não confirmado" : "confirmado";

  await salvarEstadoGlobal(estadoGlobal);

  // Atualiza visual
  const tdDia = tr.querySelectorAll("td")[MAPA_TABELA_PARA_GETDAY.indexOf(idxDia) + 1];
  tdDia.classList.remove("agendamento-dia-atual","agendamento-padrao","agendamento-confirmado","agendamento-nao-confirmado");

  if (!horario) {
    mostrarAlertaAgendamento(`❌ Agendamento removido para ${linha.transportadora}`, false);
    return;
  }

  if (linha.status[idxDia] === "confirmado") {
    tdDia.classList.add("agendamento-confirmado");
    mostrarAlertaAgendamento(`✅ Agendamento confirmado às ${horario} para ${linha.transportadora}`, true);
  } else {
    tdDia.classList.add("agendamento-nao-confirmado");
    mostrarAlertaAgendamento(`❌ Agendamento desmarcado para ${linha.transportadora}`, false);
  }
}

function mostrarAlertaAgendamento(mensagem, confirmado) {
  const container = document.querySelector(".botoes-agendamento");
  if (!container) return;

  const alerta = document.createElement("div");
  alerta.textContent = mensagem;
  alerta.className = "alerta-agendamento " + (confirmado ? "alerta-confirmado" : "alerta-desmarcado");

  container.appendChild(alerta);

  setTimeout(() => {
    alerta.remove();
  }, 3000);
}


//
// 📄 Gerar PDF estiloso da tabela de cargas
//
async function gerarPDFCargas() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const corpo = document.getElementById("tabela-carregamento");
  if (!corpo) {
    alert("Tabela não encontrada.");
    return;
  }

  const linhas = Array.from(corpo.querySelectorAll("tr"));
  const dados = [["N° Cargas", "Data", "Transportadora", "Motorista", "Horário"]];

  linhas.forEach((tr, index) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length >= 6) {
      const data = tds[0].querySelector("input")?.value || "";
      const transportadora = tds[1].querySelector("input")?.value || "";
      const motorista = tds[2].querySelector("input")?.value || "";
      const horario = tds[3].querySelector("input")?.value || "";
      dados.push([(index + 1).toString(), data, transportadora, motorista, horario]);
    }
  });

  // Frequência de transportadoras
  const freq = {};
  for (let i = 1; i < dados.length; i++) {
    const nome = (dados[i][2] || "").trim();
    if (!nome) continue;
    freq[nome] = (freq[nome] || 0) + 1;
  }

  // Paleta de cores
  const paleta = [
    [0, 102, 204], [0, 153, 76], [204, 102, 0],
    [153, 0, 153], [204, 0, 0], [0, 153, 153],
    [153, 102, 0], [102, 102, 102], [0, 0, 153], [0, 102, 102]
  ];

  const corPorTransportadora = {};
  let idxCor = 0;
  Object.keys(freq).filter(nome => freq[nome] >= 2).sort().forEach(nome => {
    corPorTransportadora[nome] = paleta[idxCor % paleta.length];
    idxCor++;
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margem = 10;
  const larguraUtil = pageWidth - margem * 2;

  // ✅ Ajuste proporcional das colunas (total = larguraUtil)
  const colWidths = [18, 30, 60, 55, 27];
  const rowHeight = 7; // mais compacto para caber mais linhas
  let y = 18;

  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR").replace(/\//g, "-");
  const horaFormatada = agora.toLocaleTimeString("pt-BR").replace(/:/g, "-");

  doc.setFontSize(12);
    doc.text(
    `Relatório de Cargas Braspolpa — Gerado em: ${dataFormatada} às ${horaFormatada}`,
   pageWidth / 2,
    15,
    { align: "center" }
  );

  // Cabeçalho estiloso
  let x = margem;
  dados[0].forEach((texto, j) => {
    doc.setDrawColor(0);
    doc.setFillColor(220, 220, 220); // fundo cinza claro
    doc.rect(x, y, colWidths[j], rowHeight, "F"); // preenchido
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(texto.toString(), x + colWidths[j] / 2, y + 5, { align: "center" }); // centralizado
    x += colWidths[j];
  });
  y += rowHeight;

  // Linhas
  for (let i = 1; i < dados.length; i++) {
    x = margem;
    const linha = dados[i];
    const transportadora = (linha[2] || "").trim();
    const cor = corPorTransportadora[transportadora] || [0, 0, 0];

    for (let j = 0; j < linha.length; j++) {
      doc.setDrawColor(...cor);
      doc.setLineWidth(0.2);
      doc.rect(x, y, colWidths[j], rowHeight);

      doc.setFont(undefined, "normal");
      doc.setFontSize(8); // menor para caber mais
      doc.setTextColor(...cor);
      doc.text(linha[j].toString(), x + colWidths[j] / 2, y + 5, { align: "center" }); // centralizado

      x += colWidths[j];
    }
    y += rowHeight;

    if (y > 280) {
      doc.addPage();
      y = 30;

      // Repete cabeçalho em nova página
      x = margem;
      dados[0].forEach((texto, j) => {
        doc.setDrawColor(0);
        doc.setFillColor(220, 220, 220);
        doc.rect(x, y, colWidths[j], rowHeight, "F");
        doc.setFont(undefined, "bold");
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.text(texto.toString(), x + colWidths[j] / 2, y + 5, { align: "center" });
        x += colWidths[j];
      });
      y += rowHeight;
    }
  }

  const nomeArquivo = `Relatorio_Carregamento_Braspolpa_${dataFormatada}_${horaFormatada}.pdf`;
  doc.save(nomeArquivo);
}


//
// ✅ Marcar saída
//
async function marcarSaida(botao) {
  const linha = botao.closest("tr");
  const numero = parseInt(linha.dataset.numero, 10);

  const campoData = linha.querySelector('input[type="date"]');
  const campoCliente = linha.querySelectorAll('input[type="text"]')[0];
  const campoNome = linha.querySelectorAll('input[type="text"]')[1];
  const campoHorario = linha.querySelector('input[type="time"]');

  const data = (campoData?.value || "").trim();
  const transportadora = (campoCliente?.value || "").trim();
  const nome = (campoNome?.value || "").trim();
  const horario = (campoHorario?.value || "").trim();

  if (!confirm("⚠ Confirmar saída da carga?")) return;

  if (!data || !nome || !horario) {
    alert("⚠ Para marcar como 'Saiu', preencha: Data, Nome do Motorista e Horário de Saída.");
    return;
  }

  const estadoGlobal = await carregarEstadoGlobal();
  const item = estadoGlobal.controle[numero - 1] || {};

  // 👉 Nova regra: permitir marcar pendências mesmo fora da ordem
  if (numero !== estadoGlobal.marcadorAtual && item.status !== "pulou") {
    alert(`⚠ Você só pode marcar a carga número ${estadoGlobal.marcadorAtual} neste momento.`);
    return;
  }

  estadoGlobal.controle[numero - 1] = {
    ...item,
    numero,
    transportadora,
    nome,
    horario,
    data,
    status: "saiu"
  };

  // Se era a carga atual → avança normalmente
  if (numero === estadoGlobal.marcadorAtual) {
    estadoGlobal.marcadorAtual = numero + 1;
  }

  await salvarEstadoGlobal(estadoGlobal);

  linha.classList.add("saida-realizada");
  linha.classList.remove("carga-atual", "pulou-vez");
  desativarLinha(linha);
  adicionarAlerta(linha, "✅ Carga OK");

  await atualizarCargaAtual(estadoGlobal.marcadorAtual);
  rolarParaCargaAtual();
}


//
// 🔁 Pular carga
//
async function pularCarga(botao) {
  const linha = botao.closest("tr");
  const numero = parseInt(linha.dataset.numero, 10);

  const estadoGlobal = await carregarEstadoGlobal();

  // 🚫 Bloqueio: só pode pular se for a carga atual
  if (numero !== estadoGlobal.marcadorAtual) {
    alert(`⚠ Você só pode pular a carga número ${estadoGlobal.marcadorAtual} neste momento.`);
    return;
  }

  if (!confirm("⚠ Marcar carga como pendente?")) return;

  const item = estadoGlobal.controle[numero - 1] || {};

  estadoGlobal.controle[numero - 1] = {
    ...item,
    numero,
    status: "pulou"
  };

  // 👉 Nova regra: apenas avança para a próxima carga
  estadoGlobal.marcadorAtual = numero + 1;

  await salvarEstadoGlobal(estadoGlobal);

  linha.classList.add("pulou-vez");
  linha.classList.remove("carga-atual", "saida-realizada");
  adicionarAlerta(linha, "⚠ Carga com Pendência");

  // Atualiza visual sem reload
  await atualizarCargaAtual(estadoGlobal.marcadorAtual);
  rolarParaCargaAtual();
}

//
// 🔄 Resetar tabela de cargas
//
async function resetarTabelaControleDeCargas() {
  const senhaCorreta = "portaria03";

  const confirmacao = confirm("⚠ Tem certeza que deseja resetar a tabela?\nIsso vai reiniciar a lista e limpar os dados dos motoristas.");
  if (!confirmacao) return;

  const senhaDigitada = prompt("🔐 Digite a senha para confirmar o reset:");
  if (senhaDigitada !== senhaCorreta) {
    alert("❌ Senha incorreta. O reset foi cancelado.");
    return;
  }

  const estadoGlobal = await carregarEstadoGlobal();

  estadoGlobal.controle = [];
  estadoGlobal.marcadorAtual = 1;

  await salvarEstadoGlobal(estadoGlobal);

  await gerarTabelaControleDeCargas();
  await restaurarEstadoControleDeCargas();
  rolarParaCargaAtual();

  alert("✅ Tabela e painel do motorista foram resetados com sucesso.");
}

//
// ========= Inicialização =========
document.addEventListener("DOMContentLoaded", async () => {
  await gerarTabelaControleDeCargas();
  await preencherTabelaAgendamentoSemanal();
  await restaurarEstadoControleDeCargas();
  rolarParaCargaAtual();
});
