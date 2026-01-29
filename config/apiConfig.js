// config/apiConfig.js
// Configuración de APIs de terceros para animes y videojuegos

const apiConfig = {
  // Jikan API (MyAnimeList) - API gratuita para animes
  jikan: {
    baseURL: "https://api.jikan.moe/v4",
    endpoints: {
      search: "/anime",
      details: "/anime/:id",
      top: "/top/anime",
      genres: "/genres/anime",
      recommendations: "/recommendations/anime",
    },
    rateLimit: {
      requestsPerSecond: 3, // Jikan tiene límite de 3 req/sec
      requestsPerMinute: 60,
    },
  },

  // RAWG API - API para videojuegos
  rawg: {
    baseURL: "https://api.rawg.io/api",
    apiKey: process.env.RAWG_API_KEY || "", // Obtener en https://rawg.io/apidocs
    endpoints: {
      games: "/games",
      gameDetails: "/games/:id",
      genres: "/genres",
      platforms: "/platforms",
      search: "/games?search=",
    },
    rateLimit: {
      requestsPerSecond: 5,
      requestsPerMinute: 300,
    },
  },

  // AniList API - API alternativa para animes (GraphQL)
  anilist: {
    baseURL: "https://graphql.anilist.co",
    rateLimit: {
      requestsPerMinute: 90,
    },
  },

  // IGDB API - API alternativa para videojuegos (requiere Twitch Client ID)
  igdb: {
    baseURL: "https://api.igdb.com/v4",
    clientId: process.env.IGDB_CLIENT_ID || "",
    clientSecret: process.env.IGDB_CLIENT_SECRET || "",
    endpoints: {
      games: "/games",
      search: "/search",
      genres: "/genres",
      platforms: "/platforms",
    },
  },
};

// Función helper para construir URLs
const buildURL = (api, endpoint, params = {}) => {
  let url = apiConfig[api].baseURL + apiConfig[api].endpoints[endpoint];

  // Reemplazar parámetros en la URL (:id, :slug, etc.)
  Object.keys(params).forEach((key) => {
    url = url.replace(`:${key}`, params[key]);
  });

  return url;
};

// Función para obtener headers de autenticación
const getHeaders = (api) => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (api === "rawg" && apiConfig.rawg.apiKey) {
    // RAWG usa query parameter, no header
    return headers;
  }

  if (api === "igdb" && apiConfig.igdb.clientId) {
    headers["Client-ID"] = apiConfig.igdb.clientId;
  }

  return headers;
};

module.exports = {
  apiConfig,
  buildURL,
  getHeaders,
};
