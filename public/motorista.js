const API_URL = "http://localhost:3000";

// 📋 Gera tabela principal do painel do motorista (somente visual)
function gerarTabelaMotorista(estadoGlobal) {
  const tabelaMotorista = document.querySelector("#tabela-motorista tbody");
  tabelaMotorista.innerHTML = "";

  const controle = estadoGlobal.controle || [];
  const marcadorAtual = estadoGlobal.marcadorAtual || 1;

  controle.forEach(item => {
    const linha = document.createElement("tr");

    // Aplica cores conforme status
    if (item.status === "saiu" || item.status === "confirmado" || item.status === "carga ok") {
      linha.classList.add("saida-realizada"); // verde
    } else if (item.status === "pulou") {
      linha.classList.add("pulou-vez"); // vermelho
    } else if (item.numero === marcadorAtual) {
      linha.classList.add("carga-atual"); // amarelo
    }

    linha.innerHTML = `
      <td>${item.transportadora || "-"}</td>
      <td>${item.nome || "-"}</td>
      <td>${item.horario || "-"}</td>
      <td>${item.numero}</td>
      <td>
        ${item.numero === marcadorAtual ? "🚩 Carga Atual" : item.status || ""}
      </td>
    `;

    tabelaMotorista.appendChild(linha);
  });
}

// 📢 Exibe alertas de agendamentos do dia
function exibirAlertaCarretas(estadoGlobal) {
  const agendamentos = estadoGlobal.agendamento || [];
  const alertaDiv = document.getElementById("alerta-carretas");
  alertaDiv.innerHTML = "";

  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const diasNomes = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
  ];
  const nomeDia = diasNomes[diaSemana];

  let encontrou = false;

  agendamentos.forEach(item => {
    const horarioHoje = item.dias?.[diaSemana];
    const statusHoje = item.status?.[diaSemana] || "não confirmado";

    if (horarioHoje) {
      const alertaItem = document.createElement("div");
      alertaItem.classList.add("alerta-carreta-item");

      // 👉 Mostra horário + status
      alertaItem.innerHTML = `
        <strong>Transportadora:</strong> ${item.transportadora}<br>
        <strong>${nomeDia}:</strong> ${horarioHoje}<br>
        <strong>Status:</strong> ${statusHoje === "confirmado" ? "✅ Confirmado" : "❌ Não confirmado"}
      `;

      alertaDiv.appendChild(alertaItem);
      encontrou = true;
    }
  });

  if (!encontrou) {
    const vazioItem = document.createElement("div");
    vazioItem.classList.add("alerta-carreta-item");
    vazioItem.textContent = "📭 Nenhuma carga agendada para hoje.";
    alertaDiv.appendChild(vazioItem);
  }
}


// 🚀 Inicialização
async function carregarPainelMotorista() {
  try {
    const response = await fetch(`${API_URL}/painel`);
    const estadoGlobal = await response.json();

    gerarTabelaMotorista(estadoGlobal);
    exibirAlertaCarretas(estadoGlobal);
  } catch (err) {
    console.error("Erro ao carregar painel do motorista:", err);
    const tabelaMotorista = document.querySelector("#tabela-motorista tbody");
    tabelaMotorista.innerHTML = "<tr><td colspan='5' style='color:red'>Erro ao carregar painel.</td></tr>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarPainelMotorista();
});
