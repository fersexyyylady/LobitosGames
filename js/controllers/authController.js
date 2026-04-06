// js/controllers/authController.js
// FIX CRÍTICO: handleLogin, handleRegister, handleResetRequest usan await
// para esperar la respuesta async del backend correctamente.

class AuthController {
  constructor() {
    this.model = userModel;
    this.validationService = validationService;
    this._captchaWidgets = {};
  }

  init() {
    this.updateAuthUI();
    this._bindForms();
    this._bindThemeSwitch();
    this._applyStoredTheme();
    this._bindResetTabs();
    AuthMiddleware.applyRoleVisibility();
    this._renderRecaptchas();
    console.log("✅ AuthController inicializado");
  }

  // ── reCAPTCHA ─────────────────────────────────────────────────────────────────

  _renderRecaptchas() {
    this._tryRenderWidget("loginRecaptcha");
    this._tryRenderWidget("registerRecaptcha");
  }

  _tryRenderWidget(elementId) {
    try {
      if (typeof grecaptcha === "undefined") return;
      const el = document.getElementById(elementId);
      if (!el) return;
      if (el.querySelector("iframe")) {
        this._captchaWidgets[elementId] =
          elementId === "loginRecaptcha" ? 0 : 1;
        return;
      }
      const widgetId = grecaptcha.render(el, {
        sitekey: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
      });
      this._captchaWidgets[elementId] = widgetId;
    } catch (e) {
      if (!String(e).includes("already been rendered")) {
        console.warn("[reCAPTCHA]", e);
      }
    }
  }

  _getRecaptchaResponse(elementId) {
    try {
      if (typeof grecaptcha === "undefined") return "";
      const widgetId = this._captchaWidgets[elementId];
      return widgetId !== undefined
        ? grecaptcha.getResponse(widgetId)
        : grecaptcha.getResponse();
    } catch {
      return "";
    }
  }

  _resetRecaptcha(elementId) {
    try {
      if (typeof grecaptcha === "undefined") return;
      const widgetId = this._captchaWidgets[elementId];
      widgetId !== undefined ? grecaptcha.reset(widgetId) : grecaptcha.reset();
    } catch {
      /* silencioso */
    }
  }

  _validateRecaptcha(formType) {
    const elementId = `${formType}Recaptcha`;
    const el = document.getElementById(elementId);
    if (!el) return true;
    this._tryRenderWidget(elementId);
    try {
      const response = this._getRecaptchaResponse(elementId);
      if (!response || response.length === 0) {
        this.showError(
          "Por favor completa el reCAPTCHA.",
          `${formType}RecaptchaError`,
        );
        return false;
      }
      return true;
    } catch {
      console.warn("[reCAPTCHA] No disponible, omitiendo.");
      return true;
    }
  }

  // ── Formularios ───────────────────────────────────────────────────────────────

