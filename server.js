const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "database.json");
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_DATA_KEY = SUPABASE_SECRET_KEY || SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_AUTH_ADMIN_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SECRET_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_DATA_KEY);
const SUPABASE_AUTH_KEY = SUPABASE_PUBLISHABLE_KEY || SUPABASE_DATA_KEY;
const USE_SUPABASE_AUTH = Boolean(USE_SUPABASE && SUPABASE_AUTH_KEY);
const SUPABASE_AUTH_EMAIL_DOMAIN =
  process.env.SUPABASE_AUTH_EMAIL_DOMAIN || "jurados.example.com";
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "";
const SESSION_COOKIE_NAME = "sid";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_REFRESH_WINDOW_SECONDS = 60 * 5;
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true" || PUBLIC_URL.startsWith("https://");

const WEIGHTS = {
  interview: 0.3,
  gala: 0.25,
  swimsuit: 0.2,
  speech: 0.05,
  finalQuestion: 0.05,
  behavior: 0.15,
};

const CRITERIA = [
  { key: "interview", label: "Entrevista", weight: WEIGHTS.interview, stage: "preliminar" },
  { key: "gala", label: "Gala", weight: WEIGHTS.gala, stage: "preliminar" },
  { key: "swimsuit", label: "Traje de baño", weight: WEIGHTS.swimsuit, stage: "preliminar" },
  { key: "speech", label: "Speech Top 10", weight: WEIGHTS.speech, stage: "top10" },
  { key: "finalQuestion", label: "Pregunta final Top 5", weight: WEIGHTS.finalQuestion, stage: "top5" },
];

const DEFAULT_CREDENTIALS = {
  admin: "admin2026",
  sistema: "sistema2026",
  jurado1: "jurado1",
  jurado2: "jurado2",
  jurado3: "jurado3",
  jurado4: "jurado4",
  jurado5: "jurado5",
  jurado6: "jurado6",
};

const sessions = new Map();
const sessionSecret = process.env.APP_SECRET || crypto.randomBytes(32).toString("hex");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function usernameToAuthEmail(username) {
  const safeUsername = String(username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._+-]/g, "-");
  return `${safeUsername}@${SUPABASE_AUTH_EMAIL_DOMAIN}`;
}

function makeUser(id, username, name, role, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id,
    username,
    email: usernameToAuthEmail(username),
    authUserId: null,
    name,
    role,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
}

