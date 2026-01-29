// js/controllers/gameController.js
// Controlador de Videojuegos - ACTUALIZADO para búsqueda con API

class GameController {
  constructor() {
    this.model = gameModel;
    this.currentFilter = "";
    this.currentPage = 1;
    this.totalPages = 10; // RAWG permite hasta ~500 páginas, limitamos a 10
  }

  async init() {
    // Esperar a que se carguen los juegos
    if (this.model.games.length === 0) {
      await this.model.loadGames();
    }

    this.renderGameGrid();
    this.setupFilters();
    this.setupPagination();

    // Mostrar fuente de datos en consola
    console.log("📊 Fuente de datos:", this.model.getDataSource());
  }

  renderGameGrid(games = null) {
    const grid = document.getElementById("gameGrid");
    if (!grid) return;

    const gamesToShow = games || this.model.getAllGames();

    if (gamesToShow.length === 0) {
      grid.innerHTML = `
        <div class="loading">
          <p>Cargando videojuegos...</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = gamesToShow
      .map((game) => {
        // Generar HTML de Metacritic si está disponible
        const metacriticHTML = game.metacritic
          ? `<span class="metacritic-score" style="background-color: ${game.metacriticColor}">
               ${game.metacritic}
             </span>`
          : '<span class="no-score">N/A</span>';

        return `
            <div class="catalog-item" onclick="gameController.showDetails(${game.id})">
                <img src="${game.image}" alt="${game.title}" class="item-poster" onerror="this.src='https://via.placeholder.com/280x200/4b09a0/FFFFFF?text=No+Image'">
                <div class="item-info">
                    <h3>${game.title}</h3>
                    <div class="item-meta">
                        ${metacriticHTML}
                        <span class="year">${game.year}</span>
                    </div>
                    <p class="genre">${game.genre}</p>
                    <button class="play-btn" onclick="event.stopPropagation(); gameController.showDetails(${game.id})">Ver detalles</button>
                </div>
            </div>
        `;
      })
      .join("");
  }

  setupFilters() {
    const genreFilter = document.getElementById("gameGenre");
    if (genreFilter) {
      genreFilter.addEventListener("change", (e) => {
        this.filterByGenre(e.target.value);
      });
    }
  }

  filterByGenre(genre) {
    this.currentFilter = genre;
    const filtered = this.model.getGamesByGenre(genre);
    this.renderGameGrid(filtered);
  }

  async search(searchTerm) {
    console.log("🔍 Buscando:", searchTerm);

    // Mostrar indicador de carga
    const grid = document.getElementById("gameGrid");
    if (grid) {
      grid.innerHTML =
        '<div class="loading"><p>Buscando videojuegos...</p></div>';
    }

    // Buscar (esto puede ser en API o local)
    let results = await this.model.searchGames(searchTerm);

    // Si hay filtro de género aplicado, filtrar resultados
    if (this.currentFilter) {
      results = results.filter((game) =>
        game.genre.toLowerCase().includes(this.currentFilter.toLowerCase())
      );
    }

    this.renderGameGrid(results);
  }

  async showDetails(id) {
    try {
      // Obtener detalles (puede venir de API si está disponible)
      const game = await this.model.getGameDetails(id);

      if (!game) {
        console.error("Videojuego no encontrado:", id);
        return;
      }

      const modal = document.getElementById("detailsModal");
      const modalBody = document.getElementById("modalBody");

      // Generar badges de plataformas usando slug de la API
      const getPlatformBadges = (platformsData) => {
        if (!platformsData || platformsData.length === 0)
          return '<span class="platform-tag">N/A</span>';

        return platformsData
          .map((p) => {
            const name = p.platform.name;
            const slug = p.platform.slug;

            // Usar slug para el icono (más específico que emojis)
            return `<span class="platform-tag" data-platform="${slug}">${name}</span>`;
          })
          .join("");
      };

      // Generar badge de Metacritic
      const metacriticBadge = game.metacritic
        ? `<span class="modal-rating" style="background-color: ${game.metacriticColor}; color: white;">Metacritic ${game.metacritic}</span>`
        : "";

      // Construir HTML de detalles (IGUAL QUE ANIMES)
      let detailsHTML = `
        <div class="modal-hero">
          <h2 id="modalTitle">${game.title}</h2>
          <div class="modal-meta">
            ${metacriticBadge}
            <span class="modal-year">${game.year}</span>
            <span class="modal-genre">${game.genre}</span>
          </div>
        </div>
        <div class="modal-details">
          <p><strong>Plataformas:</strong></p>
          <div class="platforms-grid">
            ${
              game.platformsData
                ? getPlatformBadges(game.platformsData)
                : '<span class="platform-tag">N/A</span>'
            }
          </div>
      `;

      // Agregar información adicional si está disponible
      if (game.developers && game.developers !== "Información no disponible") {
        detailsHTML += `<p><strong>Desarrolladores:</strong> ${game.developers}</p>`;
      }

      if (game.publishers && game.publishers !== "Información no disponible") {
        detailsHTML += `<p><strong>Publicadores:</strong> ${game.publishers}</p>`;
      }

      if (game.esrb && game.esrb !== "N/A") {
        detailsHTML += `<p><strong>Clasificación:</strong> ${game.esrb}</p>`;
      }

      if (game.playtime && game.playtime !== "N/A") {
        detailsHTML += `<p><strong>Tiempo promedio:</strong> ${game.playtime}</p>`;
      }

      detailsHTML += `
          <p><strong>Descripción:</strong></p>
          <p>${game.synopsis}</p>
        </div>
      `;

      // Si el usuario está logueado, agregar botones de lista
      if (userModel && userModel.isLoggedIn()) {
        const currentList = userListModel.getItemListType(game.id, "game");

        detailsHTML += `
          <div class="modal-actions">
            <h3>Agregar a mis listas:</h3>
            <div class="list-buttons">
              <button class="btn-list ${
                currentList === "favoritos" ? "active" : ""
              }" 
                      onclick="gameController.addToList(${
                        game.id
                      }, 'favoritos', ${JSON.stringify(game).replace(
          /"/g,
          "&quot;"
        )})">
                Favoritos
              </button>
              <button class="btn-list ${
                currentList === "jugando" ? "active" : ""
              }" 
                      onclick="gameController.addToList(${
                        game.id
                      }, 'jugando', ${JSON.stringify(game).replace(
          /"/g,
          "&quot;"
        )})">
                Jugando
              </button>
              <button class="btn-list ${
                currentList === "considerando" ? "active" : ""
              }" 
                      onclick="gameController.addToList(${
                        game.id
                      }, 'considerando', ${JSON.stringify(game).replace(
          /"/g,
          "&quot;"
        )})">
                Considerando
              </button>
              <button class="btn-list ${
                currentList === "completado" ? "active" : ""
              }" 
                      onclick="gameController.addToList(${
                        game.id
                      }, 'completado', ${JSON.stringify(game).replace(
          /"/g,
          "&quot;"
        )})">
                Completado
              </button>
              <button class="btn-list ${
                currentList === "dropeado" ? "active" : ""
              }" 
                      onclick="gameController.addToList(${
                        game.id
                      }, 'dropeado', ${JSON.stringify(game).replace(
          /"/g,
          "&quot;"
        )})">
                Dropeado
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

  async addToList(gameId, listType, gameData) {
    if (!userModel.isLoggedIn()) {
      authController.showMessage(
        "Debes iniciar sesión para agregar a tus listas",
        "error"
      );
      return;
    }

    const result = await userListModel.addToList(listType, gameData, "game");

    if (result.success) {
      authController.showMessage(`Agregado a ${listType}`, "success");
      // Recargar el modal para actualizar botones
      this.showDetails(gameId);
    } else {
      authController.showMessage(result.error, "error");
    }
  }

  getFeaturedGames() {
    return this.model.getAllGames().slice(0, 4);
  }

  /**
   * Configurar sistema de paginación
   */
  setupPagination() {
    // Los botones se crearán dinámicamente en el HTML
  }

  /**
   * Cambiar de página
   * @param {number} page - Número de página
   */
  async changePage(page) {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;

    // Mostrar loading
    const grid = document.getElementById("gameGrid");
    if (grid) {
      grid.innerHTML = '<div class="loading"><p>Cargando página...</p></div>';
    }

    // Cargar juegos de la página
    const games = await this.model.loadMoreGames(page);
    this.renderGameGrid(games);
    this.updatePaginationUI();

    // Scroll al inicio de la sección
    document.getElementById("games").scrollIntoView({ behavior: "smooth" });
  }

  /**
   * Actualizar UI de paginación
   */
  updatePaginationUI() {
    const paginationContainer = document.getElementById("gamePagination");
    if (!paginationContainer) return;

    let paginationHTML = '<div class="pagination">';

    // Botón anterior
    paginationHTML += `
      <button class="pagination-btn" 
              onclick="gameController.changePage(${this.currentPage - 1})"
              ${this.currentPage === 1 ? "disabled" : ""}>
        ← Anterior
      </button>
    `;

    // Números de página
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `
        <button class="pagination-btn" onclick="gameController.changePage(1)">1</button>
        ${startPage > 2 ? '<span class="pagination-dots">...</span>' : ""}
      `;
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="pagination-btn ${
          i === this.currentPage ? "active" : ""
        }" 
                onclick="gameController.changePage(${i})">
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
        <button class="pagination-btn" onclick="gameController.changePage(${
          this.totalPages
        })">
          ${this.totalPages}
        </button>
      `;
    }

    // Botón siguiente
    paginationHTML += `
      <button class="pagination-btn" 
              onclick="gameController.changePage(${this.currentPage + 1})"
              ${this.currentPage === this.totalPages ? "disabled" : ""}>
        Siguiente →
      </button>
    `;

    paginationHTML += "</div>";
    paginationContainer.innerHTML = paginationHTML;
  }
}

const gameController = new GameController();
