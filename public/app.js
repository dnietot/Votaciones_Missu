const app = document.querySelector("#app");
const loginTemplate = document.querySelector("#login-template");

const state = {
  user: null,
  criteria: [],
  weights: {},
  candidates: [],
  evaluations: [],
  jurors: [],
  results: [],
  selectedCandidateId: null,
  selectedAdminCandidateId: null,
  search: "",
  adminTab: "results",
};

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
  return Number(value).toLocaleString("es-CO", {
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : digits,
    maximumFractionDigits: digits,
  });
}

function roleLabel(role) {
  if (role === "admin") return "Organización";
  if (role === "system_admin") return "Administrador del sistema";
  return "Jurado";
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
    throw new Error(payload.error || "No se pudo completar la acción.");
  }
  return payload;
}

function candidateBadges(candidate) {
  const badges = [];
  if (candidate.isTop10) badges.push('<span class="badge top10">Top 10</span>');
  if (candidate.isTop5) badges.push('<span class="badge top5">Top 5</span>');
  return badges.join("");
}

function requiredKeys(candidate) {
  const keys = ["interview", "gala", "swimsuit"];
  if (candidate.isTop10) keys.push("speech");
  if (candidate.isTop5) keys.push("finalQuestion");
  return keys;
}

function evaluationFor(candidateId) {
  return state.evaluations.find((evaluation) => evaluation.candidateId === candidateId);
}

function evaluationStatus(candidate) {
  const evaluation = evaluationFor(candidate.id);
  if (!evaluation) return { label: "Pendiente", className: "" };
  const keys = requiredKeys(candidate);
  const present = keys.filter((key) => typeof evaluation.scores?.[key] === "number");
  if (present.length === keys.length) return { label: "Guardada", className: "done" };
  if (present.length > 0) return { label: "Parcial", className: "partial" };
  return { label: "Pendiente", className: "" };
}

function selectDefaultCandidate() {
  if (!state.selectedCandidateId && state.candidates.length) {
    state.selectedCandidateId = state.candidates[0].id;
  }
  if (!state.selectedAdminCandidateId && state.candidates.length) {
    state.selectedAdminCandidateId = state.candidates[0].id;
  }
}

async function loadApp() {
  try {
    const payload = await api("/api/bootstrap");
    Object.assign(state, payload);
    selectDefaultCandidate();
    renderApp();
  } catch (error) {
    renderLogin();
  }
}

