// js/services/validationService.js
// CORREGIDO - CAPTCHA funciona correctamente

class ValidationService {
  constructor() {
    // Patrones de expresiones regulares
    this.patterns = {
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      username: /^[a-zA-Z0-9_-]{3,20}$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
      name: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      phone: /^[\d\s\-\+\(\)]{7,20}$/,
    };

    // Mensajes de error personalizados
    this.errorMessages = {
      required: "Este campo es obligatorio",
      email: "Por favor ingresa un correo electrónico válido",
      username:
        "El usuario debe tener entre 3 y 20 caracteres (letras, números, guiones)",
      password:
        "La contraseña debe tener mínimo 6 caracteres, una mayúscula, una minúscula y un número",
      name: "El nombre solo debe contener letras y espacios",
      minLength: "Debe tener al menos {min} caracteres",
      maxLength: "No debe exceder {max} caracteres",
      match: "Los campos no coinciden",
      unique: "Este valor ya está en uso",
      number: "Solo se permiten números",
      range: "El valor debe estar entre {min} y {max}",
    };
  }

  // ==================== VALIDACIÓN FRONTEND ====================

  /**
   * Validar campo individual
   * @param {HTMLInputElement} field - Campo a validar
   * @returns {Object} - { valid: boolean, error: string }
   */
  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.id;
    const type = field.type;
    let error = "";

    // Validar campo requerido
    if (field.hasAttribute("required") && !value) {
      error = this.errorMessages.required;
      this.showFieldError(field, error);
      return { valid: false, error };
    }

    // Validar según el tipo de campo
    switch (fieldName) {
      case "loginEmail":
      case "regEmail":
        if (value && !this.patterns.email.test(value)) {
          error = this.errorMessages.email;
        }
        break;

      case "regUsername":
        if (value && !this.patterns.username.test(value)) {
          error = this.errorMessages.username;
        }
        break;

      case "regPassword":
      case "loginPassword":
        if (value && !this.patterns.password.test(value)) {
          error = this.errorMessages.password;
        }
        break;

      case "regNombre":
      case "regApellido":
        if (value && !this.patterns.name.test(value)) {
          error = this.errorMessages.name;
        }
        break;

      case "regConfirmPassword":
        const password = document.getElementById("regPassword").value;
        if (value && value !== password) {
          error = this.errorMessages.match;
        }
        break;
    }

    // Validar longitud mínima
    if (field.hasAttribute("minlength")) {
      const minLength = parseInt(field.getAttribute("minlength"));
      if (value.length < minLength) {
        error = this.errorMessages.minLength.replace("{min}", minLength);
      }
    }

    // Validar longitud máxima
    if (field.hasAttribute("maxlength")) {
      const maxLength = parseInt(field.getAttribute("maxlength"));
      if (value.length > maxLength) {
        error = this.errorMessages.maxLength.replace("{max}", maxLength);
      }
    }

    // Validar patrón HTML5
    if (field.hasAttribute("pattern") && value) {
      const pattern = new RegExp(field.getAttribute("pattern"));
      if (!pattern.test(value)) {
        error = field.getAttribute("title") || "Formato inválido";
      }
    }

