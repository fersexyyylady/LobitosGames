// js/controllers/authController.js
// Controlador de autenticación y gestión de usuario

class AuthController {
  constructor() {
    this.model = userModel;
  }

  /**
   * Inicializar el controlador
   */
  init() {
    this.setupEventListeners();
    this.updateUIState();
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Event listeners para formularios de login y registro
    // Se configurarán cuando se creen los modales
  }

  /**
   * Manejar el registro de usuario
   * @param {Object} formData - Datos del formulario
   */
  async handleRegister(formData) {
    try {
      const result = await this.model.register(formData);

      if (result.success) {
        // Mostrar mensaje de éxito
        this.showMessage(
          "Registro exitoso. Por favor inicia sesión.",
          "success"
        );
        // Cerrar modal de registro y abrir login
        this.showLoginModal();
      } else {
        this.showMessage(result.error, "error");
      }
    } catch (error) {
      this.showMessage("Error al registrar usuario", "error");
      console.error(error);
    }
  }

  /**
   * Manejar el inicio de sesión
   * @param {string} emailOrUsername - Email o username
   * @param {string} password - Contraseña
   */
  async handleLogin(emailOrUsername, password) {
    try {
      const result = await this.model.login(emailOrUsername, password);

      if (result.success) {
        this.showMessage(`¡Bienvenido, ${result.user.nombre}!`, "success");
        this.updateUIState();
        this.closeAuthModals();
      } else {
        this.showMessage(result.error, "error");
      }
    } catch (error) {
      this.showMessage("Error al iniciar sesión", "error");
      console.error(error);
    }
  }

  /**
   * Manejar el cierre de sesión
   */
  handleLogout() {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      this.model.logout();
      this.updateUIState();
      this.showMessage("Sesión cerrada exitosamente", "info");

      // Redirigir a inicio
      if (viewManager) {
        viewManager.showSection("home");
      }
    }
  }

  /**
   * Actualizar el estado de la UI según la autenticación
   */
  updateUIState() {
    const isLoggedIn = this.model.isLoggedIn();
    const user = this.model.getCurrentUser();

    // Actualizar botones de header
    const authButtons = document.getElementById("authButtons");
    const userMenu = document.getElementById("userMenu");

    if (authButtons && userMenu) {
      if (isLoggedIn) {
        authButtons.style.display = "none";
        userMenu.style.display = "flex";

        // Actualizar información del usuario
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
  }

  /**
   * Mostrar modal de login
   */
  showLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  /**
   * Mostrar modal de registro
   */
  showRegisterModal() {
    const modal = document.getElementById("registerModal");
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  /**
   * Cerrar modales de autenticación
   */
  closeAuthModals() {
    const loginModal = document.getElementById("loginModal");
    const registerModal = document.getElementById("registerModal");

    if (loginModal) {
      loginModal.classList.remove("active");
    }

    if (registerModal) {
      registerModal.classList.remove("active");
    }

    document.body.style.overflow = "auto";
  }

  /**
   * Mostrar mensaje al usuario
   * @param {string} message - Mensaje
   * @param {string} type - Tipo: 'success', 'error', 'info'
   */
  showMessage(message, type = "info") {
    // Crear elemento de notificación
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Agregar al DOM
    document.body.appendChild(notification);

    // Animar entrada
    setTimeout(() => notification.classList.add("show"), 100);

    // Remover después de 3 segundos
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Validar formulario de registro
   * @param {Object} formData - Datos del formulario
   * @returns {Object} - { valid: boolean, errors: Array }
   */
  validateRegisterForm(formData) {
    const errors = [];

    if (!formData.nombre || formData.nombre.trim().length < 2) {
      errors.push("El nombre debe tener al menos 2 caracteres");
    }

    if (!formData.apellido || formData.apellido.trim().length < 2) {
      errors.push("El apellido debe tener al menos 2 caracteres");
    }

    if (!formData.username || formData.username.trim().length < 3) {
      errors.push("El nombre de usuario debe tener al menos 3 caracteres");
    }

    if (!formData.email || !this.isValidEmail(formData.email)) {
      errors.push("El correo electrónico no es válido");
    }

    if (!formData.password || formData.password.length < 6) {
      errors.push("La contraseña debe tener al menos 6 caracteres");
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push("Las contraseñas no coinciden");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validar email
   * @param {string} email - Email a validar
   * @returns {boolean}
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
}

// Crear instancia global
const authController = new AuthController();