  _bindForms() {
    // Login
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }
    const loginBtn = document.querySelector("#loginForm .btn-primary");
    if (loginBtn) {
      loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Registro
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleRegister();
      });
    }
    const registerBtn = document.querySelector("#registerForm .btn-primary");
    if (registerBtn) {
      registerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleRegister();
      });
    }

    // MFA
    const mfaForm = document.getElementById("mfaForm");
    if (mfaForm) {
      mfaForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleMfaVerification();
      });
    }

    // Reset por email
    const resetEmailBtn = document.getElementById("resetEmailBtn");
    if (resetEmailBtn) {
      resetEmailBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleResetRequest();
      });
    }

    // Reset confirm
    const resetConfirmBtn = document.getElementById("resetConfirmBtn");
    if (resetConfirmBtn) {
      resetConfirmBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleResetPassword();
      });
    }

    // Cambiar contraseña (settings)
    const changePassForm = document.getElementById("changePasswordForm");
    if (changePassForm) {
      changePassForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleChangePassword();
      });
    }
  }

  _bindThemeSwitch() {
    const sw = document.getElementById("themeSwitch");
    if (!sw) return;
    sw.addEventListener("change", () => {
      const theme = sw.checked ? "light" : "dark";
      this._applyTheme(theme);
      if (userModel.isLoggedIn()) userModel.updatePreferences({ tema: theme });
    });
  }

  _applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("lg_theme", theme);
    const sw = document.getElementById("themeSwitch");
    if (sw) sw.checked = theme === "light";
  }

  _applyStoredTheme() {
    const user = userModel.getCurrentUser();
    const saved = user?.tema || localStorage.getItem("lg_theme") || "dark";
    this._applyTheme(saved);
  }

  _bindResetTabs() {
    document.querySelectorAll(".reset-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".reset-tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".reset-tab-content")
          .forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document
          .getElementById(tab.getAttribute("data-tab"))
          ?.classList.add("active");
      });
    });
  }

  // ── Modales ───────────────────────────────────────────────────────────────────

  showLoginModal() {
    document.getElementById("loginModal")?.classList.add("active");
    document.body.style.overflow = "hidden";
    setTimeout(() => this._tryRenderWidget("loginRecaptcha"), 150);
  }

  showRegisterModal() {
    document.getElementById("registerModal")?.classList.add("active");
    document.body.style.overflow = "hidden";
    setTimeout(() => this._tryRenderWidget("registerRecaptcha"), 150);
  }

  showResetModal() {
    document.getElementById("resetModal")?.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  closeAuthModals() {
    ["loginModal", "registerModal", "mfaModal", "resetModal"].forEach((id) =>
      document.getElementById(id)?.classList.remove("active"),
    );
    document.body.style.overflow = "";
  }

  // ── Login — CORREGIDO: usa await ──────────────────────────────────────────────
  async handleLogin() {
    const emailOrUsername = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    document.querySelectorAll("#loginForm .error-message").forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });

    if (!emailOrUsername || !password)
      return this.showError("Completa todos los campos.", "loginEmailError");
    if (!this._validateRecaptcha("login")) return;

    // Mostrar estado de carga
    const btn = document.querySelector("#loginForm .btn-primary");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Iniciando sesión...";
    }

    try {
      // *** AWAIT — sin esto el resultado era una Promise, no un objeto ***
      const result = await this.model.login(emailOrUsername, password);

      if (result?.requiresMfa) {
        this.closeAuthModals();
        document.getElementById("mfaModal")?.classList.add("active");
        return;
      }

      if (result?.success) {
        this.closeAuthModals();
        this.updateAuthUI();
        AuthMiddleware.applyRoleVisibility();
        this._applyTheme(result.user?.tema || "dark");
        document.getElementById("loginForm").reset();
        this._resetRecaptcha("loginRecaptcha");
        this.showMessage(
          `¡Bienvenido ${result.user?.nombre || ""}! (Rol: ${result.user?.role || "usuario"})`,
          "success",
        );
      } else {
        this.showError(
          result?.error || "Error al iniciar sesión.",
          "loginEmailError",
        );
        this._resetRecaptcha("loginRecaptcha");
      }
    } catch (err) {
      console.error("[Login error]", err);
      this.showError("Error de conexión al servidor.", "loginEmailError");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Iniciar Sesión";
      }
    }
  }

  // ── MFA ───────────────────────────────────────────────────────────────────────
  async handleMfaVerification() {
    const code = document.getElementById("mfaCode")?.value.trim();
    const result = await this.model.verifyMfa(code);
    if (result.success) {
      document.getElementById("mfaModal")?.classList.remove("active");
      this.updateAuthUI();
      AuthMiddleware.applyRoleVisibility();
      this._applyTheme(result.user?.tema || "dark");
      this.showMessage(`¡Bienvenido ${result.user?.nombre || ""}!`, "success");
    } else {
      this.showError(result.error, "mfaCodeError");
    }
  }

  // ── Registro — CORREGIDO: usa await ──────────────────────────────────────────
  async handleRegister() {
    const nombre = document.getElementById("regNombre")?.value.trim();
    const apellido = document.getElementById("regApellido")?.value.trim();
    const username = document.getElementById("regUsername")?.value.trim();
    const email = document.getElementById("regEmail")?.value.trim();
    const password = document.getElementById("regPassword")?.value;
    const confirmPassword =
      document.getElementById("regConfirmPassword")?.value;
    const secretQuestion = document.getElementById("regSecretQuestion")?.value;
    const secretAnswer = document
      .getElementById("regSecretAnswer")
      ?.value.trim();
    const acceptTerms = document.getElementById("regTerms")?.checked;

    document.querySelectorAll("#registerForm .error-message").forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });

    let valid = true;
    valid = this._validateField("regNombre", "name") && valid;
    valid = this._validateField("regApellido", "name") && valid;
    valid = this._validateField("regUsername", "username") && valid;
    valid = this._validateField("regEmail", "email") && valid;
    valid = this._validateField("regPassword", "password") && valid;
    valid =
      this._validateField("regConfirmPassword", "confirmPassword") && valid;
    if (!acceptTerms) {
      this.showError("Debes aceptar los términos.", "regTermsError");
      valid = false;
    }
    if (!valid) return;
    if (!this._validateRecaptcha("register")) return;

    const backendVal = await this.validationService.validateBackend({
      email,
      username,
    });
    if (!backendVal.valid) {
      backendVal.errors.forEach((e) =>
        this.showError(
          e.message,
          `reg${e.field.charAt(0).toUpperCase() + e.field.slice(1)}Error`,
        ),
      );
      return;
    }

    // Mostrar estado de carga
    const btn = document.querySelector("#registerForm .btn-primary");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Registrando...";
    }

    try {
      // *** AWAIT — sin esto el resultado era una Promise, no un objeto ***
      const result = await this.model.register({
        nombre,
        apellido,
        username,
        email,
        password,
        secretQuestion,
        secretAnswer,
      });

      if (result?.success) {
        this.showMessage(
          "¡Registro exitoso! Ahora puedes iniciar sesión.",
          "success",
        );
        this.closeAuthModals();
        document.getElementById("registerForm").reset();
        this._resetRecaptcha("registerRecaptcha");
        this.showLoginModal();
      } else {
        this.showError(result?.error || "Error al registrar.", "regEmailError");
      }
    } catch (err) {
      console.error("[Register error]", err);
      this.showError("Error de conexión al servidor.", "regEmailError");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Crear Cuenta";
      }
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────────
  handleLogout() {
    if (!confirm("¿Cerrar sesión?")) return;
    this.model.logout();
    this.updateAuthUI();
    AuthMiddleware.applyRoleVisibility();
    this._applyTheme("dark");
    if (typeof viewManager !== "undefined") viewManager.showSection("home");
    this.showMessage("Sesión cerrada.", "success");
  }

  // ── Recuperación de contraseña — CORREGIDO: usa await ────────────────────────
  async handleResetRequest() {
    const email = document.getElementById("resetEmail")?.value.trim();
    if (!email) return this.showError("Ingresa tu email.", "resetEmailError");

    const btn = document.getElementById("resetEmailBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Enviando...";
    }

    try {
      // *** AWAIT — requestPasswordReset es async en modo backend ***
      const result = await this.model.requestPasswordReset(email);
      this.showMessage(
        result?.message || result?.error || "Procesado.",
        result?.success ? "success" : "error",
      );
      if (result?.success) {
        const req = document.getElementById("resetRequestSection");
        const pass = document.getElementById("resetPasswordSection");
        if (req) req.style.display = "none";
        if (pass) pass.style.display = "block";
      }
    } catch (err) {
      this.showError("Error de conexión.", "resetEmailError");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Enviar instrucciones";
      }
    }
  }

  async handleResetPassword() {
    const token = document.getElementById("resetToken")?.value.trim();
    const newPass = document.getElementById("newPassword")?.value;
    const confirm = document.getElementById("confirmNewPassword")?.value;
    if (newPass !== confirm)
      return this.showError(
        "Las contraseñas no coinciden.",
        "confirmNewPasswordError",
      );

    try {
      const result = await this.model.confirmPasswordReset(token, newPass);
      this.showMessage(
        result?.message || result?.error,
        result?.success ? "success" : "error",
      );
      if (result?.success) this.closeAuthModals();
    } catch (err) {
      this.showError("Error de conexión.", "confirmNewPasswordError");
    }
  }

  handleSmsResetRequest() {
    const ident = document.getElementById("smsResetUser")?.value.trim();
    const users = JSON.parse(localStorage.getItem("lg_users") || "[]");
    const user = users.find((u) => u.email === ident || u.username === ident);
    if (!user) return this.showMessage("Usuario no encontrado.", "error");
    const result = this.model.requestSmsReset(user.id);
    this.showMessage(result.message, "success");
    const section = document.getElementById("smsVerifySection");
    if (section) section.style.display = "block";
    this._smsResetUserId = user.id;
  }

  handleSmsVerify() {
    const code = document.getElementById("smsOtpCode")?.value.trim();
    const newPass = document.getElementById("smsNewPassword")?.value;
    const result = this.model.verifySmsReset(
      this._smsResetUserId,
      code,
      newPass,
    );
    this.showMessage(
      result.message || result.error,
      result.success ? "success" : "error",
    );
  }

  // ── Settings ──────────────────────────────────────────────────────────────────
  async handleChangePassword() {
    const current = document.getElementById("currentPassword")?.value;
    const newPass = document.getElementById("newSettingsPassword")?.value;
    const confirm = document.getElementById("confirmSettingsPassword")?.value;
    if (newPass !== confirm)
      return this.showError(
        "Las contraseñas no coinciden.",
        "confirmSettingsPasswordError",
      );

    const result = await this.model.changePassword(current, newPass);
    this.showMessage(
      result.success ? "Contraseña actualizada." : result.error,
      result.success ? "success" : "error",
    );
  }

  async handleToggleMfa() {
    if (!AuthMiddleware.requireAuth()) return;
    const current = userModel.getCurrentUser().mfaEnabled;
    const result = await this.model.toggleMfa(!current);
    this.showMessage(
      result.mfaEnabled ? "MFA activado." : "MFA desactivado.",
      "success",
    );
    this.refreshSettingsPanel();
  }

  renderActiveSessions() {
    if (!AuthMiddleware.requireAuth()) return;
    const container = document.getElementById("sessionsContainer");
    if (!container) return;
    const sessions = this.model.getActiveSessions();
    if (!sessions.length) {
      container.innerHTML =
        "<p class='no-sessions'>No hay sesiones activas.</p>";
      return;
    }
    container.innerHTML = sessions
      .map(
        (s) => `
        <div class="session-item ${s.id === userModel.getCurrentUser().sessionId ? "current-session" : ""}">
          <div class="session-info">
            <span class="session-device">${s.deviceInfo || "Dispositivo desconocido"}</span>
            <span class="session-agent">${(s.userAgent || "").slice(0, 60)}…</span>
            <span class="session-ip">IP: ${s.ipAddress || "N/A"}</span>
            <span class="session-date">${new Date(s.createdAt).toLocaleString()}</span>
          </div>
          ${
            s.id === userModel.getCurrentUser().sessionId
              ? '<span class="session-badge">Sesión actual</span>'
              : `<button class="btn-revoke-session" onclick="authController.revokeSessionById('${s.id}')">Cerrar sesión</button>`
          }
        </div>`,
      )
      .join("");
  }

  revokeSessionById(sessionId) {
    this.model.revokeSession(sessionId);
    this.showMessage("Sesión cerrada.", "success");
    this.renderActiveSessions();
  }

  async savePreferences() {
    const tema = document.getElementById("prefersTema")?.value;
    const idioma = document.getElementById("prefersIdioma")?.value;
    await this.model.updatePreferences({ tema, idioma });
    this._applyTheme(tema);
    this.showMessage("Preferencias guardadas.", "success");
  }

  refreshSettingsPanel() {
    const user = userModel.getCurrentUser();
    if (!user) return;
    const mfaStatus = document.getElementById("mfaStatus");
    const mfaBtn =
      document.getElementById("toggleMfaBtn") ||
      document.getElementById("mfaToggleBtn");
    if (mfaStatus)
      mfaStatus.textContent = user.mfaEnabled ? "Activado" : "Desactivado";
    if (mfaBtn)
      mfaBtn.textContent = user.mfaEnabled ? "Desactivar MFA" : "Activar MFA";
  }

  // ── UI ────────────────────────────────────────────────────────────────────────
  updateAuthUI() {
    const user = userModel.getCurrentUser();
    const guestMenu =
      document.getElementById("guestMenu") ||
      document.getElementById("authButtons");
    const userMenu = document.getElementById("userMenu");
    const adminLink = document.querySelector('[data-section="admin-panel"]');

    if (user) {
      if (guestMenu) guestMenu.style.display = "none";
      if (userMenu) {
        userMenu.style.display = "flex";
        const nameEl =
          userMenu.querySelector(".username") ||
          userMenu.querySelector("#userName");
        const avatarEl =
          userMenu.querySelector(".user-avatar") ||
          userMenu.querySelector("#userAvatar");
        if (nameEl) nameEl.textContent = user.nombre || user.username;
        if (avatarEl && user.avatar) avatarEl.src = user.avatar;
        const roleEl =
          userMenu.querySelector(".role-badge") ||
          userMenu.querySelector("#userRoleBadge");
        if (roleEl) {
          roleEl.textContent = user.role || "usuario";
          roleEl.className = `role-badge role-${user.role || "usuario"}`;
        }
      }
      if (adminLink)
        adminLink.style.display = userModel.isAdmin() ? "" : "none";
    } else {
      if (guestMenu) guestMenu.style.display = "flex";
      if (userMenu) userMenu.style.display = "none";
      if (adminLink) adminLink.style.display = "none";
    }
  }

  showMessage(msg, type = "info") {
    const existing = document.querySelector(".toast-message");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  showError(msg, fieldId) {
    if (fieldId) {
      const el = document.getElementById(fieldId);
      if (el) {
        el.textContent = msg;
        el.style.display = "block";
      }
    }
    this.showMessage(msg, "error");
  }

  // ── Validación de campo ───────────────────────────────────────────────────────
  _validateField(inputId, type) {
    const input = document.getElementById(inputId);
    const errorId = inputId + "Error";
    if (!input) return true;
    const val = input.value.trim();

    const rules = {
      name: { min: 2, max: 50, msg: "Mínimo 2 caracteres." },
      username: {
        min: 3,
        max: 20,
        regex: /^[a-zA-Z0-9_]+$/,
        msg: "Solo letras, números y guiones bajos.",
      },
      email: {
        regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        msg: "Email inválido.",
      },
      password: {
        min: 6,
        regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
        msg: "Mínimo 6 caracteres, una mayúscula y un número.",
      },
      confirmPassword: {
        match: "regPassword",
        msg: "Las contraseñas no coinciden.",
      },
    };

    const rule = rules[type];
    if (!rule) return true;

    if (rule.match) {
      const other = document.getElementById(rule.match)?.value;
      if (val !== other) {
        this.showError(rule.msg, errorId);
        return false;
      }
      return true;
    }
    if (rule.min && val.length < rule.min) {
      this.showError(rule.msg, errorId);
      return false;
    }
    if (rule.max && val.length > rule.max) {
      this.showError(`Máximo ${rule.max} caracteres.`, errorId);
      return false;
    }
    if (rule.regex && !rule.regex.test(val)) {
      this.showError(rule.msg, errorId);
      return false;
    }
    return true;
  }
}

const authController = new AuthController();
