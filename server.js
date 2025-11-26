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

// ✅ Teste das variáveis de ambiente
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "OK" : "NÃO DEFINIDO");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "OK" : "NÃO DEFINIDO");
console.log("ADMIN_PASSWORD_HASH:", process.env.ADMIN_PASSWORD_HASH ? "OK" : "NÃO DEFINIDO");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 Conexão com PostgreSQL (Render fornece DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(cors());

// 🔧 Configuração de sessão
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: "session"
  }),
  secret: process.env.SESSION_SECRET || "chave-secreta",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 1 dia
  }
}));

// 🔒 Middleware global de proteção
app.use((req, res, next) => {
  if (
    req.path === "/" ||
    req.path === "/index.html" ||
    req.path.startsWith("/login") ||
    req.path.startsWith("/logout")
  ) {
    return next(); // libera login, logout e index
  }

  if (!req.session.usuario) {
    return res.redirect("/index.html"); // bloqueia quem não tem sessão
  }

  next(); // deixa passar quem está logado
});

// 🔧 Só depois libera arquivos estáticos
app.use(express.static("public"));

// 🔧 Middleware de autenticação
function autenticar(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  } else {
    return res.status(401).json({ message: "Acesso negado. Faça login." });
  }
}

// 🔧 Middleware para restringir admin
function autenticarAdmin(req, res, next) {
  if (req.session?.usuario?.role === "admin") {
    return next();
  } else {
    return res.status(403).json({ message: "Acesso restrito ao administrador." });
  }
}

/* ---------------- ROTAS DE LOGIN ---------------- */
app.post("/login", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    // busca usuário no banco
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    // confere role
    if (user.role !== role) {
      return res.status(401).json({ message: "Tipo de login inválido para este usuário." });
    }

    // compara senha com hash
    const valido = await bcrypt.compare(password, user.password);
    if (!valido) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    // salva sessão
    req.session.usuario = { id: user.id, username: user.username, role: user.role };
    res.json({ message: "Login realizado com sucesso!" });

  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logout realizado." });
  });
});

/* ---------------- ROTAS DE CADASTRO ---------------- */
app.post("/cadastro", autenticarAdmin, async (req, res) => {
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

app.get("/cadastros", autenticar, async (req, res) => {
  const result = await pool.query("SELECT * FROM transportadoras");
  res.json(result.rows);
});

app.put("/cadastro/:id", autenticarAdmin, async (req, res) => {
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

app.delete("/cadastro/:id", autenticarAdmin, async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM transportadoras WHERE id=$1", [id]);

  const result = await pool.query("SELECT * FROM transportadoras");
  io.emit("estadoAtualizado", { transportadoras: result.rows });

  res.json({ message: "Cadastro removido com sucesso!" });
});

/* ---------------- ROTAS DE AGENDAMENTO ---------------- */
app.post("/agendamento", autenticar, async (req, res) => {
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

app.get("/agendamentos", autenticar, async (req, res) => {
  const result = await pool.query("SELECT * FROM agendamentos");
  res.json(result.rows);
});

/* ---------------- SOCKET.IO ---------------- */
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", async (socket) => {
  console.log("🔌 Cliente conectado");

  const transportadoras = await pool.query("SELECT * FROM transportadoras");
  const agendamentos = await pool.query("SELECT * FROM agendamentos");

  socket.emit("estadoInicial", {
    transportadoras: transportadoras.rows,
    agendamento: agendamentos.rows
  });

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
