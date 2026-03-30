/**
 * pdf.js — Client-side PDF export using jsPDF
 * Generates a medical report with the analysis results.
 */

const PdfExport = (() => {

  const CLS_COLORS_HEX = {
    normal: [76, 175, 80],
    leger:  [255, 193, 7],
    modere: [255, 152, 0],
    severe: [244, 67, 54],
  };

  function generate(data) {
    if (!data) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const lang = getLang();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = margin;

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.setFillColor(21, 101, 192);
    doc.rect(0, 0, pageW, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("StrabiScan AI", margin, 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const subtitle = lang === "fr"
      ? "Rapport de dépistage du strabisme"
      : "Strabismus Screening Report";
    doc.text(subtitle, margin, 20);

    const now = new Date();
    const dateStr = now.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB") +
                    "  " + now.toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB");
    doc.text(dateStr, pageW - margin, 20, { align: "right" });

    y = 38;

    // ── Classification badge ─────────────────────────────────────────────────
    const cls       = data.classification;
    const clsColor  = CLS_COLORS_HEX[cls] || [100, 100, 100];
    const clsLabel  = { normal: "NORMAL", leger: lang === "fr" ? "LÉGER" : "MILD",
                        modere: lang === "fr" ? "MODÉRÉ" : "MODERATE", severe: "SÉVÈRE/SEVERE" }[cls] || cls.toUpperCase();

    doc.setFillColor(...clsColor);
    doc.roundedRect(margin, y, 50, 10, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(clsLabel, margin + 25, y + 7, { align: "center" });

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const analysisId = lang === "fr" ? `Analyse #${data.id}` : `Analysis #${data.id}`;
    doc.text(analysisId, margin + 56, y + 7);

    y += 18;

    // ── Annotated image ──────────────────────────────────────────────────────
    if (data.annotated_image) {
      const imgData = `data:image/jpeg;base64,${data.annotated_image}`;
      const imgW    = 80;
      const imgH    = 60;
      const imgX    = pageW / 2 - imgW / 2;
      doc.addImage(imgData, "JPEG", imgX, y, imgW, imgH);
      doc.setDrawColor(200, 200, 200);
      doc.rect(imgX, y, imgW, imgH);
      y += imgH + 8;
    }

    // ── Results table ────────────────────────────────────────────────────────
    const title = lang === "fr" ? "Résultats numériques" : "Numerical Results";
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(title, margin, y);
    y += 5;

    const leftEye  = data.left_eye;
    const rightEye = data.right_eye;
    const fmt      = v => (v != null ? Number(v).toFixed(2) : "—");

    const hLabel   = lang === "fr" ? "Dév. Horizontale" : "Horiz. Deviation";
    const vLabel   = lang === "fr" ? "Dév. Verticale"   : "Vert. Deviation";
    const pdLabel  = lang === "fr" ? "Dioptries prism." : "Prism Diopters";
    const lgLabel  = lang === "fr" ? "Œil gauche (OG)"  : "Left Eye (OS)";
    const rdLabel  = lang === "fr" ? "Œil droit (OD)"   : "Right Eye (OD)";
    const totLabel = lang === "fr" ? "Déviation totale" : "Total Deviation";

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["", hLabel, vLabel, pdLabel]],
      body: [
        [lgLabel,  `${fmt(leftEye.deviation_h_deg)}°`,  `${fmt(leftEye.deviation_v_deg)}°`,  `${fmt(leftEye.prism_diopters)}Δ`],
        [rdLabel,  `${fmt(rightEye.deviation_h_deg)}°`, `${fmt(rightEye.deviation_v_deg)}°`, `${fmt(rightEye.prism_diopters)}Δ`],
        [totLabel, `${fmt(data.total_deviation_deg)}°`, "—",                                  `${fmt(data.prism_diopters)}Δ`],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 255] },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ── Recommendation ────────────────────────────────────────────────────────
    const recTitle = lang === "fr" ? "Recommandation" : "Recommendation";
    const recMap   = {
      normal: lang === "fr"
        ? "Aucun strabisme détecté. Vision binoculaire normale."
        : "No strabismus detected. Normal binocular vision.",
      leger: lang === "fr"
        ? "Strabisme léger détecté. Consultation ophtalmologique recommandée."
        : "Mild strabismus detected. Ophthalmological consultation recommended.",
      modere: lang === "fr"
        ? "Strabisme modéré détecté. Consultation ophtalmologique urgente recommandée."
        : "Moderate strabismus detected. Urgent ophthalmological consultation recommended.",
      severe: lang === "fr"
        ? "Strabisme sévère détecté. Consultation ophtalmologique urgente recommandée."
        : "Severe strabismus detected. Urgent ophthalmological consultation recommended.",
    };
    const recText = recMap[cls] || "";

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(recTitle, margin, y);
    y += 5;

    doc.setFillColor(...clsColor);
    doc.rect(margin, y, 3, 16, "F");

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    const recLines = doc.splitTextToSize(recText, pageW - margin * 2 - 6);
    doc.text(recLines, margin + 6, y + 5);
    y += Math.max(20, recLines.length * 5 + 6);

    // ── Disclaimer ───────────────────────────────────────────────────────────
    const disclaimer = lang === "fr"
      ? "Cet outil est un dispositif de dépistage uniquement. Il ne remplace pas un diagnostic médical professionnel. Consultez un ophtalmologue pour tout diagnostic clinique."
      : "This tool is a screening device only. It does not replace a professional medical diagnosis. Consult an ophthalmologist for any clinical diagnosis.";

    doc.setDrawColor(160, 160, 160);
    doc.setLineDash([2, 2]);
    doc.rect(margin, y, pageW - margin * 2, 18);
    doc.setLineDash([]);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "italic");
    const disclaimerLines = doc.splitTextToSize(disclaimer, pageW - margin * 2 - 4);
    doc.text(disclaimerLines, margin + 2, y + 5);

    y += 26;

    // ── Footer ────────────────────────────────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(21, 101, 192);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const footerLeft = lang === "fr"
      ? `Généré par StrabiScan AI — Outil de dépistage`
      : `Generated by StrabiScan AI — Screening tool`;
    doc.text(footerLeft, margin, pageH - 4);
    doc.text(dateStr, pageW - margin, pageH - 4, { align: "right" });

    // ── Save ──────────────────────────────────────────────────────────────────
    const filename = `strabiscan_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}_${data.id || "X"}.pdf`;
    doc.save(filename);
  }

  return { generate };
})();
