// js/controllers/authController.js
// Controlador de autenticación ACTUALIZADO con validación completa

class AuthController {
  constructor() {
    this.model = userModel;
    this.validationService = validationService;
  }

  init() {
    this.setupEventListeners();
    this.updateUIState();

    // Inicializar CAPTCHAs
    this.validationService.initCaptcha("login");
    this.validationService.initCaptcha("register");

    const myListsBtn = document.getElementById("myListsBtn");
    if (myListsBtn) {
      myListsBtn.style.display = this.model.isLoggedIn() ? "block" : "none";
    }
  }

  setupEventListeners() {
    // Event listener para formulario de login
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      // Configurar validación en tiempo real
      this.validationService.setupLiveValidation(loginForm);

      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }

    // Event listener para formulario de registro
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      // Configurar validación en tiempo real
      this.validationService.setupLiveValidation(registerForm);

      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleRegister();
      });

      // Validación especial para confirmación de contraseña
      const confirmPassword = document.getElementById("regConfirmPassword");
      if (confirmPassword) {
        confirmPassword.addEventListener("input", () => {
          this.validationService.validateField(confirmPassword);
        });
      }
    }
  }

  async handleLogin() {
    const loginForm = document.getElementById("loginForm");

    // Validar formulario Frontend
    if (!this.validationService.validateForm(loginForm)) {
      this.showMessage(
        "Por favor corrige los errores en el formulario",
        "error",
      );
      return;
    }

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const captchaAnswer = document.getElementById("loginCaptchaAnswer").value;

    // Validar CAPTCHA
    if (!this.validationService.validateCaptcha("login", captchaAnswer)) {
      this.showMessage("Respuesta de verificación incorrecta", "error");
      this.validationService.refreshCaptcha("login");
      document.getElementById("loginCaptchaAnswer").value = "";
      return;
    }

    // Validación Backend (simulada)
    const backendValidation = await this.validationService.validateBackend({
      email,
      password,
    });

    if (!backendValidation.valid) {
      backendValidation.errors.forEach((error) => {
        this.showMessage(error.message, "error");
      });
      return;
    }

    try {
      const result = await this.model.login(email, password);

      if (result.success) {
        loginForm.reset();
        this.validationService.refreshCaptcha("login");
        this.showMessage(`Bienvenido, ${result.user.nombre}`, "success");
        this.updateUIState();
        this.closeAuthModals();

        const myListsBtn = document.getElementById("myListsBtn");
        if (myListsBtn) {
          myListsBtn.style.display = "block";
        }
      } else {
        this.showMessage(result.error, "error");
        this.validationService.refreshCaptcha("login");
      }
    } catch (error) {
      this.showMessage("Error al iniciar sesión", "error");
      console.error(error);
    }
  }

  async handleRegister() {
    const registerForm = document.getElementById("registerForm");

    // Validar formulario Frontend
    if (!this.validationService.validateForm(registerForm)) {
      this.showMessage(
        "Por favor corrige los errores en el formulario",
        "error",
      );
      return;
    }

    const formData = {
      nombre: document.getElementById("regNombre").value.trim(),
      apellido: document.getElementById("regApellido").value.trim(),
      username: document.getElementById("regUsername").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      password: document.getElementById("regPassword").value,
      confirmPassword: document.getElementById("regConfirmPassword").value,
    };

    const captchaAnswer = document.getElementById(
      "registerCaptchaAnswer",
    ).value;
    const termsAccepted = document.getElementById("regTerms").checked;

    // Validar términos y condiciones
    if (!termsAccepted) {
      this.showMessage("Debes aceptar los términos y condiciones", "error");
      return;
    }

    // Validar CAPTCHA
    if (!this.validationService.validateCaptcha("register", captchaAnswer)) {
      this.showMessage("Respuesta de verificación incorrecta", "error");
      this.validationService.refreshCaptcha("register");
      document.getElementById("registerCaptchaAnswer").value = "";
      return;
    }

    // Validación Backend
    const backendValidation =
      await this.validationService.validateBackend(formData);

    if (!backendValidation.valid) {
      backendValidation.errors.forEach((error) => {
        const field = document.getElementById(
          error.field === "email"
            ? "regEmail"
            : error.field === "username"
              ? "regUsername"
              : error.field === "confirmPassword"
                ? "regConfirmPassword"
                : error.field,
        );
        if (field) {
          this.validationService.showFieldError(field, error.message);
        }
        this.showMessage(error.message, "error");
      });
      return;
    }

    try {
      const result = await this.model.register(formData);

      if (result.success) {
        registerForm.reset();
        this.validationService.refreshCaptcha("register");
        this.showMessage(
          "Registro exitoso. Por favor inicia sesión",
          "success",
        );
        this.closeAuthModals();

        setTimeout(() => {
          this.showLoginModal();
        }, 500);
      } else {
        this.showMessage(result.error, "error");
      }
    } catch (error) {
      this.showMessage("Error al registrar usuario", "error");
      console.error(error);
    }
  }

  handleLogout() {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      this.model.logout();
      this.updateUIState();
      this.showMessage("Sesión cerrada exitosamente", "info");

      const myListsBtn = document.getElementById("myListsBtn");
      if (myListsBtn) {
        myListsBtn.style.display = "none";
      }

      if (viewManager) {
        viewManager.showSection("home");
      }
    }
  }

  updateUIState() {
    const isLoggedIn = this.model.isLoggedIn();
    const user = this.model.getCurrentUser();

    const authButtons = document.getElementById("authButtons");
    const userMenu = document.getElementById("userMenu");

    if (authButtons && userMenu) {
      if (isLoggedIn) {
        authButtons.style.display = "none";
        userMenu.style.display = "flex";

        const usernameDisplay = document.getElementById("usernameDisplay");
        const userAvatar = document.getElementById("userAvatar");

        if (usernameDisplay) {
          usernameDisplay.textContent = user.username;
        }

        if (userAvatar) {
          userAvatar.src = user.avatar || userModel.getDefaultAvatar();
        }
      } else {
        authButtons.style.display = "flex";
        userMenu.style.display = "none";
      }
    }

    const myListsBtn = document.getElementById("myListsBtn");
    if (myListsBtn) {
      myListsBtn.style.display = isLoggedIn ? "block" : "none";
    }
  }

  showLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";

      // Generar nuevo CAPTCHA
      this.validationService.initCaptcha("login");

      setTimeout(() => {
        const emailInput = document.getElementById("loginEmail");
        if (emailInput) emailInput.focus();
      }, 100);
    }
  }

  showRegisterModal() {
    const modal = document.getElementById("registerModal");
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";

      // Generar nuevo CAPTCHA
      this.validationService.initCaptcha("register");

      setTimeout(() => {
        const nombreInput = document.getElementById("regNombre");
        if (nombreInput) nombreInput.focus();
      }, 100);
    }
  }

  closeAuthModals() {
    const loginModal = document.getElementById("loginModal");
    const registerModal = document.getElementById("registerModal");

    if (loginModal) {
      loginModal.classList.remove("active");
      // Limpiar formulario
      const loginForm = document.getElementById("loginForm");
      if (loginForm) {
        loginForm.reset();
        // Limpiar errores
        loginForm.querySelectorAll(".error-message").forEach((el) => {
          el.style.display = "none";
          el.textContent = "";
        });
        loginForm.querySelectorAll("input.error").forEach((el) => {
          el.classList.remove("error");
        });
      }
    }

    if (registerModal) {
      registerModal.classList.remove("active");
      // Limpiar formulario
      const registerForm = document.getElementById("registerForm");
      if (registerForm) {
        registerForm.reset();
        // Limpiar errores
        registerForm.querySelectorAll(".error-message").forEach((el) => {
          el.style.display = "none";
          el.textContent = "";
        });
        registerForm.querySelectorAll("input.error").forEach((el) => {
          el.classList.remove("error");
        });
      }
    }

    document.body.style.overflow = "auto";
  }

  showMessage(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Crear instancia global
const authController = new AuthController();
