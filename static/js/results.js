/**
 * results.js — Renders the analysis results screen
 * Dependencies: Chart.js (CDN), i18n.js
 */

const Results = (() => {
  let deviationChart = null;

  const CLS_COLORS = {
    normal: "#4CAF50",
    leger:  "#FFC107",
    modere: "#FF9800",
    severe: "#F44336",
  };

  function render(data) {
    _renderImage(data);
    _renderBadge(data.classification);
    _renderTable(data);
    _renderChart(data.total_deviation_deg);
    _renderRecommendation(data.classification);
    applyTranslations();
  }

  // ── Annotated image ───────────────────────────────────────────────────────
  function _renderImage(data) {
    const img = document.getElementById("annotated-img");
    if (!img) return;
    img.src = `data:image/jpeg;base64,${data.annotated_image}`;
    img.alt = t("imgAnnotated");
  }

  // ── Classification badge ──────────────────────────────────────────────────
  function _renderBadge(cls) {
    const el = document.getElementById("cls-badge");
    if (!el) return;
    el.textContent  = t(`cls_${cls}`);
    el.className    = `classification-badge badge-${cls}`;
  }

  // ── Numerical table ───────────────────────────────────────────────────────
  function _renderTable(data) {
    const tbody = document.getElementById("result-tbody");
    if (!tbody) return;

    const left  = data.left_eye;
    const right = data.right_eye;

    const rows = [
      [t("eyeLeft"),  `${_fmt(left.deviation_h_deg)}°`,  `${_fmt(left.deviation_v_deg)}°`,  `${_fmt(left.prism_diopters)}Δ`],
      [t("eyeRight"), `${_fmt(right.deviation_h_deg)}°`, `${_fmt(right.deviation_v_deg)}°`, `${_fmt(right.prism_diopters)}Δ`],
      [`<strong>${t("totalDev")}</strong>`,
       `<strong>${_fmt(data.total_deviation_deg)}°</strong>`, "—",
       `<strong>${_fmt(data.prism_diopters)}Δ</strong>`],
    ];

    tbody.innerHTML = rows.map(row =>
      `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`
    ).join("");
  }

  function _fmt(v) {
    if (v == null) return "—";
    return Number(v).toFixed(2);
  }

  // ── Deviation chart ───────────────────────────────────────────────────────
  function _renderChart(totalDeg) {
    const canvasEl = document.getElementById("deviation-chart");
    if (!canvasEl) return;

    if (deviationChart) {
      deviationChart.destroy();
      deviationChart = null;
    }

    // Zones: normal 0-1°, léger 1-5°, modéré 5-15°, sévère 15-20° (capped)
    const zones      = [1, 4, 10, 5];       // widths in degrees
    const zoneLabels = ["Normal (0-1°)", "Léger (1-5°)", "Modéré (5-15°)", "Sévère (>15°)"];
    const zoneColors = ["#4CAF50", "#FFC107", "#FF9800", "#F44336"];
    const zoneAlpha  = ["rgba(76,175,80,0.35)", "rgba(255,193,7,0.35)",
                        "rgba(255,152,0,0.35)", "rgba(244,67,54,0.35)"];

    // Clamp value to 0-20 scale
    const val = Math.min(totalDeg || 0, 20);

    deviationChart = new Chart(canvasEl, {
      type: "bar",
      data: {
        labels: zoneLabels,
        datasets: [
          {
            label: "Zones",
            data: zones,
            backgroundColor: zoneAlpha,
            borderColor: zoneColors,
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: t("totalDev"),
            data: [null, null, null, null],
            type: "scatter",
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                if (ctx.datasetIndex === 0) {
                  return `${ctx.label}`;
                }
                return null;
              },
            },
          },
          annotation: {
            annotations: {
              needle: {
                type: "line",
                scaleID: "x",
                value: val,
                borderColor: "#ffffff",
                borderWidth: 2,
                borderDash: [4, 3],
                label: {
                  display: true,
                  content: `${_fmt(totalDeg)}°`,
                  color: "#fff",
                  backgroundColor: "rgba(0,0,0,0.65)",
                  font: { weight: "bold", size: 11 },
                  position: "start",
                },
              },
            },
          },
        },
        scales: {
          x: {
            min: 0,
            max: 20,
            grid: { color: "rgba(255,255,255,0.07)" },
            ticks: { color: "#aaaacc", font: { size: 11 } },
            title: {
              display: true,
              text: "Degrés (°)",
              color: "#aaaacc",
              font: { size: 11 },
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: "#ccccee", font: { size: 11 } },
          },
        },
      },
    });
  }

  // ── Recommendation text ───────────────────────────────────────────────────
  function _renderRecommendation(cls) {
    const el = document.getElementById("recommendation-text");
    if (!el) return;
    const key = `rec_${cls}`;
    el.textContent = t(key);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return { render };
})();
