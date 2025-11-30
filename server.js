// Carrega variáveis do arquivo .env
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;


// 🔧 Conexão com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========= Sessão =========
app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "session"
    }),
    secret: process.env.SESSION_SECRET || "chave-secreta",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
  })
);

// ========= Autenticação =========
function autenticar(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }
  res.status(401).json({ message: "Acesso negado. Faça login." });
}

function autenticarAdmin(req, res, next) {
  if (req.session?.usuario?.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Acesso restrito ao administrador." });
}

// ========= ROTAS DE CARGAS =========
// Criar carga (mesmo vazia)
app.post("/cargas", autenticarAdmin, async (req, res) => {
  const { transportadora_id, transportadora_nome } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO cargas (transportadora_id, transportadora_nome)
       VALUES ($1, $2) RETURNING *`,
      [transportadora_id || null, transportadora_nome || ""]
    );
    io.emit("estadoAtualizado", { cargas: (await pool.query("SELECT * FROM cargas ORDER BY id ASC")).rows });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao salvar carga:", err);
    res.status(500).json({ message: "Erro ao salvar carga." });
  }
});

// Atualizar carga
app.put("/cargas/:id", autenticarAdmin, async (req, res) => {
  const { id } = req.params;
  const { transportadora_id, transportadora_nome } = req.body;
  try {
    const result = await pool.query(
      `UPDATE cargas
       SET transportadora_id = COALESCE($1, transportadora_id),
           transportadora_nome = COALESCE($2, transportadora_nome)
       WHERE id = $3 RETURNING *`,
      [transportadora_id || null, transportadora_nome || null, id]
    );
    io.emit("estadoAtualizado", { cargas: (await pool.query("SELECT * FROM cargas ORDER BY id ASC")).rows });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar carga:", err);
    res.status(500).json({ message: "Erro ao atualizar carga." });
  }
});

// Listar cargas
app.get("/cargas", autenticarAdmin, async (req, res) => {
  const result = await pool.query("SELECT * FROM cargas ORDER BY id ASC");
  res.json(result.rows);
});

// ========= ROTAS DE AGENDAMENTOS =========
// Criar agendamento (mesmo vazio)
app.post("/agendamento", autenticarAdmin, async (req, res) => {
  const { transportadora_id, transportadora_nome, segunda, terca, quarta, quinta, sexta, sabado, domingo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agendamentos 
       (transportadora_id, transportadora_nome, segunda, terca, quarta, quinta, sexta, sabado, domingo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        transportadora_id || null,
        transportadora_nome || "",
        segunda || null,
        terca || null,
        quarta || null,
        quinta || null,
        sexta || null,
        sabado || null,
        domingo || null
      ]
    );
    io.emit("estadoAtualizado", { agendamentos: (await pool.query("SELECT * FROM agendamentos ORDER BY id ASC")).rows });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao salvar agendamento:", err);
    res.status(500).json({ message: "Erro ao salvar agendamento." });
  }
});

// Atualizar agendamento
app.put("/agendamento/:id", autenticarAdmin, async (req, res) => {
  const { id } = req.params;
  const { transportadora_id, transportadora_nome, segunda, terca, quarta, quinta, sexta, sabado, domingo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agendamentos
       SET transportadora_id = COALESCE($1, transportadora_id),
           transportadora_nome = COALESCE($2, transportadora_nome),
           segunda = COALESCE($3, segunda),
           terca = COALESCE($4, terca),
           quarta = COALESCE($5, quarta),
           quinta = COALESCE($6, quinta),
           sexta = COALESCE($7, sexta),
           sabado = COALESCE($8, sabado),
           domingo = COALESCE($9, domingo)
       WHERE id = $10 RETURNING *`,
      [transportadora_id || null, transportadora_nome || null, segunda, terca, quarta, quinta, sexta, sabado, domingo, id]
    );
    io.emit("estadoAtualizado", { agendamentos: (await pool.query("SELECT * FROM agendamentos ORDER BY id ASC")).rows });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar agendamento:", err);
    res.status(500).json({ message: "Erro ao atualizar agendamento." });
  }
});

// Listar agendamentos
app.get("/agendamentos", autenticarAdmin, async (req, res) => {
  const result = await pool.query("SELECT * FROM agendamentos ORDER BY id ASC");
  res.json(result.rows);
});

// ========= ROTAS DE CADASTROS =========
app.get("/cadastros", autenticarAdmin, async (req, res) => {
  const result = await pool.query("SELECT * FROM transportadoras ORDER BY transportadora ASC");
  res.json(result.rows);
});

// ========= Inicialização =========
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// ========= SOCKET.IO =========
io.on("connection", async (socket) => {
  console.log("🔌 Cliente conectado");

  try {
    const transportadoras = await pool.query("SELECT * FROM transportadoras ORDER BY transportadora ASC");
    const agendamentos = await pool.query("SELECT * FROM agendamentos ORDER BY id ASC");
    const cargas = await pool.query("SELECT * FROM cargas ORDER BY id ASC");

    // envia estado inicial para o cliente conectado
    socket.emit("estadoInicial", {
      transportadoras: transportadoras.rows,
      agendamentos: agendamentos.rows,
      cargas: cargas.rows
    });

    // quando algum cliente solicitar atualização
    socket.on("atualizarPainel", async () => {
      const transportadoras = await pool.query("SELECT * FROM transportadoras ORDER BY transportadora ASC");
      const agendamentos = await pool.query("SELECT * FROM agendamentos ORDER BY id ASC");
      const cargas = await pool.query("SELECT * FROM cargas ORDER BY id ASC");

      io.emit("estadoAtualizado", {
        transportadoras: transportadoras.rows,
        agendamentos: agendamentos.rows,
        cargas: cargas.rows
      });
      console.log("📢 Painel atualizado via socket.io");
    });
  } catch (err) {
    console.error("Erro ao carregar dados iniciais para socket:", err);
  }
});
