const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 3000;
const arquivo = path.join(__dirname, "estado.json");

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// 🔧 Garante que o arquivo estado.json exista
function garantirArquivo() {
  if (!fs.existsSync(arquivo)) {
    const estruturaInicial = {
      transportadoras: [],
      cargas: [],
      agendamento: [],
      controle: [],
      marcadorAtual: 1
    };
    fs.writeFileSync(arquivo, JSON.stringify(estruturaInicial, null, 2), "utf8");
    console.log("📂 Arquivo estado.json criado com estrutura inicial.");
  }
}

// 🔧 Ler JSON
function lerEstado() {
  garantirArquivo();
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

// 🔧 Salvar JSON
function salvarEstado(estado) {
  fs.writeFileSync(arquivo, JSON.stringify(estado, null, 2), "utf8");
}

/* ---------------- ROTAS DE CADASTRO ---------------- */

app.post("/cadastro", (req, res) => {
  const estado = lerEstado();
  const { transportadora, motorista, contato, responsavel, contatoResponsavel } = req.body;

  if (!transportadora || !motorista || !contato) {
    return res.status(400).json({ message: "Transportadora, motorista e contato são obrigatórios." });
  }

  const novoCadastro = {
    transportadora: transportadora.trim(),
    motorista: motorista.trim(),
    contato: contato.trim(),
    responsavel: responsavel ? responsavel.trim() : "",
    contatoResponsavel: contatoResponsavel ? contatoResponsavel.trim() : ""
  };

  estado.transportadoras.push(novoCadastro);
  salvarEstado(estado);

  io.emit("estadoAtualizado", estado);

  res.json({ message: "Cadastro salvo com sucesso!" });
});

app.get("/cadastros", (req, res) => {
  const estado = lerEstado();
  res.json(estado.transportadoras);
});

app.put("/cadastro/:index", (req, res) => {
  const estado = lerEstado();
  const index = parseInt(req.params.index, 10);
  const { transportadora, motorista, contato } = req.body;

  if (index < 0 || index >= estado.transportadoras.length) {
    return res.status(404).json({ message: "Cadastro não encontrado." });
  }

  estado.transportadoras[index].transportadora = transportadora.trim();
  estado.transportadoras[index].motorista = motorista.trim();
  estado.transportadoras[index].contato = contato.trim();

  salvarEstado(estado);

  io.emit("estadoAtualizado", estado);

  res.json({ message: "Cadastro atualizado com sucesso!" });
});

app.delete("/cadastro/:index", (req, res) => {
  const estado = lerEstado();
  const index = parseInt(req.params.index, 10);

  if (index < 0 || index >= estado.transportadoras.length) {
    return res.status(404).json({ message: "Cadastro não encontrado." });
  }

  estado.transportadoras.splice(index, 1);
  salvarEstado(estado);

  io.emit("estadoAtualizado", estado);

  res.json({ message: "Cadastro removido com sucesso!" });
});

// 🔧 Atualizar responsável
app.put("/atualizarResponsavel", (req, res) => {
  const { transportadora, responsavel } = req.body;
  const estado = lerEstado();

  estado.transportadoras.forEach(c => {
    if (c.transportadora === transportadora) {
      c.responsavel = responsavel;
    }
  });

  salvarEstado(estado);
  io.emit("estadoAtualizado", estado);

  res.json({ message: "Responsável atualizado com sucesso!" });
});

// 🔧 Atualizar contato do responsável
app.put("/atualizarContatoResponsavel", (req, res) => {
  const { transportadora, contatoResponsavel } = req.body;
  const estado = lerEstado();

  estado.transportadoras.forEach(c => {
    if (c.transportadora === transportadora) {
      c.contatoResponsavel = contatoResponsavel;
    }
  });

  salvarEstado(estado);
  io.emit("estadoAtualizado", estado);

  res.json({ message: "Contato do responsável atualizado com sucesso!" });
});

/* ---------------- ROTAS DE PAINEL ---------------- */

app.get("/painel", (req, res) => {
  const estado = lerEstado();
  res.json(estado);
});

app.get("/painel-motorista", (req, res) => {
  const estado = lerEstado();
  res.json(estado);
});

app.post("/painel", (req, res) => {
  const estado = lerEstado();
  const { cargas, agendamento, controle, transportadoras, marcadorAtual } = req.body;

  if (Array.isArray(cargas)) estado.cargas = cargas;
  if (Array.isArray(agendamento)) estado.agendamento = agendamento;
  if (Array.isArray(controle)) {
    estado.controle = controle.map((novo, i) => {
      const antigo = estado.controle[i] || {};
      return {
        numero: novo.numero ?? antigo.numero ?? i + 1,
        transportadora: (novo.transportadora ?? antigo.transportadora ?? "").trim(),
        nome: (novo.nome ?? antigo.nome ?? "").trim(),
        horario: novo.horario ?? antigo.horario ?? "",
        data: novo.data ?? antigo.data ?? "",
        status: novo.status ?? antigo.status ?? "pendente"
      };
    });
  }
  if (Array.isArray(transportadoras)) estado.transportadoras = transportadoras;
  if (marcadorAtual !== undefined) estado.marcadorAtual = marcadorAtual;

  salvarEstado(estado);
  io.emit("estadoAtualizado", estado);

  res.json({ message: "Painel atualizado com sucesso!" });
});

/* ---------------- ROTAS DE AGENDAMENTO ---------------- */

app.post("/agendamento", (req, res) => {
  const estado = lerEstado();
  const { transportadora, dias } = req.body;

  if (!transportadora || !Array.isArray(dias) || dias.length !== 7) {
    return res.status(400).json({ message: "Transportadora e 7 dias são obrigatórios." });
  }

  const novoAgendamento = {
    transportadora: transportadora.trim(),
    dias: dias.map(d => d || ""),
    status: Array(7).fill("não confirmado")
  };

  estado.agendamento.push(novoAgendamento);
  salvarEstado(estado);

  io.emit("estadoAtualizado", estado);

  res.json({ message: "Agendamento criado com sucesso!" });
});

app.get("/agendamentos", (req, res) => {
  const estado = lerEstado();
  res.json(estado.agendamento);
});

app.put("/agendamento/:index/:dia", (req, res) => {
  const estado = lerEstado();
  const index = parseInt(req.params.index, 10);
  const dia = parseInt(req.params.dia, 10);

  if (index < 0 || index >= estado.agendamento.length) {
    return res.status(404).json({ message: "Agendamento não encontrado." });
  }
  if (dia < 0 || dia > 6) {
    return res.status(400).json({ message: "Dia inválido (0 a 6)." });
  }

  const hoje = new Date().getDay();
  if (dia !== hoje) {
    return res.status(400).json({ message: "Só é possível confirmar/desmarcar no dia atual." });
  }

  const agendamento = estado.agendamento[index];
  if (!agendamento.status) agendamento.status = Array(7).fill("não confirmado");

  agendamento.status[dia] = agendamento.status[dia] === "confirmado" ? "não confirmado" : "confirmado";

  salvarEstado(estado);
  io.emit("estadoAtualizado", estado);

  res.json({ message: `Status do agendamento atualizado para ${agendamento.status[dia]}.` });
});

app.delete("/agendamento/:index", (req, res) => {
  const estado = lerEstado();
  const index = parseInt(req.params.index, 10);

  if (index < 0 || index >= estado.agendamento.length) {
    return res.status(404).json({ message: "Agendamento não encontrado." });
  }

  estado.agendamento.splice(index, 1);
  salvarEstado(estado);

  io.emit("estadoAtualizado", estado);

  res.json({ message: "Agendamento removido com sucesso!" });
});
/* ---------------- SOCKET.IO ---------------- */

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado");

  const estado = lerEstado();
  socket.emit("estadoInicial", estado);

  // Atualização geral do painel
  socket.on("atualizarPainel", (novoEstado) => {
    const estadoAtual = lerEstado();

    const estado = {
      transportadoras: Array.isArray(novoEstado.transportadoras) ? novoEstado.transportadoras : estadoAtual.transportadoras,
      cargas: Array.isArray(novoEstado.cargas) ? novoEstado.cargas : estadoAtual.cargas,
      agendamento: Array.isArray(novoEstado.agendamento) ? novoEstado.agendamento : estadoAtual.agendamento,
      controle: Array.isArray(novoEstado.controle) ? novoEstado.controle : estadoAtual.controle,
      marcadorAtual: novoEstado.marcadorAtual !== undefined ? novoEstado.marcadorAtual : estadoAtual.marcadorAtual
    };

    salvarEstado(estado);
    io.emit("estadoAtualizado", estado);
    console.log("📢 Painel atualizado via socket.io");
  });

  // Atualização específica do motorista
  socket.on("atualizarMotorista", ({ numero, nome, horario }) => {
    const estado = lerEstado();
    const item = estado.controle.find(c => c.numero === numero);
    if (item) {
      item.nome = nome;
      item.horario = horario;
      item.status = nome ? "saiu" : (item.status === "pulou" ? "pulou" : "pendente");

      salvarEstado(estado);

      io.emit("estadoAtualizado", {
        cargas: estado.cargas,
        controle: estado.controle,
        agendamento: estado.agendamento,
        transportadoras: estado.transportadoras,
        marcadorAtual: estado.marcadorAtual
      });

      console.log(`🚛 Motorista atualizado na carga ${numero}: ${nome || "(desmarcado)"} ${horario || ""}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
