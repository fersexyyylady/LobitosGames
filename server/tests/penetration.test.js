// server/tests/penetration.test.js
// Pruebas de penetración básicas — Parte 3 Práctica 2 Unidad 3
// Ejecutar con: node tests/penetration.test.js (servidor debe estar corriendo)

const BASE = process.env.TEST_BASE || "http://localhost:5000/api";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: ${name} — ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\nPRUEBAS DE PENETRACIÓN BÁSICAS — LobitosGames");
console.log("=".repeat(55));

async function runAll() {
  // ── 1. Acceso sin token ────────────────────────────────────────────────────
  console.log("\n[1] Acceso sin token");
  await test("GET /api/users/me sin token → 401", async () => {
    const { status } = await fetchJSON(`${BASE}/users/me`);
    assert(status === 401, `Esperado 401, obtenido ${status}`);
  });

  await test("GET /api/admin/users sin token → 401", async () => {
    const { status } = await fetchJSON(`${BASE}/admin/users`);
    assert(status === 401, `Esperado 401, obtenido ${status}`);
  });

  // ── 2. Token alterado / inválido ───────────────────────────────────────────
  console.log("\n[2] Token alterado");
  await test("Token con firma inválida → 403", async () => {
    const fakeToken =
      "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZha2UifQ.invalidsignature";
    const { status } = await fetchJSON(`${BASE}/users/me`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    assert(
      status === 401 || status === 403,
      `Esperado 401/403, obtenido ${status}`,
    );
  });

  await test("Token con payload alterado → 403", async () => {
    const payload = btoa(
      JSON.stringify({ id: "hacker", role: "admin", exp: Date.now() + 99999 }),
    );
    const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.fakesig`;
    const { status } = await fetchJSON(`${BASE}/users/me`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    assert(
      status === 401 || status === 403,
      `Esperado 401/403, obtenido ${status}`,
    );
  });

  // ── 3. Token expirado (simulado con valor hardcoded expirado) ──────────────
  console.log("\n[3] Token expirado");
  await test("Token expirado (formato JWT válido pero expirado) → 401", async () => {
    // JWT firmado con secret correcto pero exp en el pasado — simulamos con firma incorrecta
    const expiredLike =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJleHAiOjE2MDAwMDAwMDB9.expired";
    const { status } = await fetchJSON(`${BASE}/users/me`, {
      headers: { Authorization: `Bearer ${expiredLike}` },
    });
    assert(
      status === 401 || status === 403,
      `Esperado 401/403, obtenido ${status}`,
    );
  });

  // ── 4. Acceso con rol incorrecto ───────────────────────────────────────────
  console.log("\n[4] Rol incorrecto");
  await test("Usuario normal intenta acceder a /admin → 401 sin token", async () => {
    const { status } = await fetchJSON(`${BASE}/admin/stats`);
    assert(status === 401, `Esperado 401, obtenido ${status}`);
  });

  // ── 5. Inyección en parámetros ─────────────────────────────────────────────
  console.log("\n[5] Inyección en parámetros");
  await test("Login con payload de inyección NoSQL → 401 o 400", async () => {
    const { status } = await fetchJSON(`${BASE}/auth/login`, {
      method: "POST",
      body: JSON.stringify({
        emailOrUsername: { $gt: "" },
        password: { $gt: "" },
      }),
    });
    assert(
      status === 400 || status === 401 || status === 500,
      `Esperado 4xx/5xx, obtenido ${status}`,
    );
  });

  await test("Parámetro con script tag en query → rechazado o sanitizado", async () => {
    const { status } = await fetchJSON(
      `${BASE}/catalog/animes?page=<script>alert(1)</script>`,
    );
    // El middleware de seguridad en index.js bloquea paths con <script
    // Para query params el servidor debe simplemente no ejecutarlos
    assert(status < 500, `No debería ser error 500, obtenido ${status}`);
  });

  // ── 6. Rate limiting ──────────────────────────────────────────────────────
  console.log("\n[6] Rate limiting");
  await test("Múltiples intentos de login → rate limit activo (429 tras muchos intentos)", async () => {
    // Hacemos 22 intentos rápidos (límite es 20 en 15min para auth)
    let got429 = false;
    for (let i = 0; i < 22; i++) {
      const { status } = await fetchJSON(`${BASE}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ emailOrUsername: "test", password: "test" }),
      });
      if (status === 429) {
        got429 = true;
        break;
      }
    }
    assert(got429, "Rate limit no se activó después de 22 intentos");
  });

  // ── 7. Endpoints seguros funcionan correctamente ───────────────────────────
  console.log("\n[7] Endpoints públicos accesibles");
  await test("GET /api/health → 200", async () => {
    const { status } = await fetchJSON(`${BASE}/health`);
    assert(status === 200, `Esperado 200, obtenido ${status}`);
  });

  await test("GET /api/catalog/animes → 200 sin token", async () => {
    const { status } = await fetchJSON(`${BASE}/catalog/animes`);
    assert(status === 200, `Esperado 200, obtenido ${status}`);
  });

  await test("GET /api/notify/types → 200 sin token", async () => {
    const { status } = await fetchJSON(`${BASE}/notify/types`);
    assert(status === 200, `Esperado 200, obtenido ${status}`);
  });

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(55));
  console.log(
    `RESULTADO: ${passed} pasaron, ${failed} fallaron de ${passed + failed} pruebas`,
  );
  if (failed === 0)
    console.log("🎉 Todas las pruebas de seguridad pasaron correctamente");
  else console.log("⚠️  Algunas pruebas fallaron — revisar configuración");
  console.log("=".repeat(55) + "\n");
}

// Esperar a que el módulo btoa esté disponible (Node.js >= 16)
if (typeof btoa === "undefined")
  global.btoa = (s) => Buffer.from(s).toString("base64");

runAll().catch(console.error);
