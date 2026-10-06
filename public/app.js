const app = document.querySelector("#app");
const DASHBOARD_REFRESH_MS = 5000;
const LANGUAGE_STORAGE_KEY = "concurso-jurados-language";

let dashboardRefreshTimer = null;

function initialLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

const state = {
  language: initialLanguage(),
  user: null,
  criteria: [],
  weights: {},
  candidates: [],
  evaluations: [],
  jurors: [],
  passwordUsers: [],
  results: [],
  selectedCandidateId: null,
  selectedAdminCandidateId: null,
  selectedSystemCandidateId: null,
  selectedViewerCandidateId: null,
  search: "",
  adminTab: "results",
  systemTab: "names",
  viewerTab: "ranking",
  adminResultMessage: "",
  adminResultError: "",
  systemValidationMessage: "",
  systemValidationError: "",
  dashboardUpdatedAt: "",
  dashboardError: "",
};

const TOP10_LIMIT = 10;
const TOP5_LIMIT = 5;

const TRANSLATIONS = {
  en: {
    "Accesos de prueba": "Test access",
    "Acción": "Action",
    "Acumulado": "Accumulated",
    "Actualizar": "Update",
    "Actualizando": "Updating",
    "Actualiza accesos de organización, jurados y tu usuario de sistema.": "Update access for organization, jurors and your system user.",
    "Administrador del sistema": "System administrator",
    "Administracion": "Administration",
    "Avance jurados": "Juror progress",
    "Borra calificaciones, comportamiento y etapas; conserva nombres y usuarios.": "Deletes scores, behavior and stages; keeps names and users.",
    "Borra una calificación individual para que el jurado pueda volver a registrarla.": "Delete one individual score so the juror can submit it again.",
    "Borrar": "Delete",
    "Borrar resultados": "Delete results",
    "Buscar candidata": "Search candidate",
    "Calificación borrada. El jurado puede volver a registrarla.": "Score deleted. The juror can submit it again.",
    "Calificación cerrada": "Scoring closed",
    "Calificación de 1 a 100": "Score from 1 to 100",
    "Calificaciones registradas por jurado": "Scores submitted by juror",
    "Cambios guardados.": "Changes saved.",
    "Candidata": "Candidate",
    "Candidatas": "Candidates",
    "Categorías": "Categories",
    "Comport.": "Behavior",
    "Comportamiento": "Behavior",
    "Comportamiento / informe · 15%": "Behavior / report · 15%",
    "Completa": "Complete",
    "Confirmar": "Confirm",
    "Configuración": "Settings",
    "Contraseña": "Password",
    "Contraseña actualizada.": "Password updated.",
    "Contraseñas": "Passwords",
    "Correcciones": "Corrections",
    "Criterio guardado.": "Criterion saved.",
    "Criterios guardados.": "Criteria saved.",
    "Disponible": "Available",
    "En vivo": "Live",
    "Entrar": "Log in",
    "Entrevista": "Interview",
    "Error": "Error",
    "Estado": "Status",
    "Estado y puntaje de organización": "Status and organization score",
    "Etapa": "Stage",
    "Exportar CSV": "Export CSV",
    "Gala": "Gala",
    "Guardada": "Saved",
    "Guardada localmente. ArcGIS quedó pendiente.": "Saved locally. ArcGIS is pending.",
    "Guardado": "Saved",
    "Guardar": "Save",
    "Guardar cambios": "Save changes",
    "Guardar criterios llenos": "Save completed criteria",
    "Guardando...": "Saving...",
    "Guardando calificación...": "Saving score...",
    "Guardando criterio...": "Saving criterion...",
    "Jurados": "Jurors",
    "Jurados completos": "Completed jurors",
    "Jurado": "Juror",
    "Las contraseñas no coinciden.": "Passwords do not match.",
    "Nombre guardado.": "Name saved.",
    "Nombres internos de cada cuenta de jurado.": "Internal names for each juror account.",
    "Nombres visibles para jurados y resultados.": "Names visible to jurors and results.",
    "No aplica": "Not applicable",
    "No se pudo completar la acción.": "The action could not be completed.",
    "No hay calificaciones registradas para corregir.": "There are no submitted scores to correct.",
    "No hay candidatas.": "There are no candidates.",
    "No hay candidatas para validar.": "There are no candidates to validate.",
    "Nueva contraseña": "New password",
    "Organización": "Organization",
    "Parcial": "Partial",
    "Pendiente": "Pending",
    "Peso activo": "Active weight",
    "Pesos": "Weights",
    "Pregunta": "Question",
    "Pregunta final": "Final question",
    "Pregunta final Top 5": "Top 5 final question",
    "Preliminar": "Preliminary",
    "Pruebas": "Tests",
    "Puesto": "Rank",
    "Ranking": "Ranking",
    "Ranking actual por candidata.": "Current ranking by candidate.",
    "Resultados": "Results",
    "Resultados borrados. La prueba puede empezar de nuevo.": "Results deleted. The test can start again.",
    "Salir": "Log out",
    "Se borrará la calificación de {jurorName} para {candidateName}. El jurado podrá volver a calificarla.": "The score from {jurorName} for {candidateName} will be deleted. The juror will be able to score it again.",
    "Selecciona una candidata para revisar cada jurado.": "Select a candidate to review each juror.",
    "Selección": "Selection",
    "Selección guardada.": "Selection saved.",
    "Sin calificaciones registradas.": "No scores submitted.",
    "Sin fecha": "No date",
    "Sin registro": "No record",
    "Sistema": "System",
    "Sistema de jurados": "Juror system",
    "Tablero": "Dashboard",
    "Tablero de votaciones": "Voting dashboard",
    "Tablero en vivo": "Live dashboard",
    "Top 10": "Top 10",
    "Top 5": "Top 5",
    "Total": "Total",
    "Traje": "Swimsuit",
    "Traje de baño": "Swimsuit",
    "Usuario": "Username",
    "Validación": "Validation",
    "Vista en vivo de resultados, categorías y candidatas.": "Live view of results, categories and candidates.",
    "comp.": "beh.",
    "criterios": "criteria",
    "este jurado": "this juror",
    "esta candidata": "this candidate",
    "jurados": "jurors",
    "Puedes guardar un criterio por separado o varios a la vez. Todo criterio enviado queda bloqueado.": "You can save one criterion separately or several at once. Every submitted criterion is locked.",
    "Esta candidata ya fue calificada en la etapa actual.": "This candidate has already been scored in the current stage.",
    "Esto borrará las calificaciones y reiniciará comportamiento, Top 10 y Top 5. Los nombres se conservan.": "This will delete scores and reset behavior, Top 10 and Top 5. Names are kept.",
    "Este usuario no tiene una vista asignada.": "This user has no assigned view.",
  },
};

document.documentElement.lang = state.language;

function t(key, params = {}) {
  const template = state.language === "en" ? TRANSLATIONS.en[key] || key : key;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

function setLanguage(language) {
  state.language = language === "en" ? "en" : "es";
  document.documentElement.lang = state.language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
  } catch {
    // Ignore browsers that block localStorage.
  }
}

function languageToggleHtml() {
  const nextLanguage = state.language === "es" ? "EN" : "ES";
  const label = state.language === "es" ? "Switch to English" : "Cambiar a español";
  return `<button class="language-toggle" type="button" data-language-toggle aria-label="${escapeHtml(label)}">${nextLanguage}</button>`;
}

function bindLanguageToggle(renderAfterToggle = renderApp) {
  document.querySelectorAll("[data-language-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(state.language === "es" ? "en" : "es");
      renderAfterToggle();
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString(state.language === "en" ? "en-US" : "es-CO", {
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : digits,
    maximumFractionDigits: digits,
  });
}

function roleLabel(role) {
  if (role === "admin") return t("Organización");
  if (role === "system_admin") return t("Administrador del sistema");
  if (role === "viewer") return t("Tablero en vivo");
  return t("Jurado");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload.error || t("No se pudo completar la acción."));
  }
  return payload;
}

