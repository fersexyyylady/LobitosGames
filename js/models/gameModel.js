// js/models/gameModel.js
// Modelo de Videojuegos - ACTUALIZADO para usar RAWG API

class GameModel {
  constructor() {
    this.games = [];
    this.usingAPI = true; // Flag para saber si estamos usando API o datos locales
    this.loadGames();
  }

  /**
   * Cargar videojuegos desde la API o fallback local
   */
  async loadGames() {
    try {
      console.log("🔄 Cargando videojuegos desde RAWG API...");

      // Intentar cargar desde la API
      this.games = await apiService.getTopGames(1);

      if (this.games && this.games.length > 0) {
        console.log("✅ Videojuegos cargados desde API:", this.games.length);
        this.usingAPI = true;
      } else {
        throw new Error("No se obtuvieron juegos de la API");
      }
    } catch (error) {
      console.warn("⚠️ Error cargando desde API, usando datos locales:", error);

      // Fallback a datos locales
      try {
        const response = await fetch("data/games.json");
        this.games = await response.json();
        this.usingAPI = false;
        console.log(
          "✅ Videojuegos cargados desde JSON local:",
          this.games.length
        );
      } catch (localError) {
        console.error("❌ Error cargando datos locales:", localError);
        this.games = this.getFallbackData();
        this.usingAPI = false;
        console.log("✅ Usando datos de fallback hardcodeados");
      }
    }
  }

  /**
   * Recargar videojuegos desde la API
   */
  async reloadFromAPI() {
    console.log("🔄 Recargando desde API...");
    await this.loadGames();
    return this.games;
  }

  /**
   * Cargar más videojuegos (paginación)
   * @param {number} page - Número de página
   */
  async loadMoreGames(page = 1) {
    if (!this.usingAPI) {
      console.log("📝 No se puede cargar más, usando datos locales");
      return this.games;
    }

    try {
      console.log(`🔄 Cargando página ${page} de videojuegos...`);
      const newGames = await apiService.getTopGames(page);

      if (newGames && newGames.length > 0) {
        // REEMPLAZAR los juegos con la nueva página
        this.games = newGames;
        console.log(
          `✅ Cargados ${newGames.length} videojuegos (página ${page})`
        );
      }

      return this.games;
    } catch (error) {
      console.error("❌ Error cargando más videojuegos:", error);
      return this.games;
    }
  }

  /**
   * Buscar videojuegos por término
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Array} - Videojuegos encontrados
   */
  async searchGames(searchTerm) {
    if (!searchTerm || searchTerm.trim() === "") {
      return this.games;
    }

    // Si estamos usando API, buscar en la API
    if (this.usingAPI) {
      try {
        console.log(`🔍 Buscando "${searchTerm}" en RAWG API...`);
        const results = await apiService.searchGames(searchTerm, 20);
        console.log(`✅ Encontrados ${results.length} resultados`);
        return results;
      } catch (error) {
        console.error("❌ Error en búsqueda API:", error);
        // Fallback a búsqueda local
      }
    }

    // Búsqueda local
    const term = searchTerm.toLowerCase();
    return this.games.filter(
      (game) =>
        game.title.toLowerCase().includes(term) ||
        game.genre.toLowerCase().includes(term) ||
        game.platform.toLowerCase().includes(term)
    );
  }

  /**
   * Obtener todos los videojuegos
   * @returns {Array}
   */
  getAllGames() {
    return this.games;
  }

  /**
   * Obtener videojuego por ID
   * @param {number} id - ID del videojuego
   * @returns {Object|null}
   */
  getGameById(id) {
    return this.games.find((game) => game.id === parseInt(id));
  }

  /**
   * Obtener detalles completos de un videojuego desde la API
   * @param {number} id - ID del videojuego
   * @returns {Promise<Object>}
   */
  async getGameDetails(id) {
    if (this.usingAPI) {
      try {
        console.log(`🔍 Obteniendo detalles del juego ${id} desde API...`);
        const details = await apiService.getGameDetails(id);
        if (details) {
          console.log("✅ Detalles obtenidos desde API");
          return details;
        }
      } catch (error) {
        console.error("❌ Error obteniendo detalles:", error);
      }
    }

    // Fallback a datos locales
    return this.getGameById(id);
  }

  /**
   * Filtrar videojuegos por género
   * @param {string} genre - Género a filtrar
   * @returns {Array}
   */
  getGamesByGenre(genre) {
    if (!genre) return this.games;

    return this.games.filter((game) =>
      game.genre.toLowerCase().includes(genre.toLowerCase())
    );
  }

  /**
   * Datos de fallback (solo si todo falla)
   * @returns {Array}
   */
  getFallbackData() {
    return [
      {
        id: 1,
        title: "The Witcher 3: Wild Hunt",
        year: "2015",
        platform: "PC, PlayStation, Xbox, Nintendo Switch",
        genre: "RPG, Aventura",
        rating: "9.3",
        synopsis:
          "Geralt de Rivia busca a su hija adoptiva Ciri mientras navega por un mundo de fantasía lleno de monstruos, intrigas políticas y decisiones morales complejas.",
        image:
          "https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg",
      },
      {
        id: 2,
        title: "Ghost of Tsushima",
        year: "2020",
        platform: "PlayStation 4, PlayStation 5",
        genre: "Acción, Aventura",
        rating: "8.7",
        synopsis:
          "Jin Sakai debe abandonar las tradiciones samurái y forjar un nuevo camino como El Fantasma para defender la isla de Tsushima de la invasión mongol.",
        image: "https://media.rawg.io/media/games/Ghost-of-Tsushima.jpg",
      },
      {
        id: 3,
        title: "Elden Ring",
        year: "2022",
        platform: "PC, PlayStation, Xbox",
        genre: "RPG, Acción",
        rating: "9.1",
        synopsis:
          "Aventúrate en las Tierras Intermedias, un mundo de fantasía oscura creado por Hidetaka Miyazaki y George R.R. Martin.",
        image:
          "https://media.rawg.io/media/games/b29/b294fdd866dcdb643e7bab370a552855.jpg",
      },
      {
        id: 4,
        title: "Red Dead Redemption 2",
        year: "2018",
        platform: "PC, PlayStation, Xbox",
        genre: "Acción, Aventura",
        rating: "9.7",
        synopsis:
          "Arthur Morgan y la banda de Dutch van der Linde luchan por sobrevivir en el salvaje oeste americano mientras son perseguidos por cazarrecompensas.",
        image:
          "https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg",
      },
    ];
  }

  /**
   * Verificar si está usando API o datos locales
   * @returns {boolean}
   */
  isUsingAPI() {
    return this.usingAPI;
  }

  /**
   * Obtener estado de la fuente de datos
   * @returns {string}
   */
  getDataSource() {
    return this.usingAPI ? "RAWG API" : "Datos locales";
  }
}

// Crear instancia global
const gameModel = new GameModel();
