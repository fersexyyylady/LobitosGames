// server/routes/microservices/notifyService.js
// Microservicio 2: Notificaciones (email y SMS)
// Patrón: Factory para crear el tipo de notificación correcto

const router = require("express").Router();
const {
  authenticate,
  requireRole,
} = require("../../middleware/authMiddleware");
const {
  sendPasswordResetEmail,
  sendMfaCodeEmail,
  sendSmsOtp,
} = require("../../services/notificationService");

// ── Factory pattern: crear notificación según tipo ───────────────────────────
class NotificationFactory {
  static create(type) {
    switch (type) {
      case "email_reset":
        return {
          send: (to, payload) =>
            sendPasswordResetEmail(to, payload.token, payload.userName),
        };
      case "email_mfa":
        return {
          send: (to, payload) =>
            sendMfaCodeEmail(to, payload.code, payload.userName),
        };
      case "sms_otp":
        return {
          send: (to, payload) => sendSmsOtp(to, payload.code, payload.userName),
        };
      default:
        throw new Error(`Tipo de notificación desconocido: ${type}`);
    }
  }
}

// ── POST /api/notify/send — enviar notificación (solo admin/superadmin) ───────
router.post("/send", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const { type, to, payload } = req.body;
    if (!type || !to || !payload)
      return res
        .status(400)
        .json({ error: "Faltan campos: type, to, payload." });

    const notifier = NotificationFactory.create(type);
    const result = await notifier.send(to, payload);
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/notify/test — prueba de notificación (solo superadmin) ─────────
router.post(
  "/test",
  authenticate,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email requerido." });

      const result = await sendMfaCodeEmail(email, "999999", "Test User");
      res.json({
        success: true,
        result,
        message: "Notificación de prueba enviada.",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ── GET /api/notify/types — listar tipos disponibles (público para documentación)
router.get("/types", (req, res) => {
  res.json({
    types: [
      {
        type: "email_reset",
        description: "Email de recuperación de contraseña",
      },
      { type: "email_mfa", description: "Email con código MFA" },
      { type: "sms_otp", description: "SMS con código OTP vía Twilio" },
    ],
  });
});

module.exports = router;