function candidateBadges(candidate) {
  const badges = [];
  if (candidate.isTop10) badges.push('<span class="badge top10">Top 10</span>');
  if (candidate.isTop5) badges.push('<span class="badge top5">Top 5</span>');
  return badges.join("");
}

function stageCounts(items = state.results) {
  return {
    top10: items.filter((item) => item.isTop10).length,
    top5: items.filter((item) => item.isTop5).length,
  };
}

function updateCandidateState(candidate, results) {
  const index = state.candidates.findIndex((item) => item.id === candidate.id);
  if (index >= 0) state.candidates[index] = candidate;
  state.results = sortedResults(results);
}

function sortedResults(results = state.results) {
  return (results || [])
    .slice()
    .sort((a, b) => Number(b.weightedTotal || 0) - Number(a.weightedTotal || 0) || a.order - b.order);
}

const JUROR_SCORE_META = [
  { key: "interview", label: "Entrevista", weight: 30 },
  { key: "gala", label: "Gala", weight: 25 },
  { key: "swimsuit", label: "Traje de baño", weight: 20 },
  { key: "speech", label: "Speech Top 10", weight: 5, requires: "isTop10" },
  { key: "finalQuestion", label: "Pregunta final Top 5", weight: 5, requires: "isTop5" },
];

const DASHBOARD_CATEGORY_META = [
  ...JUROR_SCORE_META,
  { key: "behavior", label: "Comportamiento", weight: 15 },
];

function requiredKeys(candidate) {
  const keys = ["interview", "gala", "swimsuit"];
  if (candidate.isTop10) keys.push("speech");
  if (candidate.isTop5) keys.push("finalQuestion");
  return keys;
}

function criterionLabel(criterion) {
  return t(criterion.label);
}

function evaluationFor(candidateId) {
  return state.evaluations.find((evaluation) => evaluation.candidateId === candidateId);
}

function activeJurorScoreMeta(candidate) {
  return JUROR_SCORE_META.filter((criterion) => !criterion.requires || candidate[criterion.requires]);
}

function scoreValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 100) return null;
  return numericValue;
}

function sanitizeScoreText(value) {
  const clean = String(value || "").replace(/[^0-9.,]/g, "");
  const separatorIndex = clean.search(/[.,]/);
  if (separatorIndex === -1) return clean;

  const before = clean.slice(0, separatorIndex).replace(/[.,]/g, "");
  const separator = clean[separatorIndex];
  const after = clean.slice(separatorIndex + 1).replace(/[.,]/g, "");
  return `${before}${separator}${after}`;
}

function blockInvalidScoreKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const allowedKeys = new Set([
    "Backspace",
    "Delete",
    "Tab",
    "Enter",
    "Escape",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ]);
  if (allowedKeys.has(event.key)) return;
  if (/^\d$/.test(event.key)) return;
  if ((event.key === "." || event.key === ",") && !/[.,]/.test(event.currentTarget.value)) return;
  event.preventDefault();
}

function bindScoreInputGuards(root = document) {
  if (!root) return;
  root.querySelectorAll(".score-value-input").forEach((input) => {
    if (input.dataset.scoreGuardBound) return;
    input.dataset.scoreGuardBound = "true";
    input.addEventListener("keydown", blockInvalidScoreKey);
    input.addEventListener("input", () => {
      const sanitized = sanitizeScoreText(input.value);
      if (input.value !== sanitized) input.value = sanitized;
    });
    input.addEventListener("paste", () => {
      setTimeout(() => {
        input.value = sanitizeScoreText(input.value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }, 0);
    });
  });
}

function scoreAccumulator(candidate, scores) {
  const activeCriteria = activeJurorScoreMeta(candidate);
  const maxPoints = activeCriteria.reduce((total, criterion) => total + criterion.weight, 0);
  let accumulated = 0;
  let completed = 0;

  activeCriteria.forEach((criterion) => {
    const value = scoreValue(scores?.[criterion.key]);
    if (value === null) return;
    accumulated += value * (criterion.weight / 100);
    completed += 1;
  });

  return {
    accumulated: Math.round(accumulated * 100) / 100,
    maxPoints,
    completed,
    totalCriteria: activeCriteria.length,
    percent: maxPoints > 0 ? Math.min(100, Math.round((accumulated / maxPoints) * 1000) / 10) : 0,
  };
}

function accumulatorHtml(candidate, scores) {
  const accumulator = scoreAccumulator(candidate, scores);
  return `
    <div class="accumulator-card" id="score-accumulator">
      <span>${t("Acumulado")}</span>
      <strong id="score-accumulator-total">${formatNumber(accumulator.accumulated)} / ${formatNumber(accumulator.maxPoints, 0)}</strong>
      <div class="accumulator-meter" aria-hidden="true">
        <span id="score-accumulator-bar" style="width: ${accumulator.percent}%"></span>
      </div>
      <p id="score-accumulator-detail">${accumulator.completed}/${accumulator.totalCriteria} ${t("criterios")} · ${formatNumber(accumulator.percent, 1)}%</p>
    </div>
  `;
}

function evaluationStatus(candidate) {
  const evaluation = evaluationFor(candidate.id);
  if (!evaluation) return { label: t("Pendiente"), className: "" };
  const keys = requiredKeys(candidate);
  const present = keys.filter((key) => typeof evaluation.scores?.[key] === "number");
  if (present.length === keys.length) return { label: t("Guardada"), className: "done" };
  if (present.length > 0) return { label: t("Parcial"), className: "partial" };
  return { label: t("Pendiente"), className: "" };
}

function selectDefaultCandidate() {
  if (!state.selectedCandidateId && state.candidates.length) {
    state.selectedCandidateId = state.candidates[0].id;
  }
  if (!state.selectedAdminCandidateId && state.candidates.length) {
    state.selectedAdminCandidateId = state.candidates[0].id;
  }
  if (!state.selectedSystemCandidateId && state.candidates.length) {
    state.selectedSystemCandidateId = state.candidates[0].id;
  }
  if (!state.selectedViewerCandidateId && state.candidates.length) {
    state.selectedViewerCandidateId = state.candidates[0].id;
  }
}

async function loadApp() {
  try {
    const payload = await api("/api/bootstrap");
    Object.assign(state, payload);
    state.results = sortedResults(state.results);
    state.dashboardUpdatedAt = new Date().toISOString();
    selectDefaultCandidate();
    renderApp();
  } catch (error) {
    renderLogin();
  }
}

function renderLogin() {
  app.innerHTML = `
    <main class="login-shell">
      <section class="login-panel">
        <div class="login-panel-head">
          <div class="brand-mark">CJ</div>
          ${languageToggleHtml()}
        </div>
        <h1>${t("Sistema de jurados")}</h1>
        <form id="login-form" class="login-form">
          <label>
            ${t("Usuario")}
            <input name="username" autocomplete="username" required />
          </label>
          <label>
            ${t("Contraseña")}
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button type="submit">${t("Entrar")}</button>
          <p id="login-error" class="form-error" role="alert"></p>
        </form>
        <div class="demo-access">
          <strong>${t("Accesos de prueba")}</strong>
          <span>${t("Organización")}: admin / admin2026</span>
          <span>${t("Sistema")}: sistema / sistema2026</span>
          <span>${t("Tablero")}: tablero / tablero2026</span>
          <span>jurado1 / jurado1</span>
          <span>jurado2 / jurado2 ... jurado5 / jurado5</span>
        </div>
      </section>
    </main>
  `;
  bindLanguageToggle(renderLogin);
  const form = document.querySelector("#login-form");
  const error = document.querySelector("#login-error");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const data = new FormData(form);
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          username: data.get("username"),
          password: data.get("password"),
        }),
      });
      await loadApp();
    } catch (caught) {
      error.textContent = caught.message;
    }
  });
}

function stopDashboardAutoRefresh() {
  if (!dashboardRefreshTimer) return;
  clearInterval(dashboardRefreshTimer);
  dashboardRefreshTimer = null;
}