function defaultDatabase() {
  const users = [
    makeUser("admin", "admin", "Organización", "admin", DEFAULT_CREDENTIALS.admin),
    makeUser(
      "sistema",
      "sistema",
      "Administrador del sistema",
      "system_admin",
      DEFAULT_CREDENTIALS.sistema,
    ),
  ];

  for (let index = 1; index <= 6; index += 1) {
    users.push(
      makeUser(
        `jurado${index}`,
        `jurado${index}`,
        `Jurado ${index}`,
        "juror",
        DEFAULT_CREDENTIALS[`jurado${index}`],
      ),
    );
  }

  const candidates = [];
  for (let index = 1; index <= 20; index += 1) {
    candidates.push({
      id: `candidata-${index}`,
      order: index,
      name: `Candidata ${index}`,
      behaviorScore: null,
      isTop10: false,
      isTop5: false,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    users,
    candidates,
    evaluations: [],
    audit: [],
  };
}

function ensureDefaultAppUsers(db) {
  let changed = false;
  if (!db.users.some((user) => user.id === "sistema" || user.username === "sistema")) {
    db.users.push(
      makeUser(
        "sistema",
        "sistema",
        "Administrador del sistema",
        "system_admin",
        DEFAULT_CREDENTIALS.sistema,
      ),
    );
    changed = true;
  }
  return changed;
}

function isSupabasePlatformApiKey(key) {
  return /^sb_(publishable|secret)_/i.test(String(key || ""));
}

function withSupabaseApiKey(headers, key) {
  const nextHeaders = {
    ...headers,
    apikey: key,
  };
  if (key && !isSupabasePlatformApiKey(key)) {
    nextHeaders.Authorization = `Bearer ${key}`;
  }
  return nextHeaders;
}

function supabaseHeaders(extra = {}) {
  return withSupabaseApiKey({
    "Content-Type": "application/json",
    ...extra,
  }, SUPABASE_DATA_KEY);
}

async function supabaseRequest(table, options = {}) {
  const query = options.query || "";
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: options.method || "GET",
    headers: supabaseHeaders(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return null;
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = payload?.message || payload?.hint || text || "Error consultando Supabase.";
    throw new Error(message);
  }
  return payload;
}

async function supabaseDelete(table, query) {
  await supabaseRequest(table, {
    method: "DELETE",
    query,
    headers: {
      Prefer: "return=minimal",
    },
  });
}

function supabaseAuthHeaders({ admin = false, accessToken = "" } = {}) {
  const key = admin ? SUPABASE_AUTH_ADMIN_KEY : SUPABASE_AUTH_KEY;
  const headers = withSupabaseApiKey({
    "Content-Type": "application/json",
  }, key);
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

async function supabaseAuthRequest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${pathname}`, {
    method: options.method || "GET",
    headers: supabaseAuthHeaders({
      admin: options.admin,
      accessToken: options.accessToken,
    }),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    let message =
      payload?.msg ||
      payload?.message ||
      payload?.error_description ||
      payload?.error ||
      text ||
      "Error consultando Supabase Auth.";
    if (
      options.admin &&
      /valid Bearer token|Invalid JWT|Bearer/i.test(message) &&
      isSupabasePlatformApiKey(SUPABASE_AUTH_ADMIN_KEY)
    ) {
      message =
        "Supabase Auth Admin requiere una llave service_role en SUPABASE_SERVICE_ROLE_KEY. " +
        "Agrega esa variable en Render o define SUPABASE_SEED_AUTH_USERS=false si los usuarios de Auth ya existen.";
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function createSupabaseAuthUser(appUser, password) {
  if (!USE_SUPABASE_AUTH || !password) return null;
  try {
    const email = appUser.email || usernameToAuthEmail(appUser.username);
    const payload = await supabaseAuthRequest("admin/users", {
      method: "POST",
      admin: true,
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: appUser.name,
          username: appUser.username,
        },
        app_metadata: {
          app_user_id: appUser.id,
          app_role: appUser.role,
        },
      },
    });
    return payload?.user || payload;
  } catch (error) {
    if (
      [400, 409, 422].includes(error.status) &&
      /already|registered|exists|duplicate/i.test(error.message)
    ) {
      return null;
    }
    throw error;
  }
}

async function ensureSupabaseAuthUsers(db) {
  if (!USE_SUPABASE_AUTH || process.env.SUPABASE_SEED_AUTH_USERS === "false") return false;
  let changed = false;

  for (const appUser of db.users) {
    const email = appUser.email || usernameToAuthEmail(appUser.username);
    if (appUser.email !== email) {
      appUser.email = email;
      changed = true;
    }

    const defaultPassword = DEFAULT_CREDENTIALS[appUser.username];
    if (!defaultPassword) continue;

    const authUser = await createSupabaseAuthUser(appUser, defaultPassword);
    if (authUser?.id && appUser.authUserId !== authUser.id) {
      appUser.authUserId = authUser.id;
      changed = true;
    }
  }

  return changed;
}

async function signInWithSupabaseAuth(appUser, password) {
  const email = appUser.email || usernameToAuthEmail(appUser.username);
  const payload = await supabaseAuthRequest("token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  if (!payload?.access_token || !payload?.refresh_token) {
    throw new Error("Supabase Auth no devolvió una sesión válida.");
  }
  return {
    provider: "supabase",
    userId: appUser.id,
    authUserId: payload.user?.id || null,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600),
    createdAt: Date.now(),
  };
}

async function refreshSupabaseAuthSession(session) {
  const payload = await supabaseAuthRequest("token?grant_type=refresh_token", {
    method: "POST",
    body: { refresh_token: session.refreshToken },
  });
  session.accessToken = payload.access_token;
  session.refreshToken = payload.refresh_token || session.refreshToken;
  session.expiresAt = Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600);
  session.authUserId = payload.user?.id || session.authUserId;
  return session;
}

async function verifySupabaseAuthSession(session) {
  if (!session?.accessToken) return null;
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt && session.expiresAt - now < SESSION_REFRESH_WINDOW_SECONDS) {
    await refreshSupabaseAuthSession(session);
  }

  try {
    return await supabaseAuthRequest("user", { accessToken: session.accessToken });
  } catch (error) {
    if (error.status !== 401 || !session.refreshToken) throw error;
    await refreshSupabaseAuthSession(session);
    return supabaseAuthRequest("user", { accessToken: session.accessToken });
  }
}

async function supabaseUpsert(table, rows) {
  if (!rows.length) return;
  await supabaseRequest(table, {
    method: "POST",
    query: "?on_conflict=id",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: rows,
  });
}

function auditId(entry) {
  if (entry.id) return entry.id;
  return crypto
    .createHash("sha256")
    .update(`${entry.at}|${entry.userId}|${entry.action}|${entry.candidateId || ""}`)
    .digest("hex");
}

function fromSupabaseRows(users, candidates, evaluations, audit) {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email || usernameToAuthEmail(user.username),
      authUserId: user.auth_user_id,
      name: user.name,
      role: user.role,
      salt: user.salt,
      passwordHash: user.password_hash,
      createdAt: user.created_at,
    })),
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      order: candidate.order_index,
      name: candidate.name,
      behaviorScore: candidate.behavior_score,
      isTop10: candidate.is_top10,
      isTop5: candidate.is_top5,
      updatedAt: candidate.updated_at,
    })),
    evaluations: evaluations.map((evaluation) => ({
      id: evaluation.id,
      jurorId: evaluation.juror_id,
      candidateId: evaluation.candidate_id,
      scores: evaluation.scores,
      createdAt: evaluation.created_at,
      updatedAt: evaluation.updated_at,
      arcgis: evaluation.arcgis,
    })),
    audit: audit.map((entry) => ({
      id: entry.id,
      at: entry.at,
      userId: entry.user_id,
      action: entry.action,
      candidateId: entry.candidate_id,
    })),
  };
}

function toSupabaseRows(db) {
  return {
    users: db.users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email || usernameToAuthEmail(user.username),
      auth_user_id: user.authUserId || null,
      name: user.name,
      role: user.role,
      salt: user.salt || null,
      password_hash: user.passwordHash || null,
      created_at: user.createdAt,
    })),
    candidates: db.candidates.map((candidate) => ({
      id: candidate.id,
      order_index: candidate.order,
      name: candidate.name,
      behavior_score: candidate.behaviorScore,
      is_top10: candidate.isTop10,
      is_top5: candidate.isTop5,
      updated_at: candidate.updatedAt,
    })),
    evaluations: db.evaluations.map((evaluation) => ({
      id: evaluation.id,
      juror_id: evaluation.jurorId,
      candidate_id: evaluation.candidateId,
      scores: evaluation.scores,
      created_at: evaluation.createdAt,
      updated_at: evaluation.updatedAt,
      arcgis: evaluation.arcgis,
    })),
    audit: db.audit.map((entry) => ({
      id: auditId(entry),
      at: entry.at,
      user_id: entry.userId,
      action: entry.action,
      candidate_id: entry.candidateId || null,
    })),
  };
}

async function loadSupabaseDb() {
  const [users, candidates, evaluations, audit] = await Promise.all([
    supabaseRequest("app_users", { query: "?select=*" }),
    supabaseRequest("candidates", { query: "?select=*&order=order_index.asc" }),
    supabaseRequest("evaluations", { query: "?select=*" }),
    supabaseRequest("audit_log", { query: "?select=*" }),
  ]);

  if (!users.length) {
    const db = defaultDatabase();
    ensureDefaultAppUsers(db);
    await ensureSupabaseAuthUsers(db);
    await saveSupabaseDb(db);
    return db;
  }

  const db = fromSupabaseRows(users, candidates, evaluations, audit);
  const defaultsChanged = ensureDefaultAppUsers(db);
  const authChanged = await ensureSupabaseAuthUsers(db);
  if (defaultsChanged || authChanged) {
    await saveSupabaseDb(db);
  }
  return db;
}

async function saveSupabaseDb(db) {
  const rows = toSupabaseRows(db);
  await supabaseUpsert("app_users", rows.users);
  await supabaseUpsert("candidates", rows.candidates);
  await supabaseUpsert("evaluations", rows.evaluations);
  await supabaseUpsert("audit_log", rows.audit);
}

async function loadDb() {
  if (USE_SUPABASE) return loadSupabaseDb();

  ensureDir(DATA_DIR);
  if (!fs.existsSync(DB_PATH)) {
    const db = defaultDatabase();
    await saveDb(db);
    return db;
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  if (ensureDefaultAppUsers(db)) {
    await saveDb(db);
  }
  return db;
}

async function saveDb(db) {
  if (USE_SUPABASE) {
    await saveSupabaseDb(db);
    return;
  }

  ensureDir(DATA_DIR);
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tempPath, DB_PATH);
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

function signSessionId(sessionId) {
  return crypto.createHmac("sha256", sessionSecret).update(sessionId).digest("hex");
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join("; ");
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};
  header.split(";").forEach((part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) return;
    cookies[rawKey] = rawValue.join("=");
  });
  return cookies;
}

function sessionCookieValue(sessionId) {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

function sessionCookieOptions(extra = {}) {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "Lax",
    path: "/",
    ...extra,
  };
}

function createSession(session) {
  const sessionId = crypto.randomBytes(24).toString("hex");
  sessions.set(sessionId, session);
  return sessionId;
}

function getSignedSession(req) {
  const cookies = parseCookies(req);
  const value = cookies[SESSION_COOKIE_NAME];
  if (!value) return { sessionId: null, session: null };
  const [sessionId, signature] = value.split(".");
  if (!sessionId || !signature) return { sessionId: null, session: null };
  const expected = signSessionId(sessionId);
  if (signature.length !== expected.length) return { sessionId: null, session: null };
  const ok = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!ok) return { sessionId: null, session: null };
  const session = sessions.get(sessionId);
  return { sessionId, session: session || null };
}

function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE_NAME, "", sessionCookieOptions({ maxAge: 0 }));
}

async function getSessionUser(req, db) {
  const { sessionId, session } = getSignedSession(req);
  if (!sessionId || !session) return null;
  const appUser = db.users.find((user) => user.id === session.userId);
  if (!appUser) {
    sessions.delete(sessionId);
    return null;
  }

  if (session.provider === "supabase") {
    try {
      const authUser = await verifySupabaseAuthSession(session);
      if (!authUser?.id) {
        sessions.delete(sessionId);
        return null;
      }
    } catch (error) {
      sessions.delete(sessionId);
      return null;
    }
  }

  return appUser;
}

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function sendText(res, statusCode, body, contentType = "text/plain; charset=utf-8", headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("El cuerpo de la solicitud es demasiado grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("JSON inválido."));
      }
    });
    req.on("error", reject);
  });
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100) / 100;
}

function validateScore(value, label, required = true) {
  const score = numberOrNull(value);
  if (score === null) {
    if (required) throw new Error(`${label} es obligatorio.`);
    return null;
  }
  if (score < 1 || score > 100) {
    throw new Error(`${label} debe estar entre 1 y 100.`);
  }
  return score;
}

function validateName(value, label) {
  const name = String(value || "").trim();
  if (!name) throw new Error(`${label} es obligatorio.`);
  if (name.length > 80) throw new Error(`${label} no puede superar 80 caracteres.`);
  return name;
}

function mergeLockedScores(existingScores, incomingScores, labels, candidate) {
  const allKeys = ["interview", "gala", "swimsuit", "speech", "finalQuestion"];
  const stageEnabled = {
    interview: true,
    gala: true,
    swimsuit: true,
    speech: candidate.isTop10,
    finalQuestion: candidate.isTop5,
  };
  const merged = {};

  allKeys.forEach((key) => {
    if (!stageEnabled[key]) {
      merged[key] = null;
      return;
    }

    const previous = existingScores?.[key];
    const hasPrevious = scoreIsPresent(previous);
    const incoming = validateScore(incomingScores?.[key], labels[key], false);

    if (hasPrevious) {
      if (incoming !== null && incoming !== previous) {
        throw new Error(`${labels[key]} ya fue enviada y no se puede editar.`);
      }
      merged[key] = previous;
      return;
    }

    merged[key] = incoming;
  });

  const savedCount = allKeys.filter((key) => scoreIsPresent(merged[key])).length;
  const previousCount = allKeys.filter((key) => scoreIsPresent(existingScores?.[key])).length;
  if (savedCount === previousCount) {
    throw new Error("Ingresa al menos un criterio nuevo para guardar.");
  }

  return merged;
}

function requiredCriteriaForCandidate(candidate) {
  const keys = ["interview", "gala", "swimsuit"];
  if (candidate.isTop10) keys.push("speech");
  if (candidate.isTop5) keys.push("finalQuestion");
  return keys;
}

function stageWeightForCandidate(candidate) {
  if (candidate.isTop5) return 1;
  if (candidate.isTop10) return 0.95;
  return 0.9;
}

function scoreIsPresent(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function computeResults(db) {
  const jurors = db.users.filter((user) => user.role === "juror");
  return db.candidates
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((candidate) => {
      const rows = db.evaluations.filter((evaluation) => evaluation.candidateId === candidate.id);
      const averages = {};

      CRITERIA.forEach((criterion) => {
        const values = rows
          .map((evaluation) => evaluation.scores?.[criterion.key])
          .filter(scoreIsPresent);
        averages[criterion.key] = values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : null;
      });

      const behavior = scoreIsPresent(candidate.behaviorScore) ? candidate.behaviorScore : null;
      let weightedSum = 0;
      let availableWeight = 0;

      CRITERIA.forEach((criterion) => {
        const value = averages[criterion.key];
        const shouldCount =
          criterion.stage === "preliminar" ||
          (criterion.stage === "top10" && candidate.isTop10) ||
          (criterion.stage === "top5" && candidate.isTop5);
        if (shouldCount && scoreIsPresent(value)) {
          weightedSum += value * criterion.weight;
          availableWeight += criterion.weight;
        }
      });

      if (scoreIsPresent(behavior)) {
        weightedSum += behavior * WEIGHTS.behavior;
        availableWeight += WEIGHTS.behavior;
      }

      const expectedWeight = stageWeightForCandidate(candidate);
      const normalizedTotal = expectedWeight > 0 ? weightedSum / expectedWeight : 0;
      const availableTotal = availableWeight > 0 ? weightedSum / availableWeight : 0;
      const requiredKeys = requiredCriteriaForCandidate(candidate);
      const completedJurors = jurors.filter((juror) => {
        const evaluation = rows.find((row) => row.jurorId === juror.id);
        if (!evaluation) return false;
        return requiredKeys.every((key) => scoreIsPresent(evaluation.scores?.[key]));
      }).length;

      return {
        candidateId: candidate.id,
        candidateName: candidate.name,
        order: candidate.order,
        isTop10: candidate.isTop10,
        isTop5: candidate.isTop5,
        behaviorScore: behavior,
        averages,
        weightedTotal: Math.round(normalizedTotal * 100) / 100,
        availableTotal: Math.round(availableTotal * 100) / 100,
        expectedWeight,
        availableWeight: Math.round(availableWeight * 100) / 100,
        completedJurors,
        jurorCount: jurors.length,
      };
    })
    .sort((a, b) => b.weightedTotal - a.weightedTotal || a.order - b.order)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

function getEvaluation(db, jurorId, candidateId) {
  return db.evaluations.find(
    (evaluation) => evaluation.jurorId === jurorId && evaluation.candidateId === candidateId,
  );
}

function makeEvaluation(jurorId, candidateId) {
  return {
    id: `${jurorId}_${candidateId}`,
    jurorId,
    candidateId,
    scores: {
      interview: null,
      gala: null,
      swimsuit: null,
      speech: null,
      finalQuestion: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    arcgis: null,
  };
}

async function resetResultsForTesting(db, user) {
  db.evaluations = [];
  const resetAt = new Date().toISOString();
  db.candidates.forEach((candidate) => {
    candidate.behaviorScore = null;
    candidate.isTop10 = false;
    candidate.isTop5 = false;
    candidate.updatedAt = resetAt;
  });
  db.audit.push({
    at: resetAt,
    userId: user.id,
    action: "reset_results_for_testing",
  });

  if (USE_SUPABASE) {
    await supabaseDelete("evaluations", "?id=not.is.null");
  }

  await saveDb(db);
}

async function getArcgisToken() {
  const username = process.env.ARCGIS_USERNAME;
  const password = process.env.ARCGIS_PASSWORD;
  const token = process.env.ARCGIS_TOKEN;
  if (token) return token;
  if (!username || !password) return null;

  const body = new URLSearchParams({
    username,
    password,
    client: "referer",
    referer: PUBLIC_URL || `http://localhost:${PORT}`,
    expiration: "60",
    f: "json",
  });

  const response = await fetch("https://www.arcgis.com/sharing/rest/generateToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json();
  if (!payload.token) {
    throw new Error(payload.error?.message || "No se pudo obtener token de ArcGIS.");
  }
  return payload.token;
}

async function syncEvaluationToArcgis(db, evaluation) {
  const layerUrl = process.env.ARCGIS_FEATURE_LAYER_URL;
  if (!layerUrl || process.env.ARCGIS_SYNC_ENABLED !== "true") {
    return { status: "skipped", message: "ArcGIS no configurado." };
  }

  const token = await getArcgisToken();
  if (!token) return { status: "skipped", message: "Falta token o credencial de ArcGIS." };

  const candidate = db.candidates.find((item) => item.id === evaluation.candidateId);
  const juror = db.users.find((item) => item.id === evaluation.jurorId);
  const result = computeResults(db).find((item) => item.candidateId === candidate.id);

  const attributes = {
    submission_id: evaluation.id,
    jurado_id: evaluation.jurorId,
    jurado_nombre: juror?.name || evaluation.jurorId,
    candidata_id: evaluation.candidateId,
    candidata_nombre: candidate?.name || evaluation.candidateId,
    entrevista: evaluation.scores.interview,
    gala: evaluation.scores.gala,
    traje_bano: evaluation.scores.swimsuit,
    speech_top10: evaluation.scores.speech,
    pregunta_final_top5: evaluation.scores.finalQuestion,
    comportamiento: candidate?.behaviorScore || null,
    total_etapa: result?.weightedTotal || null,
    updated_at: evaluation.updatedAt,
  };

  const metadataResponse = await fetch(`${layerUrl}?f=json&token=${encodeURIComponent(token)}`);
  const metadata = await metadataResponse.json();
  const objectIdField = metadata.objectIdField || "OBJECTID";

  const queryBody = new URLSearchParams({
    f: "json",
    token,
    where: `submission_id='${evaluation.id.replaceAll("'", "''")}'`,
    outFields: objectIdField,
    returnGeometry: "false",
  });
  const queryResponse = await fetch(`${layerUrl}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: queryBody,
  });
  const queryPayload = await queryResponse.json();
  const existing = queryPayload.features?.[0]?.attributes?.[objectIdField];
  const operation = existing ? "updateFeatures" : "addFeatures";
  if (existing) attributes[objectIdField] = existing;

  const editBody = new URLSearchParams({
    f: "json",
    token,
    features: JSON.stringify([{ attributes }]),
  });
  const editResponse = await fetch(`${layerUrl}/${operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: editBody,
  });
  const editPayload = await editResponse.json();
  const results = editPayload.addResults || editPayload.updateResults || [];
  const first = results[0];
  if (!first?.success) {
    throw new Error(first?.error?.description || editPayload.error?.message || "ArcGIS rechazó el guardado.");
  }
  return { status: "synced", operation, objectId: first.objectId || existing, syncedAt: new Date().toISOString() };
}

function csvValue(value) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function resultsToCsv(results) {
  const rows = [
    [
      "Puesto",
      "Candidata",
      "Entrevista",
      "Gala",
      "Traje de bano",
      "Speech Top 10",
      "Pregunta final Top 5",
      "Comportamiento",
      "Total",
      "Jurados completos",
    ],
  ];

  results.forEach((result) => {
    rows.push([
      result.rank,
      result.candidateName,
      result.averages.interview,
      result.averages.gala,
      result.averages.swimsuit,
      result.averages.speech,
      result.averages.finalQuestion,
      result.behaviorScore,
      result.weightedTotal,
      `${result.completedJurors}/${result.jurorCount}`,
    ]);
  });

  return rows.map((row) => row.map(csvValue).join(",")).join("\n");
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  let filePath = decodeURIComponent(requestUrl.pathname);
  if (filePath === "/") filePath = "/index.html";
  const fullPath = path.normalize(path.join(PUBLIC_DIR, filePath));
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    sendText(res, 404, "Not found");
    return;
  }
  const extension = path.extname(fullPath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  };
  const content = fs.readFileSync(fullPath);
  res.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Content-Length": content.length,
  });
  res.end(content);
}

