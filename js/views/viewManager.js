// js/views/viewManager.js
// ACTUALIZADO con soporte de paginación

class ViewManager {
  constructor() {
    this.currentSection = "home";
    this.searchTimeout = null;
  }

  init() {
    this.setupNavigation();
    this.setupSearch();
    this.setupModal();
    this.showSection("home");
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const section = button.getAttribute("data-section");
        this.showSection(section);
      });
    });
  }

  showSection(sectionName) {
    const sections = document.querySelectorAll(".section");
    sections.forEach((section) => section.classList.remove("active"));

    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
      targetSection.classList.add("active");
      this.currentSection = sectionName;
    }

    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach((btn) => btn.classList.remove("active"));
    const activeButton = document.querySelector(
      `[data-section="${sectionName}"]`
    );
    if (activeButton) {
      activeButton.classList.add("active");
    }

    const searchSection = document.getElementById("searchSection");
    if (searchSection) {
      if (sectionName === "home") {
        searchSection.classList.remove("active");
      } else {
        searchSection.classList.add("active");
      }
    }

    this.initializeSection(sectionName);
    this.clearSearch();
  }

  async initializeSection(sectionName) {
    switch (sectionName) {
      case "home":
        await this.loadHomeContent();
        break;
      case "animes":
        await animeController.init();
        // Inicializar paginación de animes
        animeController.updatePaginationUI();
        break;
      case "games":
        await gameController.init();
        // Inicializar paginación de videojuegos
        gameController.updatePaginationUI();
        break;
    }
  }

  async loadHomeContent() {
    const featuredContent = document.getElementById("featuredContent");
    if (!featuredContent) return;

    await Promise.all([animeModel.loadAnimes(), gameModel.loadGames()]);

    const animes = animeController.getFeaturedAnimes();
    const games = gameController.getFeaturedGames();

    const allFeatured = [...animes, ...games];

    featuredContent.innerHTML = allFeatured
      .map((item) => {
        const isAnime = item.episodes !== undefined;
        const controller = isAnime ? "animeController" : "gameController";

        // Para animes, mostrar rating normal; para videojuegos, mostrar metacritic
        let ratingHTML = "";
        if (isAnime) {
          ratingHTML = `<span class="rating">⭐ ${item.rating}</span>`;
        } else {
          ratingHTML = item.metacritic
            ? `<span class="metacritic-score" style="background-color: ${item.metacriticColor}">${item.metacritic}</span>`
            : '<span class="no-score">N/A</span>';
        }

        return `
                <div class="catalog-item" onclick="${controller}.showDetails(${item.id})">
                    <img src="${item.image}" alt="${item.title}" class="item-poster">
                    <div class="item-info">
                        <h3>${item.title}</h3>
                        <div class="item-meta">
                            ${ratingHTML}
                            <span class="year">${item.year}</span>
                        </div>
                        <p class="genre">${item.genre}</p>
                    </div>
                </div>
            `;
      })
      .join("");
  }

  setupSearch() {
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.querySelector(".search-btn");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });

      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          clearTimeout(this.searchTimeout);
          this.handleSearch(e.target.value);
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        const searchTerm = searchInput ? searchInput.value : "";
        this.handleSearch(searchTerm);
      });
    }
  }

  handleSearch(searchTerm) {
    if (this.currentSection === "animes") {
      animeController.search(searchTerm);
    } else if (this.currentSection === "games") {
      gameController.search(searchTerm);
    }
  }

  clearSearch() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.value = "";
    }
  }

  setupModal() {
    const modal = document.getElementById("detailsModal");
    const overlay = document.querySelector(".modal-overlay");
    const closeBtn = document.querySelector(".modal-close");

    if (overlay) {
      overlay.addEventListener("click", () => this.closeModal());
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeModal());
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && modal.classList.contains("active")) {
        this.closeModal();
      }
    });
  }

  closeModal() {
    const modal = document.getElementById("detailsModal");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "auto";
    }
  }
}

const viewManager = new ViewManager();
