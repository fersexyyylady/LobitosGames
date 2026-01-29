// js/models/animeModel.js
// Modelo de Animes - ACTUALIZADO para usar Jikan API

class AnimeModel {
  constructor() {
    this.animes = [];
    this.usingAPI = true; // Flag para saber si estamos usando API o datos locales
    this.loadAnimes();
  }

  /**
   * Cargar animes desde la API o fallback local
   */
  async loadAnimes() {
    try {
      console.log("🔄 Cargando animes desde Jikan API...");

      // Intentar cargar desde la API
      this.animes = await apiService.getTopAnimes(1);

      if (this.animes && this.animes.length > 0) {
        console.log("✅ Animes cargados desde API:", this.animes.length);
        this.usingAPI = true;
      } else {
        throw new Error("No se obtuvieron animes de la API");
      }
    } catch (error) {
      console.warn("⚠️ Error cargando desde API, usando datos locales:", error);

      // Fallback a datos locales
      try {
        const response = await fetch("data/animes.json");
        this.animes = await response.json();
        this.usingAPI = false;
        console.log("✅ Animes cargados desde JSON local:", this.animes.length);
      } catch (localError) {
        console.error("❌ Error cargando datos locales:", localError);
        this.animes = this.getFallbackData();
        this.usingAPI = false;
        console.log("✅ Usando datos de fallback hardcodeados");
      }
    }
  }

  /**
   * Recargar animes desde la API
   */
  async reloadFromAPI() {
    console.log("🔄 Recargando desde API...");
    await this.loadAnimes();
    return this.animes;
  }

  /**
   * Cargar más animes (paginación)
   * @param {number} page - Número de página
   */
  async loadMoreAnimes(page = 1) {
    if (!this.usingAPI) {
      console.log("📝 No se puede cargar más, usando datos locales");
      return this.animes;
    }

    try {
      console.log(`🔄 Cargando página ${page} de animes...`);
      const newAnimes = await apiService.getTopAnimes(page);

      if (newAnimes && newAnimes.length > 0) {
        // REEMPLAZAR los animes con la nueva página
        this.animes = newAnimes;
        console.log(`✅ Cargados ${newAnimes.length} animes (página ${page})`);
      }

      return this.animes;
    } catch (error) {
      console.error("❌ Error cargando más animes:", error);
      return this.animes;
    }
  }

  /**
   * Buscar animes por término
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Array} - Animes encontrados
   */
  async searchAnimes(searchTerm) {
    if (!searchTerm || searchTerm.trim() === "") {
      return this.animes;
    }

    // Si estamos usando API, buscar en la API
    if (this.usingAPI) {
      try {
        console.log(`🔍 Buscando "${searchTerm}" en Jikan API...`);
        const results = await apiService.searchAnimes(searchTerm, 20);
        console.log(`✅ Encontrados ${results.length} resultados`);
        return results;
      } catch (error) {
        console.error("❌ Error en búsqueda API:", error);
        // Fallback a búsqueda local
      }
    }

    // Búsqueda local
    const term = searchTerm.toLowerCase();
    return this.animes.filter(
      (anime) =>
        anime.title.toLowerCase().includes(term) ||
        anime.genre.toLowerCase().includes(term)
    );
  }

  /**
   * Obtener todos los animes
   * @returns {Array}
   */
  getAllAnimes() {
    return this.animes;
  }

  /**
   * Obtener anime por ID
   * @param {number} id - ID del anime
   * @returns {Object|null}
   */
  getAnimeById(id) {
    return this.animes.find((anime) => anime.id === parseInt(id));
  }

  /**
   * Obtener detalles completos de un anime desde la API
   * @param {number} id - ID del anime
   * @returns {Promise<Object>}
   */
  async getAnimeDetails(id) {
    if (this.usingAPI) {
      try {
        console.log(`🔍 Obteniendo detalles del anime ${id} desde API...`);
        const details = await apiService.getAnimeDetails(id);
        if (details) {
          console.log("✅ Detalles obtenidos desde API");
          return details;
        }
      } catch (error) {
        console.error("❌ Error obteniendo detalles:", error);
      }
    }

    // Fallback a datos locales
    return this.getAnimeById(id);
  }

  /**
   * Filtrar animes por género
   * @param {string} genre - Género a filtrar
   * @returns {Array}
   */
  getAnimesByGenre(genre) {
    if (!genre) return this.animes;

    return this.animes.filter((anime) =>
      anime.genre.toLowerCase().includes(genre.toLowerCase())
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
        title: "Attack on Titan",
        year: "2013",
        episodes: "87 episodios",
        genre: "Acción, Drama",
        rating: "9.0",
        synopsis:
          "La humanidad se encuentra al borde de la extinción debido a unos gigantes humanoides llamados titanes. Eren Yeager se une al Cuerpo de Exploración para luchar contra estos monstruos.",
        image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg",
      },
      {
        id: 2,
        title: "One Piece",
        year: "1999",
        episodes: "1000+ episodios",
        genre: "Aventura, Acción",
        rating: "8.8",
        synopsis:
          "Monkey D. Luffy explora el Grand Line con su tripulación de piratas en busca del tesoro más grande del mundo conocido como One Piece.",
        image: "https://cdn.myanimelist.net/images/anime/6/73245.jpg",
      },
      {
        id: 3,
        title: "Demon Slayer",
        year: "2019",
        episodes: "44 episodios",
        genre: "Acción, Fantasía",
        rating: "8.7",
        synopsis:
          "Tanjiro Kamado busca una cura para su hermana convertida en demonio y busca venganza contra el demonio que mató al resto de su familia.",
        image: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
      },
      {
        id: 4,
        title: "Death Note",
        year: "2006",
        episodes: "37 episodios",
        genre: "Drama, Thriller",
        rating: "9.0",
        synopsis:
          "Light Yagami encuentra un cuaderno sobrenatural que le permite matar a cualquier persona escribiendo su nombre. Decide usarlo para crear un mundo sin crimen.",
        image: "https://cdn.myanimelist.net/images/anime/9/9453.jpg",
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
    return this.usingAPI ? "Jikan API (MyAnimeList)" : "Datos locales";
  }
}

// Crear instancia global
const animeModel = new AnimeModel();
