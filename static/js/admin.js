/**
 * admin.js — Admin interface logic
 * Handles: auth guard, dashboard table, pagination, validation form, stats chart
 */

const Admin = (() => {

  // ── Auth helpers ──────────────────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem("admin_token");
  }

  function authHeaders() {
    return { "Authorization": `Bearer ${getToken()}` };
  }

  function requireAuth() {
    const token = getToken();
    if (!token) { window.location.href = "/admin/login"; return false; }
    // Check expiry (JWT payload is base64url in the middle segment)
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        localStorage.removeItem("admin_token");
        window.location.href = "/admin/login";
        return false;
      }
    } catch (_) { /* ignore decode errors */ }
    return true;
  }

  function logout() {
    localStorage.removeItem("admin_token");
    window.location.href = "/admin/login";
  }

  function showAlert(msg, type = "error") {
    const el = document.getElementById("alert");
    if (!el) return;
    el.textContent = msg;
    el.className = `alert alert-${type} show`;
    setTimeout(() => el.classList.remove("show"), 5000);
  }

  // ── Classification helpers ────────────────────────────────────────────────
  const CLS_LABELS = { normal: "NORMAL", leger: "LÉGER", modere: "MODÉRÉ", severe: "SÉVÈRE" };
  const CLS_COLORS = { normal: "#4CAF50", leger: "#FFC107", modere: "#FF9800", severe: "#F44336" };

  function clsBadge(cls) {
    const color = CLS_COLORS[cls] || "#888";
    const label = CLS_LABELS[cls] || (cls || "—").toUpperCase();
    return `<span style="background:${color};color:${cls==='leger'?'#000':'#fff'};padding:2px 10px;border-radius:999px;font-size:0.78rem;font-weight:700">${label}</span>`;
  }

  function statusBadge(item) {
    if (item.validated && item.validator_correction) {
      return `<span class="status-badge status-corrected">Corrigé</span>`;
    }
    if (item.validated) {
      return `<span class="status-badge status-validated">Validé ✓</span>`;
    }
    return `<span class="status-badge status-unvalidated">Non validé</span>`;
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  let _currentPage   = 1;
  let _currentFilter = "all";
  let _distChart     = null;

  async function initDashboard() {
    if (!requireAuth()) return;

    document.getElementById("btn-logout")?.addEventListener("click", logout);

    await Promise.all([_loadStats(), _loadAnalyses()]);
  }

  function setFilter(filter, btn) {
    _currentFilter = filter;
    _currentPage   = 1;
    document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    _loadAnalyses();
  }

  async function _loadStats() {
    try {
      const res  = await fetch("/api/admin/stats", { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();

      document.getElementById("stat-total").textContent     = data.total ?? "—";
      document.getElementById("stat-validated").textContent = data.validated ?? "—";
      document.getElementById("stat-accuracy").textContent  =
        data.accuracy_pct != null ? `${data.accuracy_pct}%` : "—";

      _renderDistChart(data.distribution || {});
    } catch (err) {
      console.error("Stats error:", err);
    }
  }

  function _renderDistChart(dist) {
    const canvas = document.getElementById("dist-chart");
    if (!canvas) return;
    if (_distChart) { _distChart.destroy(); _distChart = null; }

    const labels = ["Normal", "Léger", "Modéré", "Sévère"];
    const keys   = ["normal", "leger", "modere", "severe"];
    const data   = keys.map(k => dist[k] || 0);
    const colors = keys.map(k => CLS_COLORS[k]);

    _distChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 1, borderColor: "#1e1e3a" }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { color: "#ccccee", font: { size: 10 }, boxWidth: 12 } },
        },
      },
    });
  }

  async function _loadAnalyses() {
    const tbody = document.getElementById("analyses-tbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--color-text-dim)">Chargement…</td></tr>`;

    try {
      const url  = `/api/admin/analyses?page=${_currentPage}&per_page=15&filter=${_currentFilter}`;
      const res  = await fetch(url, { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();

      _renderTable(data.items || []);
      _renderPagination(data.total, data.per_page);
    } catch (err) {
      showAlert("Erreur de chargement : " + err.message);
    }
  }

  function _renderTable(items) {
    const tbody = document.getElementById("analyses-tbody");
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-text-dim)">Aucune analyse trouvée.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const date = item.created_at
        ? new Date(item.created_at).toLocaleString("fr-FR")
        : "—";
      const thumb = item.thumbnail
        ? `<img src="data:image/jpeg;base64,${item.thumbnail}" class="thumb-img" alt="thumb" />`
        : `<span class="text-dim">—</span>`;

      return `
        <tr>
          <td><strong>#${item.id}</strong></td>
          <td style="white-space:nowrap;font-size:0.82rem">${date}</td>
          <td>${thumb}</td>
          <td>${clsBadge(item.classification)}</td>
          <td>${item.total_deg != null ? Number(item.total_deg).toFixed(2) + "°" : "—"}</td>
          <td>${statusBadge(item)}</td>
          <td>
            <a href="/admin/validate?id=${item.id}" class="btn btn-outline btn-sm">
              ${item.validated ? "Voir" : "Valider"}
            </a>
          </td>
        </tr>`;
    }).join("");
  }

  function _renderPagination(total, perPage) {
    const container = document.getElementById("pagination");
    if (!container) return;

    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = "";
    for (let p = 1; p <= totalPages; p++) {
      html += `<button class="page-btn${p === _currentPage ? " active" : ""}"
                       onclick="Admin.goToPage(${p})">${p}</button>`;
    }
    container.innerHTML = html;
  }

  function goToPage(p) {
    _currentPage = p;
    _loadAnalyses();
  }

  // ── Validate page ─────────────────────────────────────────────────────────
  async function initValidate() {
    if (!requireAuth()) return;

    document.getElementById("btn-logout")?.addEventListener("click", logout);

    const params = new URLSearchParams(window.location.search);
    const id     = params.get("id");
    if (!id) { showAlert("ID d'analyse manquant."); return; }

    document.getElementById("analysis-subtitle").textContent = `Analyse #${id}`;

    // Build star rating widget
    _buildStars();

    // Load analysis data
    try {
      const res  = await fetch(`/api/admin/analyses/${id}`, { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) { showAlert("Analyse introuvable."); return; }
      const data = await res.json();

      _populateValidatePage(data);
      document.getElementById("loading-state").style.display = "none";
      document.getElementById("main-content").style.display  = "block";

      // Pre-fill existing validation if present
      if (data.validated) {
        if (data.validator_rating) _setStars(data.validator_rating);
        if (data.validator_correction) document.getElementById("correction-select").value = data.validator_correction;
        if (data.validator_notes)      document.getElementById("notes-input").value = data.validator_notes;
      }
    } catch (err) {
      showAlert("Erreur : " + err.message);
    }

    // Save button
    document.getElementById("btn-save")?.addEventListener("click", () => _saveValidation(id));
  }

  function _populateValidatePage(data) {
    // Annotated image
    const img = document.getElementById("annotated-img");
    if (img && data.image_annotated) {
      img.src = `data:image/jpeg;base64,${data.image_annotated}`;
    }

    // AI badge
    const badge = document.getElementById("ai-badge");
    if (badge) {
      badge.textContent = CLS_LABELS[data.classification] || (data.classification || "—").toUpperCase();
      badge.className   = `classification-badge badge-${data.classification}`;
    }

    // AI results table
    const tbody = document.getElementById("ai-results-tbody");
    if (tbody) {
      const fmt = v => v != null ? Number(v).toFixed(2) : "—";
      tbody.innerHTML = `
        <tr><td>Œil gauche — H</td><td>${fmt(data.left_dev_h)}°</td></tr>
        <tr><td>Œil gauche — V</td><td>${fmt(data.left_dev_v)}°</td></tr>
        <tr><td>Œil droit — H</td><td>${fmt(data.right_dev_h)}°</td></tr>
        <tr><td>Œil droit — V</td><td>${fmt(data.right_dev_v)}°</td></tr>
        <tr><td><strong>Déviation totale</strong></td><td><strong>${fmt(data.total_deg)}°</strong></td></tr>
        <tr><td>Dioptries prismatiques</td><td>${fmt(data.prism_diopters)}Δ</td></tr>
      `;
    }

    // Metadata table
    const meta = document.getElementById("meta-tbody");
    if (meta) {
      const fmt = v => v != null ? Number(v).toFixed(1) : "—";
      meta.innerHTML = `
        <tr><td>Score qualité</td><td>${data.quality_score != null ? Math.round(data.quality_score * 100) + "%" : "—"}</td></tr>
        <tr><td>Lacet (yaw)</td><td>${fmt(data.face_yaw_deg)}°</td></tr>
        <tr><td>Distance pupillaire</td><td>${data.ipd_pixels != null ? Math.round(data.ipd_pixels) + " px" : "—"}</td></tr>
        <tr><td>Date d'analyse</td><td>${data.created_at ? new Date(data.created_at).toLocaleString("fr-FR") : "—"}</td></tr>
      `;
    }
  }

  async function _saveValidation(id) {
    const btn    = document.getElementById("btn-save");
    const rating = parseInt(document.getElementById("rating-value").value) || null;
    const correction = document.getElementById("correction-select").value || null;
    const notes  = document.getElementById("notes-input").value.trim() || null;

    btn.disabled    = true;
    btn.textContent = "Enregistrement…";

    try {
      const res = await fetch(`/api/admin/analyses/${id}/validate`, {
        method:  "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body:    JSON.stringify({ rating, correction, notes }),
      });

      if (res.status === 401) { logout(); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Erreur"); }

      const successEl = document.getElementById("save-success");
      if (successEl) { successEl.style.display = "block"; }
      btn.textContent = "✓ Enregistré";
    } catch (err) {
      showAlert("Erreur : " + err.message);
      btn.disabled    = false;
      btn.textContent = "💾 Enregistrer la validation";
    }
  }

  // ── Star rating widget ────────────────────────────────────────────────────
  let _starValue = 0;

  function _buildStars() {
    const container = document.getElementById("star-container");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const span = document.createElement("span");
      span.className   = "star";
      span.textContent = "★";
      span.dataset.val = i;
      span.addEventListener("click",      () => _setStars(i));
      span.addEventListener("mouseenter", () => _highlightStars(i));
      span.addEventListener("mouseleave", () => _highlightStars(_starValue));
      container.appendChild(span);
    }
  }

  function _setStars(val) {
    _starValue = val;
    document.getElementById("rating-value").value = val;
    _highlightStars(val);
  }

  function _highlightStars(val) {
    document.querySelectorAll(".star").forEach(s => {
      s.classList.toggle("active", parseInt(s.dataset.val) <= val);
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    initDashboard,
    initValidate,
    setFilter,
    goToPage,
  };
})();