function ensureDashboardAutoRefresh() {
  if (dashboardRefreshTimer) return;
  dashboardRefreshTimer = setInterval(refreshDashboardData, DASHBOARD_REFRESH_MS);
}

async function refreshDashboardData() {
  if (state.user?.role !== "viewer") {
    stopDashboardAutoRefresh();
    return;
  }

  try {
    const payload = await api("/api/bootstrap");
    Object.assign(state, payload);
    state.results = sortedResults(state.results);
    state.dashboardUpdatedAt = new Date().toISOString();
    state.dashboardError = "";
    selectDefaultCandidate();
  } catch (caught) {
    state.dashboardError = caught.message;
  }

  renderViewerDashboard();
}

function topbarHtml() {
  return `
    <header class="topbar">
      <div class="topbar-title">
        <div class="brand-mark">CJ</div>
        <div>
          <strong>Concurso | Jurados</strong>
          <span>${escapeHtml(state.user.name)} · ${roleLabel(state.user.role)}</span>
        </div>
      </div>
      <div class="topbar-actions">
        <span class="user-meta">${escapeHtml(state.user.username)}</span>
        ${languageToggleHtml()}
        <button class="ghost-button" id="logout-button">${t("Salir")}</button>
      </div>
    </header>
  `;
}

function renderApp() {
  if (state.user.role === "admin") {
    stopDashboardAutoRefresh();
    renderAdmin();
  } else if (state.user.role === "system_admin") {
    stopDashboardAutoRefresh();
    renderSystemAdmin();
  } else if (state.user.role === "viewer") {
    renderViewerDashboard();
    return;
  } else if (state.user.role === "juror") {
    stopDashboardAutoRefresh();
    renderJuror();
  } else {
    stopDashboardAutoRefresh();
    renderUnsupportedRole();
  }

  document.querySelector("#logout-button")?.addEventListener("click", async () => {
    stopDashboardAutoRefresh();
    await api("/api/logout", { method: "POST", body: "{}" });
    renderLogin();
  });
  bindLanguageToggle(renderApp);
}

function renderUnsupportedRole() {
  app.innerHTML = `
    <div class="app-shell">
      ${topbarHtml()}
      <main class="main">
        <div class="empty-state">${t("Este usuario no tiene una vista asignada.")}</div>
      </main>
    </div>
  `;
}

function renderCandidateList(candidates, selectedId, admin = false) {
  return candidates
    .map((candidate) => {
      const status = admin ? null : evaluationStatus(candidate);
      return `
        <button class="candidate-button ${candidate.id === selectedId ? "active" : ""}" data-candidate-id="${candidate.id}">
          <strong>${escapeHtml(candidate.name)}</strong>
          <span class="candidate-row-meta">
            <span>${candidateBadges(candidate) || t("Preliminar")}</span>
            ${
              admin
                ? `<span>${formatNumber(candidate.behaviorScore, 0)} ${t("comp.")}</span>`
                : `<span><i class="status-dot ${status.className}"></i> ${status.label}</span>`
            }
          </span>
        </button>
      `;
    })
    .join("");
}

function renderViewerDashboard() {
  ensureDashboardAutoRefresh();
  const rows = sortedResults();
  const selected =
    state.candidates.find((candidate) => candidate.id === state.selectedViewerCandidateId) || state.candidates[0];
  const counts = stageCounts(rows);
  const totalCompleted = rows.reduce((sum, result) => sum + Number(result.completedJurors || 0), 0);
  const totalExpected = rows.reduce((sum, result) => sum + Number(result.jurorCount || 0), 0);
  const completionPercent = totalExpected ? Math.round((totalCompleted / totalExpected) * 1000) / 10 : 0;

  app.innerHTML = `
    <div class="app-shell dashboard-shell">
      ${topbarHtml()}
      <main class="main dashboard-main">
        <section class="dashboard-hero">
          <div>
            <h1>${t("Tablero de votaciones")}</h1>
            <p>${t("Vista en vivo de resultados, categorías y candidatas.")}</p>
          </div>
          <div class="live-status">
            <span class="live-dot"></span>
            <strong>${t("En vivo")}</strong>
            <span>${formatDashboardTime(state.dashboardUpdatedAt)}</span>
          </div>
        </section>
        <section class="metric-strip">
          ${metricCard(t("Candidatas"), rows.length)}
          ${metricCard("Top 10", `${counts.top10}/${TOP10_LIMIT}`)}
          ${metricCard("Top 5", `${counts.top5}/${TOP5_LIMIT}`)}
          ${metricCard(t("Avance jurados"), `${formatNumber(completionPercent, 1)}%`)}
        </section>
        <div class="toolbar dashboard-toolbar">
          <div class="tabs">
            <button class="tab viewer-tab ${state.viewerTab === "ranking" ? "active" : ""}" data-tab="ranking">Ranking</button>
            <button class="tab viewer-tab ${state.viewerTab === "categories" ? "active" : ""}" data-tab="categories">${t("Categorías")}</button>
            <button class="tab viewer-tab ${state.viewerTab === "candidate" ? "active" : ""}" data-tab="candidate">${t("Candidata")}</button>
          </div>
        </div>
        ${state.dashboardError ? `<p class="form-error" role="alert">${escapeHtml(state.dashboardError)}</p>` : ""}
        ${
          state.viewerTab === "categories"
            ? renderViewerCategories(rows)
            : state.viewerTab === "candidate"
              ? renderViewerCandidate(selected, rows)
              : renderViewerRanking(rows)
        }
      </main>
    </div>
  `;

  bindViewerDashboardEvents();
}

