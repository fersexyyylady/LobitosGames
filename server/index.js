// server/index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
// Microservicios
const catalogService = require("./routes/microservices/catalogService");
const notifyService = require("./routes/microservices/notifyService");
const analyticsService = require("./routes/microservices/analyticsService");

const app = express();

// ── Logs de acceso a archivo ──────────────────────────────────────────────────
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
const accessLogStream = fs.createWriteStream(path.join(logsDir, "access.log"), {
  flags: "a",
});
app.use(morgan("combined", { stream: accessLogStream }));
app.use(morgan("dev")); // también en consola

// ── Helmet (headers de seguridad) ─────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Origen no permitido por CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Rate limiting global ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones. Intenta en 15 minutos." },
});
app.use(globalLimiter);

// Rate limit estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Demasiados intentos de autenticación." },
});

// ── Middleware de log de seguridad ────────────────────────────────────────────
app.use((req, res, next) => {
  const suspicious =
    req.path.includes("..") ||
    req.path.includes("<script") ||
    /['";<>]/.test(req.query?.toString() || "");
  if (suspicious) {
    const secLog = path.join(logsDir, "security.log");
    const entry = `[${new Date().toISOString()}] SUSPICIOUS ${req.method} ${req.path} IP:${req.ip} UA:${req.headers["user-agent"]}\n`;
    fs.appendFileSync(secLog, entry);
    return res.status(400).json({ error: "Petición no permitida." });
  }
  next();
});

// ── Rutas API principal ───────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// ── Microservicios ────────────────────────────────────────────────────────────
app.use("/api/catalog", catalogService);
app.use("/api/notify", notifyService);
app.use("/api/analytics", analyticsService);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) =>
  res.json({
    status: "ok",
    time: new Date(),
    env: process.env.NODE_ENV || "development",
    services: ["auth", "users", "admin", "catalog", "notify", "analytics"],
  }),
);

// ── Deshabilitar info del servidor en producción ──────────────────────────────
app.disable("x-powered-by");

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  const secLog = path.join(logsDir, "security.log");
  fs.appendFileSync(
    secLog,
    `[${new Date().toISOString()}] 404 ${req.method} ${req.path} IP:${req.ip}\n`,
  );
  res.status(404).json({ error: "Endpoint no encontrado" });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[Server Error]", err.message);
  // En producción no exponer detalles del error
  const isDev = process.env.NODE_ENV !== "production";
  res.status(500).json({
    error: "Error interno del servidor",
    ...(isDev && { detail: err.message }),
  });
});

// ── Conectar MongoDB y levantar servidor ──────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lobitosgames";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB conectado:", MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${PORT}`);
      console.log(`📋 Logs en: ${logsDir}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error MongoDB:", err);
    process.exit(1);
  });
