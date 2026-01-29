// js/controllers/animeController.js
// Controlador de Animes - CON FILTROS EN INGLÉS FUNCIONANDO

class AnimeController {
  constructor() {
    this.model = animeModel;
    this.currentFilter = "";
    this.currentPage = 1;
    this.totalPages = 10;
  }

  async init() {
    // Esperar a que se carguen los animes
    if (this.model.animes.length === 0) {
      await this.model.loadAnimes();
    }

    this.renderAnimeGrid();
    this.setupFilters();
    this.setupPagination();

    console.log("📊 Fuente de datos:", this.model.getDataSource());
  }

  renderAnimeGrid(animes = null) {
    const grid = document.getElementById("animeGrid");
    if (!grid) return;

    const animesToShow = animes || this.model.getAllAnimes();

    if (animesToShow.length === 0) {
      grid.innerHTML = `
        <div class="loading">
          <p>Cargando animes...</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = animesToShow
      .map(
        (anime) => `
            <div class="catalog-item" onclick="animeController.showDetails(${anime.id})">
                <img src="${anime.image}" alt="${anime.title}" class="item-poster">
                <div class="item-info">
                    <h3>${anime.title}</h3>
                    <div class="item-meta">
                        <span class="rating">⭐ ${anime.rating}</span>
                        <span class="year">${anime.year}</span>
                    </div>
                    <p class="genre">${anime.genre}</p>
                    <button class="play-btn" onclick="event.stopPropagation(); animeController.showDetails(${anime.id})">Ver detalles</button>
                </div>
            </div>
        `,
      )
      .join("");
  }

  setupFilters() {
    const genreFilter = document.getElementById("animeGenre");
    if (genreFilter) {
      genreFilter.addEventListener("change", (e) => {
        this.filterByGenre(e.target.value);
      });
    }
  }

  filterByGenre(genre) {
    this.currentFilter = genre;

    if (!genre) {
      // Si no hay filtro, mostrar todos
      this.renderAnimeGrid(this.model.getAllAnimes());
      return;
    }

    // Filtrar animes que contengan el género seleccionado
    // La API de Jikan devuelve los géneros en inglés
    const filtered = this.model.getAllAnimes().filter((anime) => {
      return anime.genre.toLowerCase().includes(genre.toLowerCase());
    });

    console.log(
      `🔍 Filtrado por género "${genre}":`,
      filtered.length,
      "resultados",
    );
    this.renderAnimeGrid(filtered);
  }

  async search(searchTerm) {
    console.log("🔍 Buscando:", searchTerm);

    const grid = document.getElementById("animeGrid");
    if (grid) {
      grid.innerHTML = '<div class="loading"><p>Buscando animes...</p></div>';
    }

    let results = await this.model.searchAnimes(searchTerm);

    // Si hay filtro de género aplicado, filtrar resultados
    if (this.currentFilter) {
      results = results.filter((anime) =>
        anime.genre.toLowerCase().includes(this.currentFilter.toLowerCase()),
      );
    }

    this.renderAnimeGrid(results);
  }

  async showDetails(id) {
    try {
      const anime = await this.model.getAnimeDetails(id);

      if (!anime) {
        console.error("Anime no encontrado:", id);
        return;
      }

      const modal = document.getElementById("detailsModal");
      const modalBody = document.getElementById("modalBody");

      let detailsHTML = `
        <div class="modal-hero">
          <h2 id="modalTitle">${anime.title}</h2>
          <div class="modal-meta">
            <span class="modal-rating">⭐ ${anime.rating}</span>
            <span class="modal-year">${anime.year}</span>
            <span class="modal-genre">${anime.genre}</span>
          </div>
        </div>
        <div class="modal-details">
          <p><strong>Episodios:</strong> ${anime.episodes || "Desconocido"}</p>
      `;

      if (anime.status) {
        detailsHTML += `<p><strong>Estado:</strong> ${anime.status}</p>`;
      }

      if (anime.studios) {
        detailsHTML += `<p><strong>Estudios:</strong> ${anime.studios}</p>`;
      }

      if (anime.source) {
        detailsHTML += `<p><strong>Fuente:</strong> ${anime.source}</p>`;
      }

      detailsHTML += `
          <p><strong>Sinopsis:</strong></p>
          <p>${anime.synopsis}</p>
        </div>
      `;

      // Si el usuario está logueado, agregar botones de lista
      if (userModel && userModel.isLoggedIn()) {
        const currentList = userListModel.getItemListType(anime.id, "anime");

        detailsHTML += `
          <div class="modal-actions">
            <h3>Agregar a mis listas:</h3>
            <div class="list-buttons">
              <button class="btn-list ${
                currentList === "favoritos" ? "active" : ""
              }" 
                      onclick="animeController.addToList(${
                        anime.id
                      }, 'favoritos', ${JSON.stringify(anime).replace(
                        /"/g,
                        "&quot;",
                      )})">
                ⭐ Favoritos
              </button>
              <button class="btn-list ${
                currentList === "viendo" ? "active" : ""
              }" 
                      onclick="animeController.addToList(${
                        anime.id
                      }, 'viendo', ${JSON.stringify(anime).replace(
                        /"/g,
                        "&quot;",
                      )})">
                👁️ Viendo
              </button>
              <button class="btn-list ${
                currentList === "considerando" ? "active" : ""
              }" 
                      onclick="animeController.addToList(${
                        anime.id
                      }, 'considerando', ${JSON.stringify(anime).replace(
                        /"/g,
                        "&quot;",
                      )})">
                🤔 Considerando
              </button>
              <button class="btn-list ${
                currentList === "completado" ? "active" : ""
              }" 
                      onclick="animeController.addToList(${
                        anime.id
                      }, 'completado', ${JSON.stringify(anime).replace(
                        /"/g,
                        "&quot;",
                      )})">
                ✅ Completado
              </button>
              <button class="btn-list ${
                currentList === "dropeado" ? "active" : ""
              }" 
                      onclick="animeController.addToList(${
                        anime.id
                      }, 'dropeado', ${JSON.stringify(anime).replace(
                        /"/g,
                        "&quot;",
                      )})">
                ❌ Dropeado
              </button>
            </div>
          </div>
        `;
      }

      modalBody.innerHTML = detailsHTML;
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    } catch (error) {
      console.error("Error mostrando detalles:", error);
    }
  }

  async addToList(animeId, listType, animeData) {
    if (!userModel.isLoggedIn()) {
      authController.showMessage(
        "Debes iniciar sesión para agregar a tus listas",
        "error",
      );
      return;
    }

    const result = await userListModel.addToList(listType, animeData, "anime");

    if (result.success) {
      authController.showMessage(`Agregado a ${listType}`, "success");
      this.showDetails(animeId);
    } else {
      authController.showMessage(result.error, "error");
    }
  }

  getFeaturedAnimes() {
    return this.model.getAllAnimes().slice(0, 4);
  }

  setupPagination() {
    // Los botones se crearán dinámicamente
  }

  async changePage(page) {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;

    const grid = document.getElementById("animeGrid");
    if (grid) {
      grid.innerHTML = '<div class="loading"><p>Cargando página...</p></div>';
    }

    const animes = await this.model.loadMoreAnimes(page);
    this.renderAnimeGrid(animes);
    this.updatePaginationUI();

    document.getElementById("animes").scrollIntoView({ behavior: "smooth" });
  }

  updatePaginationUI() {
    const paginationContainer = document.getElementById("animePagination");
    if (!paginationContainer) return;

    let paginationHTML = '<div class="pagination">';

    paginationHTML += `
      <button class="pagination-btn" 
              onclick="animeController.changePage(${this.currentPage - 1})"
              ${this.currentPage === 1 ? "disabled" : ""}>
        ← Anterior
      </button>
    `;

    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `
        <button class="pagination-btn" onclick="animeController.changePage(1)">1</button>
        ${startPage > 2 ? '<span class="pagination-dots">...</span>' : ""}
      `;
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="pagination-btn ${
          i === this.currentPage ? "active" : ""
        }" 
                onclick="animeController.changePage(${i})">
          ${i}
        </button>
      `;
    }

    if (endPage < this.totalPages) {
      paginationHTML += `
        ${
          endPage < this.totalPages - 1
            ? '<span class="pagination-dots">...</span>'
            : ""
        }
        <button class="pagination-btn" onclick="animeController.changePage(${
          this.totalPages
        })">
          ${this.totalPages}
        </button>
      `;
    }

    paginationHTML += `
      <button class="pagination-btn" 
              onclick="animeController.changePage(${this.currentPage + 1})"
              ${this.currentPage === this.totalPages ? "disabled" : ""}>
        Siguiente →
      </button>
    `;

    paginationHTML += "</div>";
    paginationContainer.innerHTML = paginationHTML;
  }
}

const animeController = new AnimeController();
