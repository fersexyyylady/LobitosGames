// js/controllers/authController.js
// CORREGIDO - Validación de CAPTCHA arreglada

class AuthController {
  constructor() {
    this.model = userModel;
    this.validationService = validationService;
    this.loginCaptcha = null;
    this.registerCaptcha = null;
  }

  init() {
    console.log("🔐 AuthController inicializado");
    this.setupEventListeners();
    this.updateAuthUI();

    // Inicializar CAPTCHAs
    this.initCaptcha("login");
    this.initCaptcha("register");
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Register form
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleRegister();
      });
    }

    // Live validation
    this.setupLiveValidation();

    // Close modals on overlay click
    const loginOverlay = document.querySelector("#loginModal .modal-overlay");
    const registerOverlay = document.querySelector(
      "#registerModal .modal-overlay",
    );

    if (loginOverlay) {
      loginOverlay.addEventListener("click", () => this.closeAuthModals());
    }

    if (registerOverlay) {
      registerOverlay.addEventListener("click", () => this.closeAuthModals());
    }

    // Close modals on close button
    const loginClose = document.querySelector("#loginModal .modal-close");
    const registerClose = document.querySelector("#registerModal .modal-close");

    if (loginClose) {
      loginClose.addEventListener("click", () => this.closeAuthModals());
    }

    if (registerClose) {
      registerClose.addEventListener("click", () => this.closeAuthModals());
    }
  }

  setupLiveValidation() {
    // Validación en tiempo real para registro
    const fields = [
      { id: "regNombre", type: "name" },
      { id: "regApellido", type: "name" },
      { id: "regUsername", type: "username" },
      { id: "regEmail", type: "email" },
      { id: "regPassword", type: "password" },
      { id: "regConfirmPassword", type: "confirmPassword" },
    ];

    fields.forEach((field) => {
      const element = document.getElementById(field.id);
      if (element) {
        element.addEventListener("blur", () => {
          this.validateField(field.id, field.type);
        });
      }
    });

    // Validar confirmación de contraseña en tiempo real
    const confirmPassword = document.getElementById("regConfirmPassword");
    if (confirmPassword) {
      confirmPassword.addEventListener("input", () => {
        this.validatePasswordMatch();
      });
    }
  }

  validateField(fieldId, type) {
    const field = document.getElementById(fieldId);
    const errorSpan = document.getElementById(fieldId + "Error");

    if (!field) return true;

    let isValid = true;
    let errorMessage = "";

    const value = field.value.trim();

    // Validar según tipo
    switch (type) {
      case "name":
        if (value.length < 2) {
          isValid = false;
          errorMessage = "Debe tener al menos 2 caracteres";
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
          isValid = false;
          errorMessage = "Solo se permiten letras";
        }
        break;

      case "username":
        if (value.length < 3) {
          isValid = false;
          errorMessage = "Debe tener al menos 3 caracteres";
        } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          isValid = false;
          errorMessage = "Solo letras, números, guiones y guiones bajos";
        }
        break;

      case "email":
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          isValid = false;
          errorMessage = "Email inválido";
        }
        break;

      case "password":
        if (value.length < 6) {
          isValid = false;
          errorMessage = "Debe tener al menos 6 caracteres";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          isValid = false;
          errorMessage = "Debe contener mayúscula, minúscula y número";
        }
        break;

      case "confirmPassword":
        const password = document.getElementById("regPassword")?.value;
        if (value !== password) {
          isValid = false;
          errorMessage = "Las contraseñas no coinciden";
        }
        break;
    }

    // Mostrar error
    if (errorSpan) {
      errorSpan.textContent = errorMessage;
      errorSpan.style.display = errorMessage ? "block" : "none";
    }

    if (field) {
      field.style.borderColor = isValid ? "#2ecc71" : "#e74c3c";
    }

    return isValid;
  }

  validatePasswordMatch() {
    const password = document.getElementById("regPassword");
    const confirmPassword = document.getElementById("regConfirmPassword");
    const errorSpan = document.getElementById("regConfirmPasswordError");

    if (password && confirmPassword && errorSpan) {
      if (confirmPassword.value && password.value !== confirmPassword.value) {
        errorSpan.textContent = "Las contraseñas no coinciden";
        errorSpan.style.display = "block";
        confirmPassword.style.borderColor = "#e74c3c";
        return false;
      } else {
        errorSpan.style.display = "none";
        confirmPassword.style.borderColor = confirmPassword.value
          ? "#2ecc71"
          : "";
        return true;
      }
    }
    return true;
  }

  initCaptcha(type) {
    const questionElement = document.getElementById(type + "CaptchaQuestion");
    if (!questionElement) return;

    const captcha = this.validationService.generateMathCaptcha();

    if (type === "login") {
      this.loginCaptcha = captcha;
    } else {
      this.registerCaptcha = captcha;
    }

    questionElement.textContent = captcha.question;
    console.log(`🔢 CAPTCHA ${type}:`, captcha.question, "=", captcha.answer);
  }

  async handleLogin() {
    const emailOrUsername = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;
    const captchaAnswer = document.getElementById("loginCaptchaAnswer")?.value;

    // Limpiar errores
    document.querySelectorAll("#loginForm .error-message").forEach((span) => {
      span.textContent = "";
      span.style.display = "none";
    });

    // Validar campos vacíos
    if (!emailOrUsername || !password || !captchaAnswer) {
      this.showError("Por favor completa todos los campos", "loginEmail");
      return;
    }

    // CORREGIDO: Validar CAPTCHA correctamente
    const userAnswer = parseInt(captchaAnswer);
    console.log("🔢 Respuesta usuario:", userAnswer);
    console.log("🔢 Respuesta correcta:", this.loginCaptcha.answer);

    if (userAnswer !== this.loginCaptcha.answer) {
      this.showError("CAPTCHA incorrecto. Intenta de nuevo.", "loginCaptcha");
      this.initCaptcha("login");
      document.getElementById("loginCaptchaAnswer").value = "";
      return;
    }

    // Intentar login
    const result = this.model.login(emailOrUsername, password);

    if (result.success) {
      console.log("✅ Login exitoso");
      this.closeAuthModals();
      this.updateAuthUI();

      // Limpiar formulario
      document.getElementById("loginForm").reset();
      this.initCaptcha("login");

      // Mostrar mensaje de bienvenida
      this.showMessage(`¡Bienvenido ${result.user.nombre}!`, "success");
    } else {
      // Mostrar error específico
      this.showError(result.message || result.error, "loginEmail");
      this.initCaptcha("login");
      document.getElementById("loginCaptchaAnswer").value = "";
    }
  }

  async handleRegister() {
    // Obtener valores
    const nombre = document.getElementById("regNombre")?.value.trim();
    const apellido = document.getElementById("regApellido")?.value.trim();
    const username = document.getElementById("regUsername")?.value.trim();
    const email = document.getElementById("regEmail")?.value.trim();
    const password = document.getElementById("regPassword")?.value;
    const confirmPassword =
      document.getElementById("regConfirmPassword")?.value;
    const captchaAnswer = document.getElementById(
      "registerCaptchaAnswer",
    )?.value;
    const acceptTerms = document.getElementById("regTerms")?.checked;

    // Limpiar errores
    document
      .querySelectorAll("#registerForm .error-message")
      .forEach((span) => {
        span.textContent = "";
        span.style.display = "none";
      });

    // Validar todos los campos
    let isValid = true;

    isValid = this.validateField("regNombre", "name") && isValid;
    isValid = this.validateField("regApellido", "name") && isValid;
    isValid = this.validateField("regUsername", "username") && isValid;
    isValid = this.validateField("regEmail", "email") && isValid;
    isValid = this.validateField("regPassword", "password") && isValid;
    isValid =
      this.validateField("regConfirmPassword", "confirmPassword") && isValid;

    if (!acceptTerms) {
      this.showError("Debes aceptar los términos y condiciones", "regTerms");
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    // CORREGIDO: Validar CAPTCHA correctamente
    const userAnswer = parseInt(captchaAnswer);
    console.log("🔢 Respuesta usuario:", userAnswer);
    console.log("🔢 Respuesta correcta:", this.registerCaptcha.answer);

    if (userAnswer !== this.registerCaptcha.answer) {
      this.showError(
        "CAPTCHA incorrecto. Intenta de nuevo.",
        "registerCaptcha",
      );
      this.initCaptcha("register");
      document.getElementById("registerCaptchaAnswer").value = "";
      return;
    }

    // Validar backend (unicidad)
    const backendValidation = await this.validationService.validateBackend({
      email,
      username,
    });

    if (!backendValidation.valid) {
      // Mostrar errores del backend
      backendValidation.errors.forEach((error) => {
        this.showError(
          error.message,
          "reg" + error.field.charAt(0).toUpperCase() + error.field.slice(1),
        );
      });
      return;
    }

    // Crear usuario
    const userData = {
      nombre,
      apellido,
      username,
      email,
      password,
    };

    const result = this.model.register(userData);

    if (result.success) {
      console.log("✅ Registro exitoso");
      this.showMessage(
        "¡Registro exitoso! Ahora puedes iniciar sesión.",
        "success",
      );

      // Limpiar formulario
      document.getElementById("registerForm").reset();
      this.initCaptcha("register");

      // Cambiar a modal de login
      this.closeAuthModals();
      setTimeout(() => this.showLoginModal(), 300);
    } else {
      this.showError(result.message || result.error, "regEmail");
    }
  }

  showError(message, fieldPrefix) {
    const errorSpan = document.getElementById(fieldPrefix + "Error");
    if (errorSpan) {
      errorSpan.textContent = message;
      errorSpan.style.display = "block";
    } else {
      console.error("Error span not found:", fieldPrefix + "Error");
      alert(message);
    }
  }

  showMessage(message, type = "info") {
    // Crear notificación
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Mostrar notificación
    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    // Ocultar después de 3 segundos
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  showLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      this.initCaptcha("login");
    }
  }

  showRegisterModal() {
    const modal = document.getElementById("registerModal");
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      this.initCaptcha("register");
    }
  }

  closeAuthModals() {
    const loginModal = document.getElementById("loginModal");
    const registerModal = document.getElementById("registerModal");

    if (loginModal) loginModal.classList.remove("active");
    if (registerModal) registerModal.classList.remove("active");

    document.body.style.overflow = "";

    // Limpiar formularios
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();

    // Limpiar errores
    document.querySelectorAll(".error-message").forEach((span) => {
      span.textContent = "";
      span.style.display = "none";
    });

    // Reset border colors
    document.querySelectorAll("input").forEach((input) => {
      input.style.borderColor = "";
    });
  }

  handleLogout() {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      this.model.logout();
      this.updateAuthUI();

      // Redirigir a inicio
      viewManager.showSection("home");

      this.showMessage("Sesión cerrada exitosamente", "success");
    }
  }

  updateAuthUI() {
    const currentUser = this.model.getCurrentUser();
    const authButtons = document.getElementById("authButtons");
    const userMenu = document.getElementById("userMenu");
    const myListsBtn = document.getElementById("myListsBtn");

    if (currentUser) {
      // Usuario logueado
      if (authButtons) authButtons.style.display = "none";
      if (userMenu) userMenu.style.display = "flex";
      if (myListsBtn) myListsBtn.style.display = "block";

      // Actualizar info del usuario
      const usernameDisplay = document.getElementById("usernameDisplay");
      const userAvatar = document.getElementById("userAvatar");

      if (usernameDisplay) {
        usernameDisplay.textContent = currentUser.username;
      }

      if (userAvatar) {
        userAvatar.src =
          currentUser.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            currentUser.nombre + " " + currentUser.apellido,
          )}&background=667eea&color=fff`;
      }
    } else {
      // No hay usuario
      if (authButtons) authButtons.style.display = "flex";
      if (userMenu) userMenu.style.display = "none";
      if (myListsBtn) myListsBtn.style.display = "none";
    }
  }
}

const authController = new AuthController();
