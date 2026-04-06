// server/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const ACCESS_SECRET = process.env.JWT_SECRET || "lobitos_jwt_secret_2026";

// ── Roles jerarquía: superadmin > admin > editor > usuario ────────────────────
const ROLE_HIERARCHY = {
  superadmin: 4,
  admin: 3,
  editor: 2,
  usuario: 1,
};

// ── ABAC: permisos por recurso y atributo ─────────────────────────────────────
const ABAC_POLICIES = {
  superadmin: {
    users: ["read", "write", "delete", "ban"],
    catalog: ["read", "write", "delete", "publish"],
    analytics: ["read", "export"],
    settings: ["read", "write"],
    roles: ["read", "write"],
  },
  admin: {
    users: ["read", "write", "delete"],
    catalog: ["read", "write", "delete"],
    analytics: ["read"],
    settings: ["read", "write"],
    roles: ["read"],
  },
  editor: {
    users: ["read"],
    catalog: ["read", "write"],
    analytics: ["read"],
    settings: ["read"],
  },
  usuario: {
    catalog: ["read"],
    settings: ["read"],
  },
};

// ── Función de log de seguridad ───────────────────────────────────────────────
function logSecurityEvent(type, req, extra = "") {
  try {
    const logsDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const entry = `[${new Date().toISOString()}] [${type}] IP:${req.ip} PATH:${req.path} USER:${req.user?.id || "anon"} ${extra}\n`;
    fs.appendFileSync(path.join(logsDir, "security.log"), entry);
  } catch (_) {}
}

// ── Middleware: verificar JWT ─────────────────────────────────────────────────
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    logSecurityEvent("NO_TOKEN", req);
    return res.status(401).json({ error: "No autenticado. Token requerido." });
  }
  const token = auth.split(" ")[1];
  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    next();
  } catch (err) {
    logSecurityEvent("INVALID_TOKEN", req, err.message);
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ error: "Token expirado." });
    return res.status(403).json({ error: "Token inválido." });
  }
}

// ── Middleware: RBAC — requiere rol mínimo ────────────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.user?.role] || 0;
    const hasAccess = roles.some((r) => userLevel >= (ROLE_HIERARCHY[r] || 0));
    if (!hasAccess) {
      logSecurityEvent(
        "FORBIDDEN_ROLE",
        req,
        `required:${roles} got:${req.user?.role}`,
      );
      return res
        .status(403)
        .json({ error: "Acceso denegado. Rol insuficiente." });
    }
    next();
  };
}

// ── Middleware: ABAC — requiere permiso sobre recurso ────────────────────────
function requirePermission(resource, action) {
  return (req, res, next) => {
    const role = req.user?.role || "usuario";
    const allowed = ABAC_POLICIES[role]?.[resource]?.includes(action);
    if (!allowed) {
      logSecurityEvent(
        "FORBIDDEN_ABAC",
        req,
        `resource:${resource} action:${action}`,
      );
      return res.status(403).json({
        error: `No tienes permiso para ${action} en ${resource}.`,
      });
    }
    next();
  };
}

// ── Middleware: solo el propio usuario o admin ────────────────────────────────
function requireOwnerOrAdmin(req, res, next) {
  const isOwner = req.user?.id === req.params.id;
  const isAdmin = (ROLE_HIERARCHY[req.user?.role] || 0) >= ROLE_HIERARCHY.admin;
  if (!isOwner && !isAdmin) {
    logSecurityEvent("FORBIDDEN_OWNER", req);
    return res
      .status(403)
      .json({ error: "Solo puedes acceder a tus propios recursos." });
  }
  next();
}

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  requireOwnerOrAdmin,
  ROLE_HIERARCHY,
  ABAC_POLICIES,
  logSecurityEvent,
};
