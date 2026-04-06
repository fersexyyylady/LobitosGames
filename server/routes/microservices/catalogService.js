// server/routes/microservices/catalogService.js
// Microservicio 1: Gestión del catálogo de animes y videojuegos
// Patrón: Repository + Singleton cache

const router = require("express").Router();
const {
  authenticate,
  requirePermission,
} = require("../../middleware/authMiddleware");

// ── Singleton: cache en memoria ───────────────────────────────────────────────
class CatalogCache {
  constructor() {
    if (CatalogCache._instance) return CatalogCache._instance;
    this.store = new Map();
    this.ttl = 10 * 60 * 1000; // 10 minutos
    CatalogCache._instance = this;
  }

  set(key, value) {
    this.store.set(key, { value, expires: Date.now() + this.ttl });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  clear() {
    this.store.clear();
  }
  size() {
    return this.store.size;
  }
}

const cache = new CatalogCache();

// ── Repository pattern: acceso a datos del catálogo ──────────────────────────
const CatalogRepository = {
  async getTopAnimes(page = 1) {
    const key = `top_animes_p${page}`;
    const cached = cache.get(key);
    if (cached) return { data: cached, source: "cache" };

    const res = await fetch(
      `https://api.jikan.moe/v4/top/anime?page=${page}&limit=10`,
    );
    if (!res.ok) throw new Error("Jikan API error");
    const json = await res.json();
    const data = (json.data || []).map((a) => ({
      id: a.mal_id,
      title: a.title,
      year: a.year,
      rating: a.score,
      image: a.images?.jpg?.image_url,
      genres: a.genres?.map((g) => g.name).join(", "),
      episodes: a.episodes,
      status: a.status,
    }));
    cache.set(key, data);
    return { data, source: "api" };
  },

  async getTopGames(page = 1) {
    const key = `top_games_p${page}`;
    const cached = cache.get(key);
    if (cached) return { data: cached, source: "cache" };

    const apiKey =
      process.env.RAWG_API_KEY || "9127fc9008cb4f9898d42b7da484b496";
    const res = await fetch(
      `https://api.rawg.io/api/games?ordering=-metacritic&page=${page}&page_size=10&key=${apiKey}`,
    );
    if (!res.ok) throw new Error("RAWG API error");
    const json = await res.json();
    const data = (json.results || []).map((g) => ({
      id: g.id,
      title: g.name,
      year: g.released?.slice(0, 4),
      rating: g.rating,
      metacritic: g.metacritic,
      image: g.background_image,
      platforms: g.platforms?.map((p) => p.platform.name).join(", "),
      genres: g.genres?.map((g) => g.name).join(", "),
    }));
    cache.set(key, data);
    return { data, source: "api" };
  },
};

// ── Rutas del microservicio ───────────────────────────────────────────────────
// GET /api/catalog/animes — público
router.get("/animes", async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = await CatalogRepository.getTopAnimes(Number(page));
    res.json({ success: true, ...result, page: Number(page) });
  } catch (err) {
    res
      .status(502)
      .json({
        error: "Error al obtener catálogo de animes.",
        detail: err.message,
      });
  }
});

// GET /api/catalog/games — público
router.get("/games", async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = await CatalogRepository.getTopGames(Number(page));
    res.json({ success: true, ...result, page: Number(page) });
  } catch (err) {
    res
      .status(502)
      .json({
        error: "Error al obtener catálogo de juegos.",
        detail: err.message,
      });
  }
});

// GET /api/catalog/cache/stats — solo admin
router.get(
  "/cache/stats",
  authenticate,
  requirePermission("analytics", "read"),
  (req, res) => {
    res.json({ cacheEntries: cache.size(), ttlMs: cache.ttl });
  },
);

// DELETE /api/catalog/cache — limpiar caché (admin)
router.delete(
  "/cache",
  authenticate,
  requirePermission("catalog", "delete"),
  (req, res) => {
    cache.clear();
    res.json({ success: true, message: "Caché limpiado." });
  },
);

module.exports = router;