function metricCard(label, value) {
  return `
    <div class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function formatDashboardTime(value) {
  if (!value) return t("Actualizando");
  return new Date(value).toLocaleTimeString(state.language === "en" ? "en-US" : "es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderViewerRanking(rows) {
  return `
    <section class="results-panel dashboard-panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${t("Puesto")}</th>
              <th>${t("Candidata")}</th>
              <th>${t("Etapa")}</th>
              <th>${t("Total")}</th>
              <th>${t("Entrevista")}</th>
              <th>Gala</th>
              <th>${t("Traje")}</th>
              <th>Speech</th>
              <th>${t("Pregunta")}</th>
              <th>${t("Comport.")}</th>
              <th>${t("Jurados")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(viewerRankingRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function viewerRankingRow(result) {
  return `
    <tr>
      <td><span class="rank">${result.rank}</span></td>
      <td><strong>${escapeHtml(result.candidateName)}</strong></td>
      <td><span class="badge-row">${candidateBadges(result) || `<span class="badge">${t("Preliminar")}</span>`}</span></td>
      <td><strong>${formatNumber(result.weightedTotal)}</strong></td>
      <td>${formatNumber(result.averages.interview)}</td>
      <td>${formatNumber(result.averages.gala)}</td>
      <td>${formatNumber(result.averages.swimsuit)}</td>
      <td>${formatNumber(result.averages.speech)}</td>
      <td>${formatNumber(result.averages.finalQuestion)}</td>
      <td>${formatNumber(result.behaviorScore)}</td>
      <td>${result.completedJurors}/${result.jurorCount}</td>
    </tr>
  `;
}

function renderViewerCategories(rows) {
  return `
    <section class="category-board-grid">
      ${DASHBOARD_CATEGORY_META.map((category) => renderCategoryBoard(category, rows)).join("")}
    </section>
  `;
}

function renderCategoryBoard(category, rows) {
  const leaders = rows
    .map((result) => ({ result, value: categoryValue(result, category.key) }))
    .filter((item) => item.value !== null)
    .sort((a, b) => b.value - a.value || a.result.order - b.result.order)
    .slice(0, 10);

  return `
    <article class="category-board">
      <div class="category-board-head">
        <h2>${escapeHtml(criterionLabel(category))}</h2>
        <span>${category.weight}%</span>
      </div>
      <div class="category-leaders">
        ${
          leaders.length
            ? leaders.map((item, index) => categoryLeaderRow(item.result, item.value, index + 1)).join("")
            : `<p class="muted-small">${t("Sin calificaciones registradas.")}</p>`
        }
      </div>
    </article>
  `;
}

function categoryValue(result, key) {
  if (key === "behavior") return scoreValue(result.behaviorScore);
  return scoreValue(result.averages?.[key]);
}

function categoryLeaderRow(result, value, position) {
  return `
    <div class="category-leader-row">
      <span>${position}</span>
      <strong>${escapeHtml(result.candidateName)}</strong>
      <em>${formatNumber(value)}</em>
    </div>
  `;
}

function renderViewerCandidate(selected, rows) {
  if (!selected) return `<div class="empty-state">${t("No hay candidatas.")}</div>`;
  const result = rows.find((item) => item.candidateId === selected.id);
  return `
    <section class="viewer-candidate-grid">
      <div class="panel">
        <div class="section-head">
          <h2>${t("Candidatas")}</h2>
          <p>${t("Ranking actual por candidata.")}</p>
        </div>
        <div class="admin-candidate-list">
          ${rows.map((item) => viewerCandidateButton(item, selected.id)).join("")}
        </div>
      </div>
      <div class="panel viewer-candidate-panel">
        <div class="candidate-head">
          <div>
            <h1>${escapeHtml(selected.name)}</h1>
            <p>${t("Puesto")} ${result?.rank ?? "-"} · ${t("Total")} ${formatNumber(result?.weightedTotal)}</p>
          </div>
          <div class="badge-row">${candidateBadges(selected) || `<span class="badge">${t("Preliminar")}</span>`}</div>
        </div>
        <div class="stage-summary">
          <span>${t("Jurados completos")}: ${result ? `${result.completedJurors}/${result.jurorCount}` : "-"}</span>
          <span>${t("Peso activo")}: ${formatNumber((result?.expectedWeight || 0) * 100, 0)}%</span>
          <span>${t("Disponible")}: ${formatNumber((result?.availableWeight || 0) * 100, 0)}%</span>
        </div>
        <div class="candidate-score-grid">
          ${viewerScoreTile(t("Entrevista"), result?.averages.interview, "30%")}
          ${viewerScoreTile("Gala", result?.averages.gala, "25%")}
          ${viewerScoreTile(t("Traje de baño"), result?.averages.swimsuit, "20%")}
          ${viewerScoreTile("Speech Top 10", result?.averages.speech, "5%")}
          ${viewerScoreTile(t("Pregunta final"), result?.averages.finalQuestion, "5%")}
          ${viewerScoreTile(t("Comportamiento"), result?.behaviorScore, "15%")}
        </div>
        ${viewerCandidateJurorTable(selected)}
      </div>
    </section>
  `;
}

function viewerCandidateButton(result, selectedId) {
  return `
    <button class="candidate-button viewer-candidate-button ${result.candidateId === selectedId ? "active" : ""}" data-candidate-id="${escapeHtml(result.candidateId)}">
      <strong>${result.rank}. ${escapeHtml(result.candidateName)}</strong>
      <span class="candidate-row-meta">
        <span>${t("Total")} ${formatNumber(result.weightedTotal)}</span>
        <span>${result.completedJurors}/${result.jurorCount} ${t("jurados")}</span>
      </span>
      <span class="badge-row">${candidateBadges(result)}</span>
    </button>
  `;
}

function viewerScoreTile(label, value, weight) {
  return `
    <div class="viewer-score-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${formatNumber(value)}</strong>
      <em>${escapeHtml(weight)}</em>
    </div>
  `;
}

function viewerCandidateJurorTable(candidate) {
  return `
    <div class="table-wrap validation-table-wrap">
      <table class="validation-table">
        <thead>
          <tr>
            <th>${t("Jurado")}</th>
            <th>${t("Entrevista")}</th>
            <th>Gala</th>
            <th>${t("Traje")}</th>
            <th>Speech</th>
            <th>${t("Pregunta")}</th>
            <th>${t("Acumulado")}</th>
            <th>${t("Estado")}</th>
          </tr>
        </thead>
        <tbody>
          ${state.jurors
            .slice()
            .sort((a, b) => a.username.localeCompare(b.username, "es"))
            .map((juror) => viewerJurorRow(candidate, juror))
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function viewerJurorRow(candidate, juror) {
  const evaluation = evaluationForJurorCandidate(juror.id, candidate.id);
  const scores = evaluation?.scores || {};
  const accumulator = scoreAccumulator(candidate, scores);
  const activeKeys = activeJurorScoreMeta(candidate).map((criterion) => criterion.key);
  const presentKeys = activeKeys.filter((key) => scoreValue(scores[key]) !== null);
  const status = presentKeys.length === activeKeys.length
    ? { label: t("Completa"), className: "done" }
    : presentKeys.length > 0
      ? { label: t("Parcial"), className: "partial" }
      : { label: t("Pendiente"), className: "" };

  return `
    <tr>
      <td>
        <strong>${escapeHtml(juror.name)}</strong>
        <div class="muted-small">${escapeHtml(juror.username)}</div>
      </td>
      ${JUROR_SCORE_META.map((criterion) => validationScoreCell(candidate, scores, criterion)).join("")}
      <td><strong>${formatNumber(accumulator.accumulated)} / ${formatNumber(accumulator.maxPoints, 0)}</strong></td>
      <td><span class="status-pill ${status.className}">${status.label}</span></td>
    </tr>
  `;
}

function bindViewerDashboardEvents() {
  bindLanguageToggle(renderViewerDashboard);

  document.querySelector("#logout-button")?.addEventListener("click", async () => {
    stopDashboardAutoRefresh();
    await api("/api/logout", { method: "POST", body: "{}" });
    renderLogin();
  });

  document.querySelectorAll(".viewer-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.viewerTab = button.dataset.tab;
      state.dashboardError = "";
      renderViewerDashboard();
    });
  });

  document.querySelectorAll(".viewer-candidate-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedViewerCandidateId = button.dataset.candidateId;
      renderViewerDashboard();
    });
  });
}

function renderJuror() {
  const filtered = state.candidates.filter((candidate) =>
    candidate.name.toLowerCase().includes(state.search.toLowerCase()),
  );
  const selected =
    state.candidates.find((candidate) => candidate.id === state.selectedCandidateId) || state.candidates[0];
  if (!selected) {
    app.innerHTML = `${topbarHtml()}<main class="main"><div class="empty-state">${t("No hay candidatas.")}</div></main>`;
    return;
  }
  const evaluation = evaluationFor(selected.id);
  const scores = evaluation?.scores || {};
  const openKeys = requiredKeys(selected).filter((key) => typeof scores[key] !== "number");
  const canSubmit = openKeys.length > 0;

  app.innerHTML = `
    <div class="app-shell">
      ${topbarHtml()}
      <div class="workspace">
        <aside class="sidebar">
          <input class="search-input" id="candidate-search" value="${escapeHtml(state.search)}" placeholder="${t("Buscar candidata")}" />
          <div class="candidate-list">${renderCandidateList(filtered, selected.id)}</div>
        </aside>
        <main class="main">
          <div class="content-grid">
            <section class="panel">
              <div class="candidate-head">
                <div>
                  <h1>${escapeHtml(selected.name)}</h1>
                  <p>${t("Calificación de 1 a 100")}</p>
                </div>
                <div class="badge-row">${candidateBadges(selected) || `<span class="badge">${t("Preliminar")}</span>`}</div>
              </div>
              <form id="score-form" class="score-form">
                <div class="score-grid">
                  ${scoreField("interview", t("Entrevista"), scores.interview, 30)}
                  ${scoreField("gala", "Gala", scores.gala, 25)}
                  ${scoreField("swimsuit", t("Traje de baño"), scores.swimsuit, 20)}
                  ${selected.isTop10 ? scoreField("speech", "Speech Top 10", scores.speech, 5) : ""}
                  ${selected.isTop5 ? scoreField("finalQuestion", t("Pregunta final Top 5"), scores.finalQuestion, 5) : ""}
                </div>
                <button id="score-submit-button" type="submit" ${canSubmit ? "" : "disabled"}>${canSubmit ? t("Guardar criterios llenos") : t("Calificación cerrada")}</button>
                <p class="locked-note">${
                  canSubmit
                    ? t("Puedes guardar un criterio por separado o varios a la vez. Todo criterio enviado queda bloqueado.")
                    : t("Esta candidata ya fue calificada en la etapa actual.")
                }</p>
                <p id="save-message" class="save-message" aria-live="polite"></p>
                <p id="score-error" class="form-error" role="alert"></p>
              </form>
            </section>
            <aside class="panel">
              <div class="weights-head">
                <h2>${t("Pesos")}</h2>
                <span>${t("Jurado")}</span>
              </div>
              ${accumulatorHtml(selected, scores)}
              <div class="weight-list">
                ${weightRow(t("Entrevista"), "30%")}
                ${weightRow("Gala", "25%")}
                ${weightRow(t("Traje de baño"), "20%")}
                ${weightRow("Speech Top 10", "5%")}
                ${weightRow(t("Pregunta final Top 5"), "5%")}
                ${weightRow(t("Comportamiento"), "15%")}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  `;

  bindJurorEvents(selected);
}

function scoreField(name, label, value, weight) {
  const locked = typeof value === "number";
  return `
    <div class="score-input ${locked ? "locked" : ""}">
      <label for="score-${name}">${escapeHtml(label)} · ${weight}%</label>
      <div class="score-control">
        <input id="score-${name}" class="score-value-input" name="${name}" type="text" inputmode="decimal" autocomplete="off" pattern="[0-9]+([,.][0-9]+)?" value="${value ?? ""}" ${locked ? "disabled" : ""} />
        ${
          locked
            ? `<span class="locked-chip">${t("Guardado")}</span>`
            : `<button type="button" class="mini-save" data-score-key="${name}">${t("Guardar")}</button>`
        }
      </div>
    </div>
  `;
}

function weightRow(label, value) {
  return `
    <div class="weight-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function currentScoreValues(selected) {
  const scores = { ...(evaluationFor(selected.id)?.scores || {}) };
  document.querySelectorAll("#score-form input[name]").forEach((input) => {
    if (input.disabled) return;
    if (input.value === "") delete scores[input.name];
    else scores[input.name] = input.value;
  });
  return scores;
}

function updateScoreAccumulator(selected) {
  const accumulator = scoreAccumulator(selected, currentScoreValues(selected));
  const total = document.querySelector("#score-accumulator-total");
  const detail = document.querySelector("#score-accumulator-detail");
  const bar = document.querySelector("#score-accumulator-bar");
  if (total) {
    total.textContent = `${formatNumber(accumulator.accumulated)} / ${formatNumber(accumulator.maxPoints, 0)}`;
  }
  if (detail) {
    detail.textContent = `${accumulator.completed}/${accumulator.totalCriteria} ${t("criterios")} · ${formatNumber(accumulator.percent, 1)}%`;
  }
  if (bar) {
    bar.style.width = `${accumulator.percent}%`;
  }
}

function bindJurorEvents(selected) {
  bindScoreInputGuards(document.querySelector("#score-form"));

  document.querySelector("#candidate-search")?.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderJuror();
  });

  document.querySelectorAll(".candidate-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCandidateId = button.dataset.candidateId;
      renderJuror();
    });
  });

  document.querySelectorAll(".mini-save").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.dataset.scoreKey;
      const input = document.querySelector(`[name="${key}"]`);
      await submitScores(selected, { [key]: input?.value ?? "" }, t("Criterio guardado."), {
        trigger: button,
        loadingMessage: t("Guardando criterio..."),
      });
    });
  });

  document.querySelectorAll("#score-form input[name]").forEach((input) => {
    input.addEventListener("input", () => updateScoreAccumulator(selected));
  });

  document.querySelector("#score-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const scores = Object.fromEntries(
      requiredKeys(selected)
        .map((key) => [key, data.get(key)])
        .filter(([, value]) => value !== null && value !== ""),
    );
    await submitScores(selected, scores, t("Criterios guardados."), {
      trigger: form.querySelector("#score-submit-button"),
      loadingMessage: t("Guardando calificación..."),
    });
  });
}

