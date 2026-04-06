// server/routes/admin.js
const router = require("express").Router();
const User = require("../models/User");
const Session = require("../models/Session");
const fs = require("fs");
const path = require("path");
const {
  authenticate,
  requireRole,
  requirePermission,
  logSecurityEvent,
} = require("../middleware/authMiddleware");

// Todas las rutas de admin requieren autenticación + rol admin mínimo
router.use(authenticate);
router.use(requireRole("admin"));

// ── GET /api/admin/users — listar todos los usuarios ──────────────────────────
router.get("/users", requirePermission("users", "read"), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search)
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];

    const users = await User.find(filter, "-password -secretAnswer -mfaSecret")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });
    const total = await User.countDocuments(filter);

    res.json({
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ error: "Error." });
  }
});

// ── PUT /api/admin/users/:id/role — cambiar rol ───────────────────────────────
router.put(
  "/users/:id/role",
  requirePermission("roles", "write"),
  async (req, res) => {
    try {
      const { role } = req.body;
      const validRoles = ["superadmin", "admin", "editor", "usuario"];
      if (!validRoles.includes(role))
        return res.status(400).json({ error: "Rol inválido." });

      // Superadmin solo puede ser asignado por superadmin
      if (role === "superadmin" && req.user.role !== "superadmin")
        return res
          .status(403)
          .json({ error: "Solo un superadmin puede asignar ese rol." });

      await User.findByIdAndUpdate(req.params.id, { role });
      logSecurityEvent(
        "ROLE_CHANGE",
        req,
        `userId:${req.params.id} newRole:${role}`,
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Error." });
    }
  },
);

// ── PUT /api/admin/users/:id/ban — banear/desbanear usuario ──────────────────
router.put(
  "/users/:id/ban",
  requirePermission("users", "ban"),
  async (req, res) => {
    try {
      const { activo } = req.body;
      await User.findByIdAndUpdate(req.params.id, { activo });
      logSecurityEvent(
        "USER_BAN",
        req,
        `userId:${req.params.id} activo:${activo}`,
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Error." });
    }
  },
);

// ── DELETE /api/admin/users/:id — eliminar usuario ───────────────────────────
router.delete(
  "/users/:id",
  requirePermission("users", "delete"),
  async (req, res) => {
    try {
      if (req.params.id === req.user.id)
        return res
          .status(400)
          .json({ error: "No puedes eliminarte a ti mismo." });
      await User.findByIdAndUpdate(req.params.id, { activo: false });
      logSecurityEvent("USER_DELETE", req, `userId:${req.params.id}`);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Error." });
    }
  },
);

// ── GET /api/admin/sessions — todas las sesiones activas ─────────────────────
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await Session.find({ isActive: true })
      .populate("userId", "username email role")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ sessions });
  } catch {
    res.status(500).json({ error: "Error." });
  }
});

// ── GET /api/admin/logs — leer logs de seguridad ─────────────────────────────
router.get("/logs", requireRole("superadmin"), async (req, res) => {
  try {
    const logFile = path.join(__dirname, "../logs/security.log");
    if (!fs.existsSync(logFile)) return res.json({ logs: [] });
    const content = fs.readFileSync(logFile, "utf8");
    const logs = content
      .trim()
      .split("\n")
      .filter(Boolean)
      .reverse()
      .slice(0, 200);
    res.json({ logs });
  } catch {
    res.status(500).json({ error: "Error." });
  }
});

// ── GET /api/admin/stats — estadísticas generales ────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [totalUsers, activeUsers, activeSessions, byRole] = await Promise.all(
      [
        User.countDocuments(),
        User.countDocuments({ activo: true }),
        Session.countDocuments({ isActive: true }),
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      ],
    );
    res.json({ totalUsers, activeUsers, activeSessions, byRole });
  } catch {
    res.status(500).json({ error: "Error." });
  }
});

module.exports = router;