function renderLogin() {
  app.innerHTML = "";
  app.appendChild(loginTemplate.content.cloneNode(true));
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
        <button class="ghost-button" id="logout-button">Salir</button>
      </div>
    </header>
  `;
}

function renderApp() {
  if (state.user.role === "admin") {
    renderAdmin();
  } else if (state.user.role === "system_admin") {
    renderSystemAdmin();
  } else {
    renderJuror();
  }

  document.querySelector("#logout-button")?.addEventListener("click", async () => {
    await api("/api/logout", { method: "POST", body: "{}" });
    renderLogin();
  });
}

function renderCandidateList(candidates, selectedId, admin = false) {
  return candidates
    .map((candidate) => {
      const status = admin ? null : evaluationStatus(candidate);
      return `
        <button class="candidate-button ${candidate.id === selectedId ? "active" : ""}" data-candidate-id="${candidate.id}">
          <strong>${escapeHtml(candidate.name)}</strong>
          <span class="candidate-row-meta">
            <span>${candidateBadges(candidate) || "Preliminar"}</span>
            ${
              admin
                ? `<span>${formatNumber(candidate.behaviorScore, 0)} comp.</span>`
                : `<span><i class="status-dot ${status.className}"></i> ${status.label}</span>`
            }
          </span>
        </button>
      `;
    })
    .join("");
}

function renderJuror() {
  const filtered = state.candidates.filter((candidate) =>
    candidate.name.toLowerCase().includes(state.search.toLowerCase()),
  );
  const selected =
    state.candidates.find((candidate) => candidate.id === state.selectedCandidateId) || state.candidates[0];
  if (!selected) {
    app.innerHTML = `${topbarHtml()}<main class="main"><div class="empty-state">No hay candidatas.</div></main>`;
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
          <input class="search-input" id="candidate-search" value="${escapeHtml(state.search)}" placeholder="Buscar candidata" />
          <div class="candidate-list">${renderCandidateList(filtered, selected.id)}</div>
        </aside>
        <main class="main">
          <div class="content-grid">
            <section class="panel">
              <div class="candidate-head">
                <div>
                  <h1>${escapeHtml(selected.name)}</h1>
                  <p>Calificación de 1 a 100</p>
                </div>
                <div class="badge-row">${candidateBadges(selected) || '<span class="badge">Preliminar</span>'}</div>
              </div>
              <form id="score-form" class="score-form">
                <div class="score-grid">
                  ${scoreField("interview", "Entrevista", scores.interview, 30)}
                  ${scoreField("gala", "Gala", scores.gala, 25)}
                  ${scoreField("swimsuit", "Traje de baño", scores.swimsuit, 20)}
                  ${selected.isTop10 ? scoreField("speech", "Speech Top 10", scores.speech, 5) : ""}
                  ${selected.isTop5 ? scoreField("finalQuestion", "Pregunta final Top 5", scores.finalQuestion, 5) : ""}
                </div>
                <button type="submit" ${canSubmit ? "" : "disabled"}>${canSubmit ? "Guardar criterios llenos" : "Calificación cerrada"}</button>
                <p class="locked-note">${
                  canSubmit
                    ? "Puedes guardar un criterio por separado o varios a la vez. Todo criterio enviado queda bloqueado."
                    : "Esta candidata ya fue calificada en la etapa actual."
                }</p>
                <p id="save-message" class="save-message"></p>
                <p id="score-error" class="form-error" role="alert"></p>
              </form>
            </section>
            <aside class="panel">
              <h2>Pesos</h2>
              <div class="weight-list">
                ${weightRow("Entrevista", "30%")}
                ${weightRow("Gala", "25%")}
                ${weightRow("Traje de baño", "20%")}
                ${weightRow("Speech Top 10", "5%")}
                ${weightRow("Pregunta final Top 5", "5%")}
                ${weightRow("Comportamiento", "15%")}
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
        <input id="score-${name}" name="${name}" type="number" min="1" max="100" step="0.01" value="${value ?? ""}" ${locked ? "disabled" : ""} />
        ${
          locked
            ? '<span class="locked-chip">Guardado</span>'
            : `<button type="button" class="mini-save" data-score-key="${name}">Guardar</button>`
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

function bindJurorEvents(selected) {
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
      await submitScores(selected, { [key]: input?.value ?? "" }, "Criterio guardado.");
    });
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
    await submitScores(selected, scores, "Criterios guardados.");
  });
}

async function submitScores(selected, scores, successMessage) {
  const saveMessage = document.querySelector("#save-message");
  const error = document.querySelector("#score-error");
  saveMessage.textContent = "";
  error.textContent = "";

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
      ? "Guardada localmente. ArcGIS quedó pendiente."
      : successMessage;
    setTimeout(() => renderJuror(), 900);
  } catch (caught) {
    error.textContent = caught.message;
  }
}

function renderSystemAdmin() {
  app.innerHTML = `
    <div class="app-shell">
      ${topbarHtml()}
      <main class="main">
        <section class="system-grid">
          <div class="panel">
            <div class="section-head">
              <h2>Candidatas</h2>
              <p>Nombres visibles para jurados y resultados.</p>
            </div>
            <div class="name-edit-list">
              ${state.candidates
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((candidate) =>
                  nameEditRow("candidate", candidate.id, `Candidata ${candidate.order}`, candidate.name),
                )
                .join("")}
            </div>
          </div>
          <div class="panel">
            <div class="section-head">
              <h2>Jurados</h2>
              <p>Nombres internos de cada cuenta de jurado.</p>
            </div>
            <div class="name-edit-list">
              ${state.jurors
                .slice()
                .sort((a, b) => a.username.localeCompare(b.username, "es"))
                .map((juror) => nameEditRow("juror", juror.id, juror.username, juror.name))
                .join("")}
            </div>
          </div>
          <div class="panel danger-panel">
            <div class="section-head">
              <h2>Pruebas</h2>
              <p>Borra calificaciones, comportamiento y etapas; conserva nombres y usuarios.</p>
            </div>
            <button id="reset-results-button" class="danger-button" type="button">Borrar resultados</button>
            <p id="reset-results-message" class="save-message"></p>
            <p id="reset-results-error" class="form-error" role="alert"></p>
          </div>
        </section>
      </main>
    </div>
  `;
  bindSystemAdminEvents();
}

function nameEditRow(kind, id, label, value) {
  return `
    <form class="name-edit-form" data-kind="${kind}" data-id="${escapeHtml(id)}">
      <label>
        <span>${escapeHtml(label)}</span>
        <input name="name" value="${escapeHtml(value)}" maxlength="80" required />
      </label>
      <button type="submit">Guardar</button>
      <p class="save-message"></p>
      <p class="form-error" role="alert"></p>
    </form>
  `;
}

function bindSystemAdminEvents() {
  document.querySelector("#reset-results-button")?.addEventListener("click", async () => {
    const message = document.querySelector("#reset-results-message");
    const error = document.querySelector("#reset-results-error");
    message.textContent = "";
    error.textContent = "";

    const confirmed = window.confirm(
      "Esto borrará las calificaciones y reiniciará comportamiento, Top 10 y Top 5. Los nombres se conservan.",
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
      message.textContent = "Resultados borrados. La prueba puede empezar de nuevo.";
    } catch (caught) {
      error.textContent = caught.message;
    }
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

        message.textContent = "Nombre guardado.";
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
            <button class="tab ${state.adminTab === "results" ? "active" : ""}" data-tab="results">Resultados</button>
            <button class="tab ${state.adminTab === "setup" ? "active" : ""}" data-tab="setup">Organización</button>
          </div>
          <a class="export-link" href="/api/results.csv">Exportar CSV</a>
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
  if (!selected) return '<div class="empty-state">No hay candidatas.</div>';
  return `
    <section class="admin-grid">
      <div class="panel">
        <h2>Candidatas</h2>
        <div class="admin-candidate-list">
          ${renderCandidateList(state.candidates, selected.id, true)}
        </div>
      </div>
      <div class="panel">
        <div class="candidate-head">
          <div>
            <h1>${escapeHtml(selected.name)}</h1>
            <p>Estado y puntaje de organización</p>
          </div>
          <div class="badge-row">${candidateBadges(selected) || '<span class="badge">Preliminar</span>'}</div>
        </div>
        <form id="admin-edit-form" class="admin-edit-form">
          <label>
            Comportamiento / informe · 15%
            <input name="behaviorScore" type="number" min="1" max="100" step="0.01" value="${selected.behaviorScore ?? ""}" />
          </label>
          <label class="checkbox-row">
            <input name="isTop10" type="checkbox" ${selected.isTop10 ? "checked" : ""} />
            Top 10
          </label>
          <label class="checkbox-row">
            <input name="isTop5" type="checkbox" ${selected.isTop5 ? "checked" : ""} />
            Top 5
          </label>
          <button type="submit">Guardar cambios</button>
          <p id="admin-message" class="save-message"></p>
          <p id="admin-error" class="form-error" role="alert"></p>
        </form>
      </div>
    </section>
  `;
}

function renderResultsTable() {
  return `
    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Puesto</th>
            <th>Candidata</th>
            <th>Entrevista</th>
            <th>Gala</th>
            <th>Traje</th>
            <th>Speech</th>
            <th>Pregunta</th>
            <th>Comport.</th>
            <th>Total</th>
            <th>Jurados</th>
          </tr>
        </thead>
        <tbody>
          ${state.results.map(resultRow).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function resultRow(result) {
  return `
    <tr>
      <td><span class="rank">${result.rank}</span></td>
      <td>
        <strong>${escapeHtml(result.candidateName)}</strong>
        <div class="badge-row">${candidateBadges(result)}</div>
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

function bindAdminEvents() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminTab = button.dataset.tab;
      renderAdmin();
    });
  });

  document.querySelectorAll(".candidate-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedAdminCandidateId = button.dataset.candidateId;
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
      const index = state.candidates.findIndex((candidate) => candidate.id === payload.candidate.id);
      state.candidates[index] = payload.candidate;
      state.results = payload.results;
      message.textContent = "Cambios guardados.";
      setTimeout(() => renderAdmin(), 800);
    } catch (caught) {
      error.textContent = caught.message;
    }
  });
}

loadApp();