function startJurorSaveFeedback({ trigger, loadingMessage } = {}) {
  const form = document.querySelector("#score-form");
  const saveMessage = document.querySelector("#save-message");
  if (!form) return;

  form.classList.add("is-saving");
  form.setAttribute("aria-busy", "true");
  if (saveMessage) {
    saveMessage.textContent = loadingMessage || t("Guardando...");
    saveMessage.classList.add("is-loading");
  }

  form.querySelectorAll("button, input").forEach((control) => {
    if (!control.disabled) control.dataset.enabledBeforeSave = "true";
    control.disabled = true;
  });

  if (trigger) {
    trigger.dataset.originalHtml = trigger.innerHTML;
    trigger.classList.add("is-loading");
    trigger.innerHTML = `<span class="button-spinner" aria-hidden="true"></span><span>${t("Guardando...")}</span>`;
  }
}

function restoreJurorSaveFeedback() {
  const form = document.querySelector("#score-form");
  const saveMessage = document.querySelector("#save-message");
  if (!form) return;

  form.classList.remove("is-saving");
  form.removeAttribute("aria-busy");
  if (saveMessage) {
    saveMessage.classList.remove("is-loading");
  }

  form.querySelectorAll("[data-enabled-before-save]").forEach((control) => {
    control.disabled = false;
    delete control.dataset.enabledBeforeSave;
  });

  form.querySelectorAll("button[data-original-html]").forEach((button) => {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
    button.classList.remove("is-loading", "is-saved");
  });
}

function completeJurorSaveFeedback(trigger) {
  const form = document.querySelector("#score-form");
  const saveMessage = document.querySelector("#save-message");
  if (form) {
    form.classList.remove("is-saving");
    form.removeAttribute("aria-busy");
  }
  if (saveMessage) {
    saveMessage.classList.remove("is-loading");
  }
  if (trigger) {
    trigger.classList.remove("is-loading");
    trigger.classList.add("is-saved");
    trigger.innerHTML = t("Guardado");
  }
}

async function submitScores(selected, scores, successMessage, feedbackOptions = {}) {
  const saveMessage = document.querySelector("#save-message");
  const error = document.querySelector("#score-error");
  saveMessage.textContent = "";
  error.textContent = "";
  startJurorSaveFeedback(feedbackOptions);

  try {
    const payload = await api("/api/evaluations", {
      method: "POST",
      body: JSON.stringify({
        candidateId: selected.id,
        scores,
      }),
    });
    const index = state.evaluations.findIndex((evaluation) => evaluation.id === payload.evaluation.id);
    if (index >= 0) state.evaluations[index] = payload.evaluation;
    else state.evaluations.push(payload.evaluation);
    saveMessage.textContent = payload.evaluation.arcgis?.status === "error"
      ? t("Guardada localmente. ArcGIS quedó pendiente.")
      : successMessage;
    completeJurorSaveFeedback(feedbackOptions.trigger);
    setTimeout(() => renderJuror(), 900);
  } catch (caught) {
    restoreJurorSaveFeedback();
    error.textContent = caught.message;
  }
}

