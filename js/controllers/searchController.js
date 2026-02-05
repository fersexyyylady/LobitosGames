// js/controllers/searchController.js - VERSION COMPATIBLE
class SearchController {
  constructor() {
    this.advancedPanelOpen = false;
    this.currentSection = "animes";
  }

  init() {
    console.log("🔍 SearchController inicializado");
    this.setupEventListeners();
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
              animeController.loadAnimes(1);
            } else if (this.currentSection === "games") {
              gameController.loadGames(1);
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

  toggleAdvancedSearch() {
    const panel = document.getElementById("advancedSearchPanel");
    if (!panel) return;

    this.advancedPanelOpen = !this.advancedPanelOpen;
    panel.classList.toggle("active", this.advancedPanelOpen);

    const btn = document.querySelector(".btn-advanced-search");
    if (btn) {
      btn.textContent = this.advancedPanelOpen
        ? "Ocultar Filtros"
        : "Filtros Avanzados";
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

    console.log("Aplicando filtros:", filters);

    if (this.currentSection === "animes") {
      let items = animeModel.getAllAnimes();

      if (filters.genre) {
        items = items.filter(
          (anime) =>
            anime.genres && anime.genres.some((g) => g.name === filters.genre),
        );
      }

      items = items.filter((anime) => {
        const year = anime.year || 0;
        return year >= filters.yearMin && year <= filters.yearMax;
      });

      items = items.filter((anime) => {
        const rating = parseFloat(anime.score) || 0;
        return rating >= filters.rating;
      });

      animeController.renderAnimeGrid(items);
    } else if (this.currentSection === "games") {
      let items = gameModel.getAllGames();

      if (filters.genre) {
        items = items.filter(
          (game) =>
            game.genres && game.genres.some((g) => g.name === filters.genre),
        );
      }

      items = items.filter((game) => {
        const year = game.released ? new Date(game.released).getFullYear() : 0;
        return year >= filters.yearMin && year <= filters.yearMax;
      });

      items = items.filter((game) => {
        const rating = (parseFloat(game.rating) || 0) * 10; // Convertir a 0-100
        return rating >= filters.rating;
      });

      gameController.renderGameGrid(items);
    }
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
      animeController.loadAnimes(1);
    } else {
      gameController.loadGames(1);
    }
  }
}

const searchController = new SearchController();
