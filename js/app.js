// js/app.js - VERSIÓN CORREGIDA
// Punto de entrada principal - Práctica 2 Unidad 2
// Integra todos los módulos P2 sin romper la navegación ni el home original

class AppP2 {
  constructor() {
    this.version = "2.0.0";
    this.inicializado = false;
  }

  async init() {
    if (this.inicializado) return;

    try {
      if (document.readyState === "loading") {
        await new Promise((resolve) =>
          document.addEventListener("DOMContentLoaded", resolve),
        );
      }

      console.time("[App] Tiempo de inicialización");

      // 1. Inicializar motor de animaciones (módulo P2)
      if (typeof animationEngine !== "undefined") {
        animationEngine.init();
      }

      // 2. Inicializar carrusel avanzado (módulo P2) si existe el contenedor
      if (
        typeof CarruselAvanzado !== "undefined" &&
        document.querySelector(".carousel-container")
      ) {
        new CarruselAvanzado(".carousel-container", {
          autoplay: true,
          intervalo: 5000,
          loop: true,
          teclado: true,
        });
      }

      // 3. Inicializar controladores originales del proyecto
      //    viewManager.init() se encarga de navegación, home y modal
      if (typeof viewManager !== "undefined") viewManager.init();
      if (typeof searchController !== "undefined") searchController.init();
      if (typeof carouselController !== "undefined")
        await carouselController.init();

      // 4. Conectar buscador P2 SIN agregar segundo listener de render
      this.integrarBuscadorDebounce();

      // 5. Iniciar polling inteligente (módulo P2)
      if (typeof pollingManager !== "undefined") {
        pollingManager.iniciar((nuevos) => {
          console.log("[Polling] Nuevos datos recibidos:", nuevos.length);
          this.manejarNuevosDatos(nuevos);
        });
      }

      // 6. Configurar efecto de scroll en header
      this.configurarScrollHeader();

      console.timeEnd("[App] Tiempo de inicialización");
      console.log(`LobitosGames v${this.version} inicializado`);
      if (typeof cacheManager !== "undefined") {
        console.log("[Cache] Stats iniciales:", cacheManager.getStats());
      }

      this.inicializado = true;
    } catch (error) {
      console.error("[App] Error de inicialización:", error);
    }
  }

  /**
   * Conecta el input de búsqueda con buscarConDebounce del módulo api.js.
   * NO agrega lógica de render propia — viewManager.handleSearch ya lo hace.
   * Solo escucha el evento para logging/diagnóstico.
   */
  integrarBuscadorDebounce() {
    if (typeof buscarConDebounce === "undefined") return;

    document.addEventListener("resultadosBusqueda", (e) => {
      const { animes, juegos, fallaron } = e.detail;
      if (fallaron && fallaron.length > 0) {
        console.warn(
          "[Búsqueda P2] No se pudo buscar en:",
          fallaron.join(", "),
        );
      }
      console.log(
        "[Búsqueda P2] animes: " +
          (animes?.length || 0) +
          ", juegos: " +
          (juegos?.length || 0),
      );
    });
  }

  manejarNuevosDatos(nuevos) {
    if (typeof DOM === "undefined") return;

    const idsExistentes = new Set(
      DOM.selectAll("[data-id]").map((el) => el.dataset.id),
    );

    const realmente = nuevos.filter((item) => {
      const id = String(item.mal_id || item.id);
      return !idsExistentes.has(id);
    });

    if (realmente.length === 0) return;

    if (typeof animationEngine !== "undefined") {
      const nuevasTarjetas = DOM.selectAll(".catalog-item:not(.card-visible)");
      animationEngine.animarNuevosDatos(nuevasTarjetas);
    }
  }

  configurarScrollHeader() {
    const header = document.querySelector(".header");
    if (!header) return;

    const actualizarHeader =
      typeof throttleRAF === "function"
        ? throttleRAF(() => {
            header.classList.toggle("scrolled", window.scrollY > 50);
          })
        : () => {
            header.classList.toggle("scrolled", window.scrollY > 50);
          };

    window.addEventListener("scroll", actualizarHeader, { passive: true });
  }
}

const appP2 = new AppP2();
appP2.init();