    // Mostrar u ocultar error
    if (error) {
      this.showFieldError(field, error);
      return { valid: false, error };
    } else {
      this.clearFieldError(field);
      return { valid: true, error: "" };
    }
  }

  /**
   * Mostrar error en campo
   * @param {HTMLInputElement} field - Campo con error
   * @param {string} message - Mensaje de error
   */
  showFieldError(field, message) {
    field.classList.add("error");
    field.setAttribute("aria-invalid", "true");

    const errorId = `${field.id}Error`;
    const errorElement = document.getElementById(errorId);

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = "block";
    }
  }

  /**
   * Limpiar error de campo
   * @param {HTMLInputElement} field - Campo a limpiar
   */
  clearFieldError(field) {
    field.classList.remove("error");
    field.setAttribute("aria-invalid", "false");

    const errorId = `${field.id}Error`;
    const errorElement = document.getElementById(errorId);

    if (errorElement) {
      errorElement.textContent = "";
      errorElement.style.display = "none";
    }
  }

  /**
   * Validar formulario completo
   * @param {HTMLFormElement} form - Formulario a validar
   * @returns {boolean} - true si es válido
   */
  validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll("input[required], input[pattern]");

    inputs.forEach((input) => {
      const validation = this.validateField(input);
      if (!validation.valid) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Configurar validación en tiempo real
   * @param {HTMLFormElement} form - Formulario
   */
  setupLiveValidation(form) {
    const inputs = form.querySelectorAll("input");

    inputs.forEach((input) => {
      // Validar al perder el foco
      input.addEventListener("blur", () => {
        this.validateField(input);
      });

      // Limpiar error al escribir
      input.addEventListener("input", () => {
        if (input.classList.contains("error")) {
          this.validateField(input);
        }
      });
    });
  }

  // ==================== VALIDACIÓN BACKEND (SIMULADA) ====================

  /**
   * Simular validación backend
   * @param {Object} data - Datos a validar
   * @returns {Object} - { valid: boolean, errors: Array }
   */
  async validateBackend(data) {
    const errors = [];

    // Simular latencia de red
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Validar email único
    if (data.email) {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const emailExists = users.some((u) => u.email === data.email);

      if (emailExists) {
        errors.push({
          field: "Email",
          message: "Este correo ya está registrado",
        });
      }
    }

    // Validar username único
    if (data.username) {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const usernameExists = users.some((u) => u.username === data.username);

      if (usernameExists) {
        errors.push({
          field: "Username",
          message: "Este nombre de usuario ya está en uso",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ==================== VERIFICACIÓN HUMANA (CAPTCHA) ====================

  /**
   * Generar pregunta matemática simple
   * @returns {Object} - { question: string, answer: number }
   */
  generateMathCaptcha() {
    const operations = [
      { type: "sum", symbol: "+" },
      { type: "subtract", symbol: "-" },
      { type: "multiply", symbol: "×" },
    ];

    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2, answer;

    switch (operation.type) {
      case "sum":
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 + num2;
        break;
      case "subtract":
        // Asegurar que el resultado sea positivo
        num1 = Math.floor(Math.random() * 10) + 5;
        num2 = Math.floor(Math.random() * num1);
        answer = num1 - num2;
        break;
      case "multiply":
        // Usar números más pequeños para multiplicación
        num1 = Math.floor(Math.random() * 5) + 1;
        num2 = Math.floor(Math.random() * 5) + 1;
        answer = num1 * num2;
        break;
    }

    const captcha = {
      question: `¿Cuánto es ${num1} ${operation.symbol} ${num2}?`,
      answer: answer,
    };

    console.log("🔢 Nuevo CAPTCHA generado:", captcha);
    return captcha;
  }

  /**
   * Validar respuesta de CAPTCHA
   * @param {Object} captcha - Objeto CAPTCHA con question y answer
   * @param {string} userAnswer - Respuesta del usuario
   * @returns {boolean}
   */
  validateCaptcha(captcha, userAnswer) {
    if (!captcha) {
      console.error("❌ No hay CAPTCHA para validar");
      return false;
    }

    const answer = parseInt(userAnswer);
    const isValid = answer === captcha.answer;

    console.log("🔢 Validando CAPTCHA:");
    console.log("   Pregunta:", captcha.question);
    console.log("   Respuesta correcta:", captcha.answer);
    console.log("   Respuesta usuario:", answer);
    console.log("   ¿Es válido?:", isValid);

    return isValid;
  }

  // ==================== UTILIDADES ====================

  /**
   * Sanitizar entrada de usuario
   * @param {string} input - Texto a sanitizar
   * @returns {string} - Texto sanitizado
   */
  sanitize(input) {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Validar longitud de texto
   * @param {string} text - Texto a validar
   * @param {number} min - Longitud mínima
   * @param {number} max - Longitud máxima
   * @returns {boolean}
   */
  validateLength(text, min, max) {
    return text.length >= min && text.length <= max;
  }

  /**
   * Validar rango numérico
   * @param {number} value - Valor a validar
   * @param {number} min - Mínimo
   * @param {number} max - Máximo
   * @returns {boolean}
   */
  validateRange(value, min, max) {
    return value >= min && value <= max;
  }
}

// Crear instancia global
const validationService = new ValidationService();