function renderSystemAdmin() {
  const selected =
    state.candidates.find((candidate) => candidate.id === state.selectedSystemCandidateId) || state.candidates[0];
  app.innerHTML = `
    <div class="app-shell">
      ${topbarHtml()}
      <main class="main">
        <div class="toolbar">
          <div class="tabs">
            <button class="tab system-tab ${state.systemTab === "names" ? "active" : ""}" data-tab="names">${t("Configuración")}</button>
            <button class="tab system-tab ${state.systemTab === "validation" ? "active" : ""}" data-tab="validation">${t("Validación")}</button>
            <button class="tab system-tab ${state.systemTab === "corrections" ? "active" : ""}" data-tab="corrections">${t("Correcciones")}</button>
          </div>
        </div>
        ${
          state.systemTab === "validation"
            ? renderSystemValidation(selected)
            : state.systemTab === "corrections"
              ? renderSystemCorrections()
              : renderSystemSettings()
        }
      </main>
    </div>
  `;
  bindSystemAdminEvents();
}

function renderSystemSettings() {
  return `
    <section class="system-grid">
      <div class="panel">
        <div class="section-head">
          <h2>${t("Candidatas")}</h2>
          <p>${t("Nombres visibles para jurados y resultados.")}</p>
        </div>
        <div class="name-edit-list">
          ${state.candidates
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((candidate) =>
              nameEditRow("candidate", candidate.id, `${t("Candidata")} ${candidate.order}`, candidate.name),
            )
            .join("")}
        </div>
      </div>
      <div class="panel">
        <div class="section-head">
          <h2>${t("Jurados")}</h2>
          <p>${t("Nombres internos de cada cuenta de jurado.")}</p>
        </div>
        <div class="name-edit-list">
          ${state.jurors
            .slice()
            .sort((a, b) => a.username.localeCompare(b.username, "es"))
            .map((juror) => nameEditRow("juror", juror.id, juror.username, juror.name))
            .join("")}
        </div>
      </div>
      <div class="panel password-panel">
        <div class="section-head">
          <h2>${t("Contraseñas")}</h2>
          <p>${t("Actualiza accesos de organización, jurados y tu usuario de sistema.")}</p>
        </div>
        <div class="password-edit-list">
          ${passwordManagedRows()}
        </div>
      </div>
      <div class="panel danger-panel">
        <div class="section-head">
          <h2>${t("Pruebas")}</h2>
          <p>${t("Borra calificaciones, comportamiento y etapas; conserva nombres y usuarios.")}</p>
        </div>
        <button id="reset-results-button" class="danger-button" type="button">${t("Borrar resultados")}</button>
        <p id="reset-results-message" class="save-message"></p>
        <p id="reset-results-error" class="form-error" role="alert"></p>
      </div>
    </section>
  `;
}

function renderSystemCorrections() {
  const rows = correctionRows();
  return `
    <section class="panel corrections-panel">
      <div class="section-head">
        <h2>${t("Correcciones")}</h2>
        <p>${t("Borra una calificación individual para que el jurado pueda volver a registrarla.")}</p>
      </div>
      <p id="system-validation-message" class="save-message">${escapeHtml(state.systemValidationMessage)}</p>
      <p id="system-validation-error" class="form-error" role="alert">${escapeHtml(state.systemValidationError)}</p>
      ${
        rows.length
          ? `<div class="correction-list">${rows.map(correctionRowHtml).join("")}</div>`
          : `<div class="empty-state">${t("No hay calificaciones registradas para corregir.")}</div>`
      }
    </section>
  `;
}