async function handleApi(req, res) {
  const db = await loadDb();
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const user = await getSessionUser(req, db);

  try {
    if (req.method === "POST" && requestUrl.pathname === "/api/login") {
      const body = await readRequestBody(req);
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "");
      const found = db.users.find((item) => item.username.toLowerCase() === username);
      if (!found) {
        sendJson(res, 401, { error: "Usuario o contraseña incorrectos." });
        return;
      }

      let session;
      if (USE_SUPABASE_AUTH) {
        try {
          session = await signInWithSupabaseAuth(found, password);
        } catch (error) {
          sendJson(res, 401, { error: "Usuario o contraseña incorrectos." });
          return;
        }
      } else {
        if (!found.salt || !found.passwordHash || hashPassword(password, found.salt) !== found.passwordHash) {
          sendJson(res, 401, { error: "Usuario o contraseña incorrectos." });
          return;
        }
        session = { provider: "local", userId: found.id, createdAt: Date.now() };
      }

      const sessionId = createSession(session);
      sendJson(
        res,
        200,
        { user: safeUser(found) },
        {
          "Set-Cookie": serializeCookie(
            SESSION_COOKIE_NAME,
            sessionCookieValue(sessionId),
            sessionCookieOptions({ maxAge: SESSION_MAX_AGE_SECONDS }),
          ),
        },
      );
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/logout") {
      const { sessionId, session } = getSignedSession(req);
      if (session?.provider === "supabase" && session.accessToken) {
        await supabaseAuthRequest("logout", {
          method: "POST",
          accessToken: session.accessToken,
        }).catch(() => null);
      }
      if (sessionId) sessions.delete(sessionId);
      sendJson(
        res,
        200,
        { ok: true },
        {
          "Set-Cookie": clearSessionCookie(),
        },
      );
      return;
    }

    if (!user) {
      sendJson(res, 401, { error: "Debes iniciar sesión." });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/bootstrap") {
      const payload = {
        user: safeUser(user),
        criteria: CRITERIA,
        weights: WEIGHTS,
        candidates: db.candidates.slice().sort((a, b) => a.order - b.order),
        arcgisConfigured: Boolean(process.env.ARCGIS_FEATURE_LAYER_URL && process.env.ARCGIS_SYNC_ENABLED === "true"),
      };

      if (user.role === "juror") {
        payload.evaluations = db.evaluations.filter((evaluation) => evaluation.jurorId === user.id);
      } else if (user.role === "admin") {
        payload.jurors = db.users.filter((item) => item.role === "juror").map(safeUser);
        payload.results = computeResults(db);
        payload.evaluations = db.evaluations;
      } else if (user.role === "system_admin") {
        payload.jurors = db.users.filter((item) => item.role === "juror").map(safeUser);
      }

      sendJson(res, 200, payload);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/results") {
      if (user.role !== "admin") {
        sendJson(res, 403, { error: "Solo la organización puede ver resultados generales." });
        return;
      }
      sendJson(res, 200, { results: computeResults(db) });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/results.csv") {
      if (user.role !== "admin") {
        sendJson(res, 403, { error: "Solo la organización puede exportar resultados." });
        return;
      }
      const csv = resultsToCsv(computeResults(db));
      sendText(res, 200, csv, "text/csv; charset=utf-8", {
        "Content-Disposition": 'attachment; filename="resultados-concurso.csv"',
      });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/evaluations") {
      if (user.role !== "juror") {
        sendJson(res, 403, { error: "Solo los jurados pueden calificar candidatas." });
        return;
      }
      const body = await readRequestBody(req);
      const candidate = db.candidates.find((item) => item.id === body.candidateId);
      if (!candidate) {
        sendJson(res, 404, { error: "Candidata no encontrada." });
        return;
      }

      const labels = Object.fromEntries(CRITERIA.map((criterion) => [criterion.key, criterion.label]));
      let evaluation = getEvaluation(db, user.id, candidate.id);
      if (!evaluation) {
        evaluation = makeEvaluation(user.id, candidate.id);
        db.evaluations.push(evaluation);
      }
      const nextScores = mergeLockedScores(
        evaluation.scores,
        body.scores || {},
        labels,
        candidate,
      );
      evaluation.scores = nextScores;
      evaluation.updatedAt = new Date().toISOString();
      evaluation.arcgis = { status: "pending" };

      db.audit.push({
        at: evaluation.updatedAt,
        userId: user.id,
        action: "save_evaluation",
        candidateId: candidate.id,
      });

      await saveDb(db);

      try {
        const syncStatus = await syncEvaluationToArcgis(db, evaluation);
        evaluation.arcgis = syncStatus;
      } catch (error) {
        evaluation.arcgis = { status: "error", message: error.message };
      }
      await saveDb(db);

      sendJson(res, 200, { evaluation, results: user.role === "admin" ? computeResults(db) : undefined });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname.startsWith("/api/system/candidates/")) {
      if (user.role !== "system_admin") {
        sendJson(res, 403, { error: "Solo el administrador del sistema puede cambiar nombres." });
        return;
      }
      const candidateId = decodeURIComponent(requestUrl.pathname.split("/").pop());
      const candidate = db.candidates.find((item) => item.id === candidateId);
      if (!candidate) {
        sendJson(res, 404, { error: "Candidata no encontrada." });
        return;
      }
      const body = await readRequestBody(req);
      candidate.name = validateName(body.name, "Nombre de candidata");
      candidate.updatedAt = new Date().toISOString();
      db.audit.push({
        at: candidate.updatedAt,
        userId: user.id,
        action: "rename_candidate",
        candidateId: candidate.id,
      });
      await saveDb(db);
      sendJson(res, 200, { candidate });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname.startsWith("/api/system/jurors/")) {
      if (user.role !== "system_admin") {
        sendJson(res, 403, { error: "Solo el administrador del sistema puede cambiar nombres." });
        return;
      }
      const jurorId = decodeURIComponent(requestUrl.pathname.split("/").pop());
      const juror = db.users.find((item) => item.id === jurorId && item.role === "juror");
      if (!juror) {
        sendJson(res, 404, { error: "Jurado no encontrado." });
        return;
      }
      const body = await readRequestBody(req);
      juror.name = validateName(body.name, "Nombre de jurado");
      db.audit.push({
        at: new Date().toISOString(),
        userId: user.id,
        action: "rename_juror",
      });
      await saveDb(db);
      sendJson(res, 200, { juror: safeUser(juror) });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/system/reset-results") {
      if (user.role !== "system_admin") {
        sendJson(res, 403, { error: "Solo el administrador del sistema puede borrar resultados." });
        return;
      }
      await resetResultsForTesting(db, user);
      sendJson(res, 200, {
        ok: true,
        candidates: db.candidates.slice().sort((a, b) => a.order - b.order),
      });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname.startsWith("/api/admin/candidates/")) {
      if (user.role !== "admin") {
        sendJson(res, 403, { error: "Solo la organización puede editar esta sección." });
        return;
      }
      const candidateId = decodeURIComponent(requestUrl.pathname.split("/").pop());
      const candidate = db.candidates.find((item) => item.id === candidateId);
      if (!candidate) {
        sendJson(res, 404, { error: "Candidata no encontrada." });
        return;
      }
      const body = await readRequestBody(req);
      if ("behaviorScore" in body) {
        candidate.behaviorScore = validateScore(body.behaviorScore, "Comportamiento", false);
      }
      if ("isTop10" in body) candidate.isTop10 = Boolean(body.isTop10);
      if ("isTop5" in body) candidate.isTop5 = Boolean(body.isTop5);
      if (candidate.isTop5) candidate.isTop10 = true;
      if (!candidate.isTop10) candidate.isTop5 = false;
      candidate.updatedAt = new Date().toISOString();
      db.audit.push({
        at: candidate.updatedAt,
        userId: user.id,
        action: "update_candidate",
        candidateId: candidate.id,
      });
      await saveDb(db);
      sendJson(res, 200, {
        candidate,
        results: computeResults(db),
      });
      return;
    }

    sendJson(res, 404, { error: "Ruta no encontrada." });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
});

loadDb()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Concurso jurados: http://localhost:${PORT}`);
      console.log(`Base de datos: ${USE_SUPABASE ? "Supabase" : "local"}`);
    });
  })
  .catch((error) => {
    console.error("No se pudo iniciar la base de datos:", error.message);
    process.exit(1);
  });
