// server/routes/microservices/analyticsService.js
// Microservicio 3: Analíticas y monitoreo del sistema
// Patrón: Singleton para el store de métricas en memoria

const router = require("express").Router();
const {
  authenticate,
  requirePermission,
} = require("../../middleware/authMiddleware");
const User = require("../../models/User");
const Session = require("../../models/Session");
const fs = require("fs");
const path = require("path");

// ── Singleton: store de métricas ──────────────────────────────────────────────
class MetricsStore {
  constructor() {
    if (MetricsStore._instance) return MetricsStore._instance;
    this.requests = 0;
    this.errors = 0;
    this.loginAttempts = 0;
    this.failedLogins = 0;
    this.startTime = Date.now();
    MetricsStore._instance = this;
  }

  increment(key) {
    this[key] = (this[key] || 0) + 1;
  }

  getSummary() {
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      requests: this.requests,
      errors: this.errors,
      loginAttempts: this.loginAttempts,
      failedLogins: this.failedLogins,
      successRate: this.loginAttempts
        ? (
            ((this.loginAttempts - this.failedLogins) / this.loginAttempts) *
            100
          ).toFixed(1) + "%"
        : "N/A",
    };
  }
}

const metrics = new MetricsStore();

// Middleware para contar peticiones
router.use((req, res, next) => {
  metrics.increment("requests");
  res.on("finish", () => {
    if (res.statusCode >= 500) metrics.increment("errors");
  });
  next();
});

// ── GET /api/analytics/metrics — métricas en tiempo real ─────────────────────
router.get(
  "/metrics",
  authenticate,
  requirePermission("analytics", "read"),
  (req, res) => {
    res.json({ success: true, metrics: metrics.getSummary() });
  },
);

// ── GET /api/analytics/users — estadísticas de usuarios ──────────────────────
router.get(
  "/users",
  authenticate,
  requirePermission("analytics", "read"),
  async (req, res) => {
    try {
      const [total, active, byRole, recentRegistrations] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ activo: true }),
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        User.find({}, "username email role createdAt")
          .sort({ createdAt: -1 })
          .limit(5),
      ]);
      res.json({ total, active, byRole, recentRegistrations });
    } catch {
      res.status(500).json({ error: "Error." });
    }
  },
);

// ── GET /api/analytics/sessions — estadísticas de sesiones ───────────────────
router.get(
  "/sessions",
  authenticate,
  requirePermission("analytics", "read"),
  async (req, res) => {
    try {
      const [active, total, byDevice] = await Promise.all([
        Session.countDocuments({ isActive: true }),
        Session.countDocuments(),
        Session.aggregate([
          { $group: { _id: "$deviceInfo", count: { $sum: 1 } } },
        ]),
      ]);
      res.json({ active, total, byDevice });
    } catch {
      res.status(500).json({ error: "Error." });
    }
  },
);

// ── GET /api/analytics/logs/summary — resumen de logs de seguridad ────────────
router.get(
  "/logs/summary",
  authenticate,
  requirePermission("analytics", "read"),
  (req, res) => {
    try {
      const logFile = path.join(__dirname, "../../logs/security.log");
      if (!fs.existsSync(logFile)) return res.json({ total: 0, events: {} });

      const lines = fs
        .readFileSync(logFile, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean);
      const events = {};
      lines.forEach((line) => {
        const match = line.match(/\[([A-Z_]+)\]/);
        if (match) events[match[1]] = (events[match[1]] || 0) + 1;
      });
      res.json({ total: lines.length, events });
    } catch {
      res.status(500).json({ error: "Error leyendo logs." });
    }
  },
);

// Exportar metrics para uso desde auth routes
module.exports = router;
module.exports.metrics = metrics;
