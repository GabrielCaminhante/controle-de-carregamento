const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 Conexão com PostgreSQL (Render fornece DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

/* ---------------- ROTAS DE CADASTRO ---------------- */

app.post("/cadastro", async (req, res) => {
  const { transportadora, motorista, contato, responsavel, contatoResponsavel } = req.body;

  if (!transportadora || !motorista || !contato) {
    return res.status(400).json({ message: "Transportadora, motorista e contato são obrigatórios." });
  }

  await pool.query(
    `INSERT INTO transportadoras (transportadora, motorista, contato, responsavel, contato_responsavel)
     VALUES ($1, $2, $3, $4, $5)`,
    [transportadora.trim(), motorista.trim(), contato.trim(), responsavel?.trim() || "", contatoResponsavel?.trim() || ""]
  );

  const result = await pool.query("SELECT * FROM transportadoras");
  io.emit("estadoAtualizado", { transportadoras: result.rows });

  res.json({ message: "Cadastro salvo com sucesso!" });
});

app.get("/cadastros", async (req, res) => {
  const result = await pool.query("SELECT * FROM transportadoras");
  res.json(result.rows);
});

app.put("/cadastro/:id", async (req, res) => {
  const { id } = req.params;
  const { transportadora, motorista, contato, responsavel, contatoResponsavel } = req.body;

  await pool.query(
    `UPDATE transportadoras 
     SET transportadora = COALESCE($1, transportadora),
         motorista = COALESCE($2, motorista),
         contato = COALESCE($3, contato),
         responsavel = COALESCE($4, responsavel),
         contato_responsavel = COALESCE($5, contato_responsavel)
     WHERE id = $6`,
    [
      transportadora?.trim() || null,
      motorista?.trim() || null,
      contato?.trim() || null,
      responsavel?.trim() || null,
      contatoResponsavel?.trim() || null,
      id
    ]
  );

  const result = await pool.query("SELECT * FROM transportadoras");
  io.emit("estadoAtualizado", { transportadoras: result.rows });

  res.json({ message: "Cadastro atualizado com sucesso!" });
});

  const result = await pool.query("SELECT * FROM transportadoras");
  io.emit("estadoAtualizado", { transportadoras: result.rows });

  res.json({ message: "Cadastro atualizado com sucesso!" });
});

app.delete("/cadastro/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM transportadoras WHERE id=$1", [id]);

  const result = await pool.query("SELECT * FROM transportadoras");
  io.emit("estadoAtualizado", { transportadoras: result.rows });

  res.json({ message: "Cadastro removido com sucesso!" });
});

/* ---------------- ROTAS DE AGENDAMENTO ---------------- */

app.post("/agendamento", async (req, res) => {
  const { transportadora, dias } = req.body;

  if (!transportadora || !Array.isArray(dias) || dias.length !== 7) {
    return res.status(400).json({ message: "Transportadora e 7 dias são obrigatórios." });
  }

  await pool.query(
    `INSERT INTO agendamentos (transportadora, dias, status)
     VALUES ($1, $2, $3)`,
    [transportadora.trim(), dias, Array(7).fill("não confirmado")]
  );

  const result = await pool.query("SELECT * FROM agendamentos");
  io.emit("estadoAtualizado", { agendamento: result.rows });

  res.json({ message: "Agendamento criado com sucesso!" });
});

app.get("/agendamentos", async (req, res) => {
  const result = await pool.query("SELECT * FROM agendamentos");
  res.json(result.rows);
});

/* ---------------- SOCKET.IO ---------------- */

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", async (socket) => {
  console.log("🔌 Cliente conectado");

  // Envia estado inicial
  const transportadoras = await pool.query("SELECT * FROM transportadoras");
  const agendamentos = await pool.query("SELECT * FROM agendamentos");

  socket.emit("estadoInicial", {
    transportadoras: transportadoras.rows,
    agendamento: agendamentos.rows
  });

  // Atualização via socket
  socket.on("atualizarPainel", async () => {
    const transportadoras = await pool.query("SELECT * FROM transportadoras");
    const agendamentos = await pool.query("SELECT * FROM agendamentos");

    io.emit("estadoAtualizado", {
      transportadoras: transportadoras.rows,
      agendamento: agendamentos.rows
    });
    console.log("📢 Painel atualizado via socket.io");
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