function correctionRows() {
  return state.evaluations
    .map((evaluation) => {
      const candidate = state.candidates.find((item) => item.id === evaluation.candidateId);
      const juror = state.jurors.find((item) => item.id === evaluation.jurorId);
      if (!candidate || !juror) return null;
      const accumulator = scoreAccumulator(candidate, evaluation.scores || {});
      const activeKeys = activeJurorScoreMeta(candidate).map((criterion) => criterion.key);
      const presentKeys = activeKeys.filter((key) => scoreValue(evaluation.scores?.[key]) !== null);
      return {
        evaluation,
        candidate,
        juror,
        accumulator,
        status: presentKeys.length === activeKeys.length
          ? { label: t("Completa"), className: "done" }
          : presentKeys.length > 0
            ? { label: t("Parcial"), className: "partial" }
            : { label: t("Pendiente"), className: "" },
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.candidate.order - b.candidate.order || a.juror.username.localeCompare(b.juror.username, "es"));
}

function correctionRowHtml(item) {
  return `
    <article class="correction-row">
      <div>
        <strong>${item.candidate.order}. ${escapeHtml(item.candidate.name)}</strong>
        <span>${escapeHtml(item.juror.name)} · ${escapeHtml(item.juror.username)}</span>
      </div>
      <div class="correction-row-meta">
        <span class="status-pill ${item.status.className}">${item.status.label}</span>
        <strong>${formatNumber(item.accumulator.accumulated)} / ${formatNumber(item.accumulator.maxPoints, 0)}</strong>
        <span>${formatCorrectionDate(item.evaluation.updatedAt)}</span>
      </div>
      ${deleteEvaluationButton(item.evaluation, item.juror, item.candidate)}
    </article>
  `;
}

function formatCorrectionDate(value) {
  if (!value) return t("Sin fecha");
  return new Date(value).toLocaleString(state.language === "en" ? "en-US" : "es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderSystemValidation(selected) {
  if (!selected) return `<div class="empty-state">${t("No hay candidatas para validar.")}</div>`;
  const result = state.results.find((item) => item.candidateId === selected.id);
  return `
    <section class="system-validation-grid">
      <div class="panel">
        <div class="section-head">
          <h2>${t("Candidatas")}</h2>
          <p>${t("Selecciona una candidata para revisar cada jurado.")}</p>
        </div>
        <div class="admin-candidate-list">
          ${renderValidationCandidateList(selected.id)}
        </div>
      </div>
      <div class="panel validation-panel">
        <div class="candidate-head">
          <div>
            <h1>${escapeHtml(selected.name)}</h1>
            <p>${t("Calificaciones registradas por jurado")}</p>
          </div>
          <div class="badge-row">${candidateBadges(selected) || `<span class="badge">${t("Preliminar")}</span>`}</div>
        </div>
        <div class="stage-summary">
          <span>${t("Puesto")}: ${result?.rank ?? "-"}</span>
          <span>${t("Total")}: ${formatNumber(result?.weightedTotal)}</span>
          <span>${t("Jurados completos")}: ${result ? `${result.completedJurors}/${result.jurorCount}` : "-"}</span>
        </div>
        <p id="system-validation-message" class="save-message">${escapeHtml(state.systemValidationMessage)}</p>
        <p id="system-validation-error" class="form-error" role="alert">${escapeHtml(state.systemValidationError)}</p>
        ${validationTableHtml(selected)}
      </div>
    </section>
  `;
}

function renderValidationCandidateList(selectedId) {
  return state.candidates
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((candidate) => {
      const result = state.results.find((item) => item.candidateId === candidate.id);
      return `
        <button class="candidate-button system-validation-candidate ${candidate.id === selectedId ? "active" : ""}" data-candidate-id="${escapeHtml(candidate.id)}">
          <strong>${candidate.order}. ${escapeHtml(candidate.name)}</strong>
          <span class="candidate-row-meta">
            <span>${t("Total")} ${formatNumber(result?.weightedTotal)}</span>
            <span>${result ? `${result.completedJurors}/${result.jurorCount}` : "0/0"} ${t("jurados")}</span>
          </span>
          <span class="badge-row">${candidateBadges(candidate)}</span>
        </button>
      `;
    })
    .join("");
}

function validationTableHtml(candidate) {
  return `
    <div class="table-wrap validation-table-wrap">
      <table class="validation-table">
        <thead>
          <tr>
            <th>${t("Jurado")}</th>
            <th>${t("Entrevista")}</th>
            <th>Gala</th>
            <th>${t("Traje")}</th>
            <th>Speech</th>
            <th>${t("Pregunta")}</th>
            <th>${t("Acumulado")}</th>
            <th>${t("Estado")}</th>
            <th>${t("Acción")}</th>
          </tr>
        </thead>
        <tbody>
          ${state.jurors
            .slice()
            .sort((a, b) => a.username.localeCompare(b.username, "es"))
            .map((juror) => validationRowHtml(candidate, juror))
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function evaluationForJurorCandidate(jurorId, candidateId) {
  return state.evaluations.find(
    (evaluation) => evaluation.jurorId === jurorId && evaluation.candidateId === candidateId,
  );
}

function validationRowHtml(candidate, juror) {
  const evaluation = evaluationForJurorCandidate(juror.id, candidate.id);
  const scores = evaluation?.scores || {};
  const accumulator = scoreAccumulator(candidate, scores);
  const activeKeys = activeJurorScoreMeta(candidate).map((criterion) => criterion.key);
  const presentKeys = activeKeys.filter((key) => scoreValue(scores[key]) !== null);
  const status = presentKeys.length === activeKeys.length
    ? { label: t("Completa"), className: "done" }
    : presentKeys.length > 0
      ? { label: t("Parcial"), className: "partial" }
      : { label: t("Pendiente"), className: "" };
  return `
    <tr>
      <td>
        <strong>${escapeHtml(juror.name)}</strong>
        <div class="muted-small">${escapeHtml(juror.username)}</div>
      </td>
      ${JUROR_SCORE_META.map((criterion) => validationScoreCell(candidate, scores, criterion)).join("")}
      <td><strong>${formatNumber(accumulator.accumulated)} / ${formatNumber(accumulator.maxPoints, 0)}</strong></td>
      <td><span class="status-pill ${status.className}">${status.label}</span></td>
      <td>${evaluation ? deleteEvaluationButton(evaluation, juror, candidate) : `<span class="muted-cell">${t("Sin registro")}</span>`}</td>
    </tr>
  `;
}

function deleteEvaluationButton(evaluation, juror, candidate) {
  return `
    <button
      type="button"
      class="delete-evaluation-button"
      data-evaluation-id="${escapeHtml(evaluation.id)}"
      data-juror-name="${escapeHtml(juror.name)}"
      data-candidate-name="${escapeHtml(candidate.name)}"
    >
      ${t("Borrar")}
    </button>
  `;
}

function validationScoreCell(candidate, scores, criterion) {
  const inactive = criterion.requires && !candidate[criterion.requires];
  if (inactive) return `<td class="muted-cell">${t("No aplica")}</td>`;
  return `<td>${formatNumber(scores?.[criterion.key])}</td>`;
}

function passwordManagedRows() {
  const roleOrder = { system_admin: 0, admin: 1, viewer: 2, juror: 3 };
  return (state.passwordUsers || [])
    .slice()
    .sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) || a.username.localeCompare(b.username, "es"))
    .map(passwordEditRow)
    .join("");
}

function passwordEditRow(user) {
  return `
    <form class="password-edit-form" data-id="${escapeHtml(user.id)}">
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <span>${escapeHtml(user.username)} · ${roleLabel(user.role)}</span>
      </div>
      <label>
        ${t("Nueva contraseña")}
        <input name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required />
      </label>
      <label>
        ${t("Confirmar")}
        <input name="confirmPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" required />
      </label>
      <button type="submit">${t("Actualizar")}</button>
      <p class="save-message"></p>
      <p class="form-error" role="alert"></p>
    </form>
  `;
}

function nameEditRow(kind, id, label, value) {
  return `
    <form class="name-edit-form" data-kind="${kind}" data-id="${escapeHtml(id)}">
      <label>
        <span>${escapeHtml(label)}</span>
        <input name="name" value="${escapeHtml(value)}" maxlength="80" required />
      </label>
      <button type="submit">${t("Guardar")}</button>
      <p class="save-message"></p>
      <p class="form-error" role="alert"></p>
    </form>
  `;
}

function bindSystemAdminEvents() {
  document.querySelectorAll(".system-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.systemTab = button.dataset.tab;
      renderSystemAdmin();
    });
  });

  document.querySelectorAll(".system-validation-candidate").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSystemCandidateId = button.dataset.candidateId;
      state.systemValidationMessage = "";
      state.systemValidationError = "";
      renderSystemAdmin();
    });
  });

  document.querySelectorAll(".delete-evaluation-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const jurorName = button.dataset.jurorName || t("este jurado");
      const candidateName = button.dataset.candidateName || t("esta candidata");
      const confirmed = window.confirm(
        t("Se borrará la calificación de {jurorName} para {candidateName}. El jurado podrá volver a calificarla.", {
          jurorName,
          candidateName,
        }),
      );
      if (!confirmed) return;

      button.disabled = true;
      state.systemValidationMessage = "";
      state.systemValidationError = "";

      try {
        const payload = await api(`/api/system/evaluations/${encodeURIComponent(button.dataset.evaluationId)}`, {
          method: "DELETE",
        });
        state.evaluations = state.evaluations.filter((evaluation) => evaluation.id !== payload.evaluationId);
        state.results = sortedResults(payload.results);
        state.systemValidationMessage = t("Calificación borrada. El jurado puede volver a registrarla.");
      } catch (caught) {
        state.systemValidationError = caught.message;
      }

      renderSystemAdmin();
    });
  });

  document.querySelector("#reset-results-button")?.addEventListener("click", async () => {
    const message = document.querySelector("#reset-results-message");
    const error = document.querySelector("#reset-results-error");
    message.textContent = "";
    error.textContent = "";

    const confirmed = window.confirm(
      t("Esto borrará las calificaciones y reiniciará comportamiento, Top 10 y Top 5. Los nombres se conservan."),
    );
    if (!confirmed) return;

    try {
      const payload = await api("/api/system/reset-results", {
        method: "POST",
        body: "{}",
      });
      state.candidates = payload.candidates;
      state.evaluations = [];
      state.results = [];
      message.textContent = t("Resultados borrados. La prueba puede empezar de nuevo.");
    } catch (caught) {
      error.textContent = caught.message;
    }
  });

  document.querySelectorAll(".password-edit-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const currentForm = event.currentTarget;
      const data = new FormData(currentForm);
      const password = String(data.get("password") || "");
      const confirmPassword = String(data.get("confirmPassword") || "");
      const message = currentForm.querySelector(".save-message");
      const error = currentForm.querySelector(".form-error");
      message.textContent = "";
      error.textContent = "";

      if (password !== confirmPassword) {
        error.textContent = t("Las contraseñas no coinciden.");
        return;
      }

      try {
        await api(`/api/system/users/${encodeURIComponent(currentForm.dataset.id)}/password`, {
          method: "POST",
          body: JSON.stringify({ password }),
        });
        currentForm.reset();
        message.textContent = t("Contraseña actualizada.");
      } catch (caught) {
        error.textContent = caught.message;
      }
    });
  });

  document.querySelectorAll(".name-edit-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const currentForm = event.currentTarget;
      const data = new FormData(currentForm);
      const kind = currentForm.dataset.kind;
      const id = currentForm.dataset.id;
      const message = currentForm.querySelector(".save-message");
      const error = currentForm.querySelector(".form-error");
      message.textContent = "";
      error.textContent = "";

      try {
        const path = kind === "candidate"
          ? `/api/system/candidates/${encodeURIComponent(id)}`
          : `/api/system/jurors/${encodeURIComponent(id)}`;
        const payload = await api(path, {
          method: "POST",
          body: JSON.stringify({ name: data.get("name") }),
        });

        if (kind === "candidate") {
          const index = state.candidates.findIndex((candidate) => candidate.id === payload.candidate.id);
          if (index >= 0) state.candidates[index] = payload.candidate;
        } else {
          const index = state.jurors.findIndex((juror) => juror.id === payload.juror.id);
          if (index >= 0) state.jurors[index] = payload.juror;
        }

        message.textContent = t("Nombre guardado.");
      } catch (caught) {
        error.textContent = caught.message;
      }
    });
  });
}

function renderAdmin() {
  const selected =
    state.candidates.find((candidate) => candidate.id === state.selectedAdminCandidateId) || state.candidates[0];
  app.innerHTML = `
    <div class="app-shell">
      ${topbarHtml()}
      <main class="main">
        <div class="toolbar">
          <div class="tabs">
            <button class="tab ${state.adminTab === "results" ? "active" : ""}" data-tab="results">${t("Resultados")}</button>
            <button class="tab ${state.adminTab === "setup" ? "active" : ""}" data-tab="setup">${t("Organización")}</button>
          </div>
          <a class="export-link" href="/api/results.csv">${t("Exportar CSV")}</a>
        </div>
        ${
          state.adminTab === "results"
            ? renderResultsTable()
            : renderAdminSetup(selected)
        }
      </main>
    </div>
  `;
  bindAdminEvents();
}

function renderAdminSetup(selected) {
  if (!selected) return `<div class="empty-state">${t("No hay candidatas.")}</div>`;
  const counts = stageCounts(state.candidates);
  const top10Disabled = !selected.isTop10 && counts.top10 >= TOP10_LIMIT ? "disabled" : "";
  const top5Disabled =
    !selected.isTop5 && (counts.top5 >= TOP5_LIMIT || (!selected.isTop10 && counts.top10 >= TOP10_LIMIT))
      ? "disabled"
      : "";
  return `
    <section class="admin-grid">
      <div class="panel">
        <h2>${t("Candidatas")}</h2>
        <div class="admin-candidate-list">
          ${renderCandidateList(state.candidates, selected.id, true)}
        </div>
      </div>
      <div class="panel">
        <div class="candidate-head">
          <div>
            <h1>${escapeHtml(selected.name)}</h1>
            <p>${t("Estado y puntaje de organización")}</p>
          </div>
          <div class="badge-row">${candidateBadges(selected) || `<span class="badge">${t("Preliminar")}</span>`}</div>
        </div>
        <div class="stage-summary">
          <span>Top 10: ${counts.top10}/${TOP10_LIMIT}</span>
          <span>Top 5: ${counts.top5}/${TOP5_LIMIT}</span>
        </div>
        <form id="admin-edit-form" class="admin-edit-form">
          <label>
            ${t("Comportamiento / informe · 15%")}
            <input name="behaviorScore" class="score-value-input" type="text" inputmode="decimal" autocomplete="off" pattern="[0-9]+([,.][0-9]+)?" value="${selected.behaviorScore ?? ""}" />
          </label>
          <label class="checkbox-row">
            <input name="isTop10" type="checkbox" ${selected.isTop10 ? "checked" : ""} ${top10Disabled} />
            Top 10
          </label>
          <label class="checkbox-row">
            <input name="isTop5" type="checkbox" ${selected.isTop5 ? "checked" : ""} ${top5Disabled} />
            Top 5
          </label>
          <button type="submit">${t("Guardar cambios")}</button>
          <p id="admin-message" class="save-message"></p>
          <p id="admin-error" class="form-error" role="alert"></p>
        </form>
      </div>
    </section>
  `;
}

function renderResultsTable() {
  const rows = sortedResults();
  const counts = stageCounts(rows);
  return `
    <section class="results-panel">
      <div class="stage-summary">
        <span>Top 10: ${counts.top10}/${TOP10_LIMIT}</span>
        <span>Top 5: ${counts.top5}/${TOP5_LIMIT}</span>
      </div>
      <p id="admin-results-message" class="save-message">${escapeHtml(state.adminResultMessage)}</p>
      <p id="admin-results-error" class="form-error" role="alert">${escapeHtml(state.adminResultError)}</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${t("Puesto")}</th>
              <th>${t("Candidata")}</th>
              <th>${t("Selección")}</th>
              <th>${t("Entrevista")}</th>
              <th>Gala</th>
              <th>${t("Traje")}</th>
              <th>Speech</th>
              <th>${t("Pregunta")}</th>
              <th>${t("Comport.")}</th>
              <th>${t("Total")}</th>
              <th>${t("Jurados")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((result) => resultRow(result, counts)).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function resultRow(result, counts) {
  const top10Disabled = !result.isTop10 && counts.top10 >= TOP10_LIMIT ? "disabled" : "";
  const top5Disabled =
    !result.isTop5 && (counts.top5 >= TOP5_LIMIT || (!result.isTop10 && counts.top10 >= TOP10_LIMIT))
      ? "disabled"
      : "";
  return `
    <tr>
      <td><span class="rank">${result.rank}</span></td>
      <td>
        <strong>${escapeHtml(result.candidateName)}</strong>
        <div class="badge-row">${candidateBadges(result)}</div>
      </td>
      <td>
        <div class="result-stage-controls">
          <label>
            <input
              class="result-stage-toggle"
              data-candidate-id="${escapeHtml(result.candidateId)}"
              data-stage="isTop10"
              type="checkbox"
              ${result.isTop10 ? "checked" : ""}
              ${top10Disabled}
            />
            Top 10
          </label>
          <label>
            <input
              class="result-stage-toggle"
              data-candidate-id="${escapeHtml(result.candidateId)}"
              data-stage="isTop5"
              type="checkbox"
              ${result.isTop5 ? "checked" : ""}
              ${top5Disabled}
            />
            Top 5
          </label>
        </div>
      </td>
      <td>${formatNumber(result.averages.interview)}</td>
      <td>${formatNumber(result.averages.gala)}</td>
      <td>${formatNumber(result.averages.swimsuit)}</td>
      <td>${formatNumber(result.averages.speech)}</td>
      <td>${formatNumber(result.averages.finalQuestion)}</td>
      <td>${formatNumber(result.behaviorScore)}</td>
      <td><strong>${formatNumber(result.weightedTotal)}</strong></td>
      <td>${result.completedJurors}/${result.jurorCount}</td>
    </tr>
  `;
}

function nextStagePayload(result, stage, checked) {
  let isTop10 = Boolean(result.isTop10);
  let isTop5 = Boolean(result.isTop5);

  if (stage === "isTop10") {
    isTop10 = checked;
    if (!isTop10) isTop5 = false;
  }

  if (stage === "isTop5") {
    isTop5 = checked;
    if (isTop5) isTop10 = true;
  }

  return { isTop10, isTop5 };
}

function bindAdminEvents() {
  bindScoreInputGuards(document.querySelector("#admin-edit-form"));

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminTab = button.dataset.tab;
      state.adminResultMessage = "";
      state.adminResultError = "";
      renderAdmin();
    });
  });

  document.querySelectorAll(".candidate-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedAdminCandidateId = button.dataset.candidateId;
      renderAdmin();
    });
  });

  document.querySelectorAll(".result-stage-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", async (event) => {
      const control = event.currentTarget;
      const result = state.results.find((item) => item.candidateId === control.dataset.candidateId);
      if (!result) return;

      control.disabled = true;
      state.adminResultMessage = "";
      state.adminResultError = "";

      try {
        const payload = await api(`/api/admin/candidates/${encodeURIComponent(result.candidateId)}`, {
          method: "POST",
          body: JSON.stringify(nextStagePayload(result, control.dataset.stage, control.checked)),
        });
        updateCandidateState(payload.candidate, payload.results);
        state.adminResultMessage = t("Selección guardada.");
      } catch (caught) {
        state.adminResultError = caught.message;
      }

      renderAdmin();
    });
  });

  document.querySelector("#admin-edit-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = state.candidates.find((candidate) => candidate.id === state.selectedAdminCandidateId);
    const data = new FormData(event.currentTarget);
    const message = document.querySelector("#admin-message");
    const error = document.querySelector("#admin-error");
    message.textContent = "";
    error.textContent = "";

    try {
      const payload = await api(`/api/admin/candidates/${encodeURIComponent(selected.id)}`, {
        method: "POST",
        body: JSON.stringify({
          behaviorScore: data.get("behaviorScore"),
          isTop10: data.has("isTop10"),
          isTop5: data.has("isTop5"),
        }),
      });
      updateCandidateState(payload.candidate, payload.results);
      message.textContent = t("Cambios guardados.");
      setTimeout(() => renderAdmin(), 800);
    } catch (caught) {
      error.textContent = caught.message;
    }
  });
}

loadApp();
