// js/controllers/searchController.js
// CORREGIDO - Toggle de filtros avanzados arreglado

class SearchController {
  constructor() {
    this.advancedPanelOpen = false;
    this.currentSection = "animes";
  }

  init() {
    console.log("🔍 SearchController inicializado");
    this.setupEventListeners();
    this.updateGenreFilters();
  }

  setupEventListeners() {
    // Input de búsqueda
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const value = e.target.value;
          if (value.length >= 2) {
            if (this.currentSection === "animes") {
              animeController.search(value);
            } else if (this.currentSection === "games") {
              gameController.search(value);
            }
          } else if (value.length === 0) {
            if (this.currentSection === "animes") {
              animeController.renderAnimeGrid();
            } else if (this.currentSection === "games") {
              gameController.renderGameGrid();
            }
          }
        }, 500);
      });

      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const value = e.target.value;
          if (value.length >= 2) {
            if (this.currentSection === "animes") {
              animeController.search(value);
            } else if (this.currentSection === "games") {
              gameController.search(value);
            }
          }
        }
      });
    }

    // CORREGIDO: Botón de búsqueda
    const searchBtn = document.querySelector(".search-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        const value = searchInput?.value || "";
        if (value.length >= 2) {
          if (this.currentSection === "animes") {
            animeController.search(value);
          } else if (this.currentSection === "games") {
            gameController.search(value);
          }
        }
      });
    }

    // NOTA: el botón .btn-advanced-search ya tiene onclick="searchController.toggleAdvancedSearch()"
    // en el HTML, así que NO agregamos addEventListener aquí para evitar que se dispare dos veces
    // (lo que causaría que el panel se abriera y cerrara inmediatamente).

    // Botones de aplicar y limpiar filtros
    const btnApplyFilters = document.querySelector(".btn-apply-filters");
    if (btnApplyFilters) {
      btnApplyFilters.addEventListener("click", () => {
        this.applyAdvancedFilters();
      });
    }

    const btnResetFilters = document.querySelector(".btn-reset-filters");
    if (btnResetFilters) {
      btnResetFilters.addEventListener("click", () => {
        this.resetFilters();
      });
    }

    // Detectar cambio de sección
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const section = btn.getAttribute("data-section");
        if (section === "animes" || section === "games") {
          this.currentSection = section;
          this.updateGenreFilters();
          this.updateRatingSlider();
        }
      });
    });

    // Slider de calificación
    const ratingSlider = document.getElementById("filterRating");
    const ratingValue = document.getElementById("ratingValue");

    if (ratingSlider && ratingValue) {
      ratingSlider.addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        if (this.currentSection === "games") {
          ratingValue.textContent = Math.round(value * 10); // 0-100
        } else {
          ratingValue.textContent = value.toFixed(1); // 0-10
        }
      });
    }
  }

  toggleAdvancedSearch() {
    const panel = document.getElementById("advancedSearchPanel");
    const btn = document.querySelector(".btn-advanced-search");

    if (!panel) {
      console.error("❌ No se encontró el panel de búsqueda avanzada");
      return;
    }

    this.advancedPanelOpen = !this.advancedPanelOpen;

    if (this.advancedPanelOpen) {
      panel.style.display = "block";
      panel.classList.add("show");
      if (btn) btn.textContent = "Ocultar Filtros";
      console.log("✅ Panel de filtros: abierto");
    } else {
      panel.classList.remove("show");
      setTimeout(() => {
        panel.style.display = "none";
      }, 300);
      if (btn) btn.textContent = "Filtros Avanzados";
      console.log("✅ Panel de filtros: cerrado");
    }
  }

  updateGenreFilters() {
    const filterGenre = document.getElementById("filterGenre");
    if (!filterGenre) return;

    const sourceSelect =
      this.currentSection === "animes"
        ? document.getElementById("animeGenre")
        : document.getElementById("gameGenre");

    if (!sourceSelect) return;

    filterGenre.innerHTML = "";
    Array.from(sourceSelect.options).forEach((option) => {
      const newOption = document.createElement("option");
      newOption.value = option.value;
      newOption.textContent = option.textContent;
      filterGenre.appendChild(newOption);
    });

    console.log(`✅ Géneros actualizados para ${this.currentSection}`);
  }

  updateRatingSlider() {
    const ratingSlider = document.getElementById("filterRating");
    const ratingValue = document.getElementById("ratingValue");

    if (!ratingSlider || !ratingValue) return;

    if (this.currentSection === "games") {
      ratingSlider.max = "10";
      ratingSlider.value = "0";
      ratingValue.textContent = "0";
    } else {
      ratingSlider.max = "10";
      ratingSlider.value = "0";
      ratingValue.textContent = "0.0";
    }
  }

  async applyAdvancedFilters() {
    const filters = {
      genre: document.getElementById("filterGenre")?.value || "",
      yearMin: parseInt(document.getElementById("filterYearMin")?.value) || 0,
      yearMax:
        parseInt(document.getElementById("filterYearMax")?.value) || 9999,
      rating: parseFloat(document.getElementById("filterRating")?.value) || 0,
      sort: document.getElementById("filterSort")?.value || "relevance",
    };

    if (filters.yearMin > filters.yearMax) {
      alert("El año mínimo no puede ser mayor al año máximo");
      return;
    }

    console.log("🔍 Aplicando filtros:", filters);

    if (this.currentSection === "animes") {
      let items = animeModel.getAllAnimes();

      if (filters.genre) {
        items = items.filter((anime) =>
          anime.genre.toLowerCase().includes(filters.genre.toLowerCase()),
        );
      }

      items = items.filter((anime) => {
        const year = parseInt(anime.year) || 0;
        return year >= filters.yearMin && year <= filters.yearMax;
      });

      items = items.filter((anime) => {
        const rating = parseFloat(anime.rating) || 0;
        return rating >= filters.rating;
      });

      // Ordenar
      if (filters.sort === "rating") {
        items.sort(
          (a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0),
        );
      } else if (filters.sort === "year") {
        items.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0));
      } else if (filters.sort === "title") {
        items.sort((a, b) => a.title.localeCompare(b.title));
      }

      animeController.renderAnimeGrid(items);
    } else if (this.currentSection === "games") {
      let items = gameModel.getAllGames();

      if (filters.genre) {
        items = items.filter((game) =>
          game.genre.toLowerCase().includes(filters.genre.toLowerCase()),
        );
      }

      items = items.filter((game) => {
        const year = parseInt(game.year) || 0;
        return year >= filters.yearMin && year <= filters.yearMax;
      });

      items = items.filter((game) => {
        const rating = parseFloat(game.rating) || 0;
        return rating >= filters.rating;
      });

      // Ordenar
      if (filters.sort === "rating") {
        items.sort(
          (a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0),
        );
      } else if (filters.sort === "year") {
        items.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0));
      } else if (filters.sort === "title") {
        items.sort((a, b) => a.title.localeCompare(b.title));
      }

      gameController.renderGameGrid(items);
    }

    // Cerrar panel automáticamente
    this.toggleAdvancedSearch();
  }

  resetFilters() {
    document.getElementById("filterGenre").value = "";
    document.getElementById("filterYearMin").value = "";
    document.getElementById("filterYearMax").value = "";
    document.getElementById("filterRating").value = "0";
    document.getElementById("ratingValue").textContent =
      this.currentSection === "games" ? "0" : "0.0";
    document.getElementById("filterSort").value = "relevance";

    if (this.currentSection === "animes") {
      animeController.renderAnimeGrid();
    } else {
      gameController.renderGameGrid();
    }
  }
}

const searchController = new SearchController();
