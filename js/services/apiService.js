// js/services/apiService.js
// Servicio para consumir APIs de terceros (Jikan para animes, RAWG para videojuegos)

class APIService {
  constructor() {
    // URLs base de las APIs
    this.jikanBaseURL = "https://api.jikan.moe/v4";
    this.rawgBaseURL = "https://api.rawg.io/api";

    // RAWG API Key - CONFIGURADA
    this.rawgApiKey = "9127fc9008cb4f9898d42b7da484b496";

    // Cache para reducir llamadas a las APIs
    this.cache = {
      animes: new Map(),
      games: new Map(),
    };

    // Control de rate limiting
    this.lastRequest = {
      jikan: 0,
      rawg: 0,
    };
    this.minInterval = {
      jikan: 350, // Jikan permite ~3 req/sec, usamos 350ms
      rawg: 200, // Con key, RAWG es más permisivo
    };

    console.log("🔧 API Service inicializado");
    console.log(
      "🔑 RAWG API Key:",
      this.rawgApiKey ? "Configurada ✅" : "No configurada ⚠️",
    );
  }

  // ==================== MÉTODOS PARA ANIMES (JIKAN API) ====================

  /**
   * Buscar animes por término
   * @param {string} query - Término de búsqueda
   * @param {number} limit - Número de resultados (default: 20)
   * @returns {Promise<Array>} - Lista de animes
   */
  async searchAnimes(query, limit = 20) {
    try {
      await this.waitForRateLimit("jikan");

      const url = `${this.jikanBaseURL}/anime?q=${encodeURIComponent(
        query,
      )}&limit=${limit}&sfw=true`;

      console.log("🔍 Buscando animes en:", url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data = await response.json();
      return this.formatAnimes(data.data || []);
    } catch (error) {
      console.error("❌ Error buscando animes:", error);
      return [];
    }
  }

  /**
   * Obtener los animes más populares
   * @param {number} page - Página (default: 1)
   * @returns {Promise<Array>}
   */
  async getTopAnimes(page = 1) {
    try {
      const cacheKey = `top_page_${page}`;

      if (this.cache.animes.has(cacheKey)) {
        console.log("📦 Usando cache para animes página", page);
        return this.cache.animes.get(cacheKey);
      }

      await this.waitForRateLimit("jikan");

      const url = `${this.jikanBaseURL}/top/anime?page=${page}&limit=25`;
      console.log("🔄 Cargando animes desde:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data = await response.json();
      const animes = this.formatAnimes(data.data || []);

      // Guardar en cache por 1 hora
      this.cache.animes.set(cacheKey, animes);
      setTimeout(() => this.cache.animes.delete(cacheKey), 3600000);

      console.log("✅ Animes cargados desde API:", animes.length);
      return animes;
    } catch (error) {
      console.error("❌ Error obteniendo top animes:", error);
      return [];
    }
  }

  /**
   * Obtener detalles de un anime específico
   * @param {number} id - ID del anime en MyAnimeList
   * @returns {Promise<Object>}
   */
  async getAnimeDetails(id) {
    try {
      const cacheKey = `anime_${id}`;

      if (this.cache.animes.has(cacheKey)) {
        return this.cache.animes.get(cacheKey);
      }

      await this.waitForRateLimit("jikan");

      const url = `${this.jikanBaseURL}/anime/${id}/full`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data = await response.json();
      const anime = this.formatAnime(data.data);

      this.cache.animes.set(cacheKey, anime);
      setTimeout(() => this.cache.animes.delete(cacheKey), 3600000);

      return anime;
    } catch (error) {
      console.error("❌ Error obteniendo detalles del anime:", error);
      return null;
    }
  }

  /**
   * Obtener animes por género
   * @param {number} genreId - ID del género
   * @returns {Promise<Array>}
   */
  async getAnimesByGenre(genreId) {
    try {
      await this.waitForRateLimit("jikan");

      const url = `${this.jikanBaseURL}/anime?genres=${genreId}&limit=20`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data = await response.json();
      return this.formatAnimes(data.data || []);
    } catch (error) {
      console.error("❌ Error obteniendo animes por género:", error);
      return [];
    }
  }

  // ==================== MÉTODOS PARA VIDEOJUEGOS (RAWG API) ====================

  /**
   * Buscar videojuegos por término
   * @param {string} query - Término de búsqueda
   * @param {number} pageSize - Número de resultados
   * @returns {Promise<Array>}
   */
  async searchGames(query, pageSize = 20) {
    try {
      await this.waitForRateLimit("rawg");

      const params = new URLSearchParams({
        search: query,
        page_size: pageSize,
        exclude_additions: true,
        key: this.rawgApiKey,
      });

      const url = `${this.rawgBaseURL}/games?${params.toString()}`;
      console.log(
        "🔍 Buscando juegos en:",
        url.replace(this.rawgApiKey, "API_KEY"),
      );

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          "❌ Error en RAWG API:",
          response.status,
          response.statusText,
        );
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Juegos encontrados:", data.results?.length || 0);
      return this.formatGames(data.results || []);
    } catch (error) {
      console.error("❌ Error buscando videojuegos:", error);
      return [];
    }
  }

  /**
   * Obtener videojuegos populares
   * @param {number} page - Página
   * @returns {Promise<Array>}
   */
  async getTopGames(page = 1) {
    try {
      const cacheKey = `games_top_page_${page}`;

      if (this.cache.games.has(cacheKey)) {
        console.log("📦 Usando cache para juegos página", page);
        return this.cache.games.get(cacheKey);
      }

      await this.waitForRateLimit("rawg");

      const params = new URLSearchParams({
        ordering: "-metacritic",
        metacritic: "50,100",
        page: page,
        page_size: 25,
        exclude_additions: true,
        key: this.rawgApiKey,
      });

      const url = `${this.rawgBaseURL}/games?${params.toString()}`;
      console.log("🔄 Cargando juegos desde RAWG API (página " + page + ")");

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          "❌ Error en RAWG API:",
          response.status,
          response.statusText,
        );
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data = await response.json();
      const games = this.formatGames(data.results || []);

      if (games.length === 0) {
        console.warn("⚠️ No se obtuvieron juegos de la API");
        return [];
      }

      this.cache.games.set(cacheKey, games);
      setTimeout(() => this.cache.games.delete(cacheKey), 3600000);

      console.log("✅ Juegos cargados desde API:", games.length);
      return games;
    } catch (error) {
      console.error("❌ Error obteniendo top videojuegos:", error);
      return [];
    }
  }

