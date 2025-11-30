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
const PORT = process.env.PORT || 3000;

// 🔧 Conexão com PostgreSQL
const isLocal = process.env.NODE_ENV === "development";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middlewares globais
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
    return next();
  }

  if (!req.session.usuario) {
    return res.redirect("/index.html");
  }

  next();
});

// 🔧 Arquivos estáticos
app.use(express.static("public"));

/* ---------------- ROTAS HTML PROTEGIDAS ---------------- */
app.get("/cadastro.html", (req, res) => {
  if (!req.session.usuario || req.session.usuario.role !== "admin") {
    return res.redirect("/index.html");
  }
  res.sendFile(__dirname + "/public/cadastro.html");
});

app.get("/admin.html", (req, res) => {
  if (!req.session.usuario || req.session.usuario.role !== "admin") {
    return res.redirect("/index.html");
  }
  res.sendFile(__dirname + "/public/admin.html");
});

app.get("/motorista.html", (req, res) => {
  if (!req.session.usuario || req.session.usuario.role !== "motorista") {
    return res.redirect("/index.html");
  }
  res.sendFile(__dirname + "/public/motorista.html");
});

app.get("/controle.html", (req, res) => {
  if (!req.session.usuario) {
    return res.redirect("/index.html");
  }
  res.sendFile(__dirname + "/public/controle.html");
});

/* ---------------- MIDDLEWARES DE AUTENTICAÇÃO ---------------- */
function autenticar(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  } else {
    return res.status(401).json({ message: "Acesso negado. Faça login." });
  }
}

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
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ message: "Usuário não encontrado." });
    if (user.role !== role) return res.status(401).json({ message: "Tipo de login inválido." });

    const valido = await bcrypt.compare(password, user.password);
    if (!valido) return res.status(401).json({ message: "Senha incorreta." });

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

/* ---------------- ROTAS DE TRANSPORTADORAS ---------------- */
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

/* ---------------- ROTAS DE AGENDAMENTOS ---------------- */
app.post("/agendamento", autenticar, async (req, res) => {
  const { transportadora_id, transportadora_nome, dias } = req.body;

  if (!transportadora_nome || !Array.isArray(dias) || dias.length !== 7) {
    return res.status(400).json({ message: "Transportadora e 7 dias são obrigatórios." });
  }

  await pool.query(
    `INSERT INTO agendamentos 
     (transportadora_id, transportadora_nome, segunda, terca, quarta, quinta, sexta, sabado, domingo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      transportadora_id,
      transportadora_nome.trim(),
      dias[0], dias[1], dias[2], dias[3], dias[4], dias[5], dias[6]
    ]
  );

  const result = await pool.query("SELECT * FROM agendamentos");
  io.emit("estadoAtualizado", { agendamentos: result.rows });

  res.json({ message: "Agendamento criado com sucesso!" });
});

app.get("/agendamentos", autenticar, async (req, res) => {
  const result = await pool.query("SELECT * FROM agendamentos");
  res.json(result.rows);
});

/* ---------------- ROTAS DE CARGAS ---------------- */
app.post("/cargas", autenticarAdmin, async (req, res) => {
  const { transportadora_id, transportadora_nome } = req.body;

  if (!transportadora_id || !transportadora_nome) {
    return res.status(400).json({ message: "Transportadora é obrigatória." });
  }

  await pool.query(
    `INSERT INTO cargas (transportadora_id, transportadora_nome) VALUES ($1, $2)`,
    [transportadora_id, transportadora_nome.trim()]
  );

  const result = await pool.query("SELECT * FROM cargas");
  io.emit("estadoAtualizado", { cargas: result.rows });

  res.json({ message: "Carga cadastrada com sucesso!" });
});

app.get("/cargas", autenticar, async (req, res) => {
  const result = await pool.query("SELECT * FROM cargas");
  res.json(result.rows);
});

/* ---------------- SOCKET.IO ---------------- */
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", async (socket) => {
  console.log("🔌 Cliente conectado");

  const transportadoras = await pool.query("SELECT * FROM transportadoras");
  const agendamentos = await pool.query("SELECT * FROM agendamentos");
  const cargas = await pool.query("SELECT * FROM cargas");

  socket.emit("estadoInicial", {
    transportadoras: transportadoras.rows,
    agendamentos: agendamentos.rows,
    cargas: cargas.rows
  });

  socket.on("atualizarPainel", async () => {
    const transportadoras = await pool.query("SELECT * FROM transportadoras");
    const agendamentos = await pool.query("SELECT * FROM agendamentos");
    const cargas = await pool.query("SELECT * FROM cargas");

    io.emit("estadoAtualizado", {
      transportadoras: transportadoras.rows,
      agendamentos: agendamentos.rows,
      cargas: cargas.rows
    });
    console.log("📢 Painel atualizado via socket.io");
  });
});

/* ---------------- START SERVER ---------------- */
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
