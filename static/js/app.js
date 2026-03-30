/**
 * app.js — Main state machine
 * States: IDLE → CAMERA_INIT → QUALITY_CHECK → COUNTDOWN → CAPTURING → UPLOADING → RESULTS → ERROR
 */

const STATE = {
  IDLE:          "idle",
  CAMERA_INIT:   "camera_init",
  QUALITY_CHECK: "quality_check",
  COUNTDOWN:     "countdown",
  CAPTURING:     "capturing",
  UPLOADING:     "uploading",
  RESULTS:       "results",
  ERROR:         "error",
};

let currentState = STATE.IDLE;
let lastAnalysisResult = null;
let lastErrorMsg       = "";

// ── DOM refs (populated in init) ──────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── State transition ──────────────────────────────────────────────────────
function transition(newState, data = {}) {
  currentState = newState;

  // Hide all screens
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));

  switch (newState) {
    case STATE.IDLE:          _enterIdle();           break;
    case STATE.CAMERA_INIT:   _enterCameraInit();     break;
    case STATE.QUALITY_CHECK: _enterQualityCheck();   break;
    case STATE.COUNTDOWN:     _enterCountdown();      break;
    case STATE.CAPTURING:     _enterCapturing();      break;
    case STATE.UPLOADING:     _enterUploading();      break;
    case STATE.RESULTS:       _enterResults(data);    break;
    case STATE.ERROR:         _enterError(data.msg);  break;
  }
}

// ── IDLE ──────────────────────────────────────────────────────────────────
function _enterIdle() {
  $("screen-idle").classList.add("active");
}

// ── CAMERA INIT ───────────────────────────────────────────────────────────
async function _enterCameraInit() {
  $("screen-camera").classList.add("active");

  try {
    await Camera.init($("video-feed"), $("canvas-overlay"));
  } catch (err) {
    transition(STATE.ERROR, { msg: err.message });
    return;
  }

  // Announce
  Voice.speak(t("voiceWelcome"), true);

  // Wire quality update → UI
  Camera.onQualityUpdate(q => _updateQualityUI(q));

  // When position is held for 2s → auto capture
  Camera.onReady(() => {
    if (currentState === STATE.QUALITY_CHECK) {
      transition(STATE.COUNTDOWN);
    }
  });

  transition(STATE.QUALITY_CHECK);
}

// ── QUALITY CHECK ─────────────────────────────────────────────────────────
function _enterQualityCheck() {
  $("screen-camera").classList.add("active");
}

function _updateQualityUI(q) {
  const dot = key => $(`q-dot-${key}`);
  const setText = (id, key) => { const el = $(id); if (el) el.textContent = t(key); };

  _setDot("q-dot-face",   q.faceDetected);
  _setDot("q-dot-dist",   q.distanceOk);
  _setDot("q-dot-eyes",   q.eyesVisible);
  _setDot("q-dot-orient", q.orientationOk);

  const allOk = q.faceDetected && q.distanceOk && q.eyesVisible && q.orientationOk;
  const statusBar  = $("status-bar");
  const statusDot  = $("status-dot");
  const statusText = $("status-text");

  if (statusDot)  statusDot.className  = "status-indicator" + (allOk ? " ready" : "");
  if (statusText) statusText.textContent = t(allOk ? "statusReady" : "statusWaiting");
}

function _setDot(id, ok) {
  const el = $(id);
  if (el) el.className = "quality-dot" + (ok ? " ok" : "");
}

// ── COUNTDOWN ─────────────────────────────────────────────────────────────
function _enterCountdown() {
  $("screen-countdown").classList.add("active");

  let count = 3;
  const numEl = $("countdown-number");

  const tick = () => {
    if (numEl) {
      numEl.textContent = count;
      // Restart animation
      numEl.style.animation = "none";
      void numEl.offsetWidth;
      numEl.style.animation = "";
    }
    Voice.speak(String(count), true);

    if (count === 0) {
      transition(STATE.CAPTURING);
    } else {
      count--;
      setTimeout(tick, 900);
    }
  };

  setTimeout(tick, 100);
}

// ── CAPTURING ─────────────────────────────────────────────────────────────
async function _enterCapturing() {
  $("screen-countdown").classList.remove("active");
  Voice.speak(t("voiceCaptured"), true);

  let blob;
  try {
    blob = await Camera.capture();
  } catch (err) {
    transition(STATE.ERROR, { msg: "Erreur de capture : " + err.message });
    return;
  }

  Camera.stop();
  transition(STATE.UPLOADING, { blob });
}

// ── UPLOADING ─────────────────────────────────────────────────────────────
async function _enterUploading({ blob } = {}) {
  $("screen-loading").classList.add("active");

  if (!blob) {
    transition(STATE.ERROR, { msg: "Aucune image capturée." });
    return;
  }

  const formData = new FormData();
  formData.append("file", blob, "capture.jpg");

  try {
    const res  = await fetch("/api/analyze", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || `Erreur ${res.status}`);
    }

    lastAnalysisResult = data;
    Voice.speak(t("voiceDone"), true);
    transition(STATE.RESULTS, data);
  } catch (err) {
    transition(STATE.ERROR, { msg: err.message });
  }
}

// ── RESULTS ───────────────────────────────────────────────────────────────
function _enterResults(data) {
  $("screen-results").classList.add("active");
  Results.render(data);
}

// ── ERROR ─────────────────────────────────────────────────────────────────
function _enterError(msg) {
  $("screen-error").classList.add("active");
  const el = $("error-msg");
  if (el) el.textContent = msg || t("errorTitle");
  Camera.stop();
}

// ── Entry point ────────────────────────────────────────────────────────────
function initApp() {
  // Language selector
  const langSel = $("lang-select");
  if (langSel) {
    langSel.value = getLang();
    langSel.addEventListener("change", e => {
      setLang(e.target.value);
    });
  }

  applyTranslations();

  // Button wiring
  const btnStart = $("btn-start");
  if (btnStart) btnStart.addEventListener("click", () => transition(STATE.CAMERA_INIT));

  const btnCancel = $("btn-cancel");
  if (btnCancel) btnCancel.addEventListener("click", () => {
    Camera.stop();
    transition(STATE.IDLE);
  });

  const btnRetry = $("btn-retry");
  if (btnRetry) btnRetry.addEventListener("click", () => transition(STATE.CAMERA_INIT));

  const btnHome = $("btn-home");
  if (btnHome) btnHome.addEventListener("click", () => transition(STATE.IDLE));

  const btnNewAnalysis = $("btn-new-analysis");
  if (btnNewAnalysis) btnNewAnalysis.addEventListener("click", () => transition(STATE.IDLE));

  const btnPdf = $("btn-pdf");
  if (btnPdf) btnPdf.addEventListener("click", () => PdfExport.generate(lastAnalysisResult));

  transition(STATE.IDLE);
}

document.addEventListener("DOMContentLoaded", initApp);
