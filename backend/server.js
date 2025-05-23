
const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const db = new sqlite3.Database("noticias.db");

app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "segredo_abrhpe",
  resave: false,
  saveUninitialized: true,
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configuração do multer para upload de imagem
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + ext;
    cb(null, name);
  }
});
const upload = multer({ storage });

// Criação das tabelas
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, senha TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS noticias (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, conteudo TEXT, data TEXT, imagem TEXT)");
  db.get("SELECT * FROM admin WHERE email = ?", ["admin@abrhpe.com"], (err, row) => {
    if (!row) {
      db.run("INSERT INTO admin (email, senha) VALUES (?, ?)", ["admin@abrhpe.com", "123456"]);
    }
  });
});

// Login
app.post("/login", (req, res) => {
  const { email, senha } = req.body;
  db.get("SELECT * FROM admin WHERE email = ? AND senha = ?", [email, senha], (err, row) => {
    if (row) {
      req.session.user = email;
      res.json({ sucesso: true });
    } else {
      res.status(401).json({ erro: "Credenciais inválidas" });
    }
  });
});

// Verifica se está logado
app.get("/auth", (req, res) => {
  res.json({ logado: !!req.session.user });
});

// Adicionar notícia com imagem
app.post("/noticias", upload.single("imagem"), (req, res) => {
  if (!req.session.user) return res.status(401).json({ erro: "Não autorizado" });
  const { titulo, conteudo } = req.body;
  const data = new Date().toISOString().split("T")[0];
  const imagem = req.file ? `/uploads/${req.file.filename}` : null;
  db.run("INSERT INTO noticias (titulo, conteudo, data, imagem) VALUES (?, ?, ?, ?)",
  [titulo, conteudo, data, imagem], function(err) {
    if (err) {
      console.error("Erro ao salvar notícia:", err); // 👈 ADICIONE ISSO
      return res.status(500).json({ erro: "Erro ao salvar notícia" });
    }
    res.json({ sucesso: true, id: this.lastID });
});
});

// Listar notícias
app.get("/noticias", (req, res) => {
  db.all("SELECT * FROM noticias ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar notícias" });
    res.json(rows);
  });
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ sucesso: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando em http://localhost:" + PORT);
});