  /**
   * Obtener detalles de un videojuego
   * @param {number} id - ID del juego en RAWG
   * @returns {Promise<Object>}
   */
  async getGameDetails(id) {
    try {
      const cacheKey = `game_${id}`;

      if (this.cache.games.has(cacheKey)) {
        return this.cache.games.get(cacheKey);
      }

      await this.waitForRateLimit("rawg");

      const url = `${this.rawgBaseURL}/games/${id}?key=${this.rawgApiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status}`);
      }

      const data = await response.json();
      const game = this.formatGame(data);

      this.cache.games.set(cacheKey, game);
      setTimeout(() => this.cache.games.delete(cacheKey), 3600000);

      return game;
    } catch (error) {
      console.error("❌ Error obteniendo detalles del juego:", error);
      return null;
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Formatear lista de animes al formato interno
   * @param {Array} animes - Animes de Jikan
   * @returns {Array}
   */
  formatAnimes(animes) {
    return animes.map((anime) => this.formatAnime(anime));
  }

  /**
   * Formatear un anime al formato interno
   * @param {Object} anime - Anime de Jikan
   * @returns {Object}
   */
  formatAnime(anime) {
    return {
      id: anime.mal_id,
      title: anime.title || anime.title_english || "Sin título",
      year:
        anime.year ||
        (anime.aired ? new Date(anime.aired.from).getFullYear() : "N/A"),
      episodes: anime.episodes ? `${anime.episodes} episodios` : "Desconocido",
      genre: anime.genres ? anime.genres.map((g) => g.name).join(", ") : "N/A",
      rating: anime.score ? anime.score.toFixed(1) : "N/A",
      synopsis: anime.synopsis || "Sin sinopsis disponible",
      image:
        anime.images?.jpg?.large_image_url ||
        anime.images?.jpg?.image_url ||
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='200'%3E%3Crect fill='%236809e5' width='280' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20'%3ENo Image%3C/text%3E%3C/svg%3E",
      status: anime.status || "Desconocido",
      studios: anime.studios
        ? anime.studios.map((s) => s.name).join(", ")
        : "N/A",
      source: anime.source || "N/A",
    };
  }

  /**
   * Formatear lista de videojuegos al formato interno
   * @param {Array} games - Juegos de RAWG
   * @returns {Array}
   */
  formatGames(games) {
    return games.map((game) => this.formatGame(game));
  }

  /**
   * Formatear un videojuego al formato interno
   * @param {Object} game - Juego de RAWG
   * @returns {Object}
   */
  formatGame(game) {
    // Limpiar HTML de la descripción
    const cleanSynopsis = (html) => {
      if (!html) return "Sin descripción disponible";
      const temp = document.createElement("div");
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || "Sin descripción disponible";
    };

    return {
      id: game.id,
      title: game.name || "Sin título",
      year: game.released ? new Date(game.released).getFullYear() : "N/A",
      platform: game.platforms
        ? game.platforms.map((p) => p.platform.name).join(", ")
        : "N/A",
      platformsData: game.platforms || [],
      genre: game.genres ? game.genres.map((g) => g.name).join(", ") : "N/A",
      rating: game.rating ? game.rating.toFixed(1) : "N/A",
      synopsis: cleanSynopsis(game.description_raw || game.description),
      image:
        game.background_image ||
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='200'%3E%3Crect fill='%234b09a0' width='280' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20'%3ENo Image%3C/text%3E%3C/svg%3E",
      metacritic: game.metacritic || null,
      metacriticColor: this.getMetacriticColor(game.metacritic),
      developers: game.developers
        ? game.developers.map((d) => d.name).join(", ")
        : "Información no disponible",
      publishers: game.publishers
        ? game.publishers.map((p) => p.name).join(", ")
        : "Información no disponible",
      esrb: game.esrb_rating ? game.esrb_rating.name : "N/A",
      playtime: game.playtime ? `${game.playtime} horas` : "N/A",
    };
  }

  /**
   * Obtener color según score de Metacritic
   * @param {number} score - Score de Metacritic
   * @returns {string} - Color hexadecimal
   */
  getMetacriticColor(score) {
    if (!score) return "#666666";
    if (score >= 75) return "#66cc33"; // Verde
    if (score >= 50) return "#ffcc33"; // Amarillo
    return "#ff0000"; // Rojo
  }

  /**
   * Esperar para respetar el rate limiting
   * @param {string} api - 'jikan' o 'rawg'
   */
  async waitForRateLimit(api) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest[api];
    const minInterval = this.minInterval[api];

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequest[api] = Date.now();
  }

  /**
   * Configurar la API key de RAWG
   * @param {string} key - API key
   */
  setRAWGKey(key) {
    this.rawgApiKey = key;
    console.log("🔑 RAWG API Key actualizada");
  }

  /**
   * Limpiar el cache
   */
  clearCache() {
    this.cache.animes.clear();
    this.cache.games.clear();
    console.log("🗑️ Cache limpiado");
  }
}

// Crear instancia global
const apiService = new APIService();
