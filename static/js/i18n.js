/**
 * i18n — Bilingual translations (FR / EN)
 * Usage: t('key') returns the string in the current language.
 *        setLang('en') switches the language and re-renders the page.
 */

const TRANSLATIONS = {
  fr: {
    // Header
    appName:          "StrabiScan AI",
    langLabel:        "Langue",

    // Idle screen
    idleTitle:        "StrabiScan AI",
    idleSubtitle:     "Dépistage du strabisme par intelligence artificielle",
    startBtn:         "Démarrer l'analyse",
    feat1Title:       "Guidage automatique",
    feat1Desc:        "La caméra vous guide vers la position idéale",
    feat2Title:       "Analyse IA",
    feat2Desc:        "Mesure précise de la déviation oculaire",
    feat3Title:       "Résultats détaillés",
    feat3Desc:        "Classification médicale et export PDF",
    feat4Title:       "Interface admin",
    feat4Desc:        "Validation par spécialiste ophtalmologue",

    // Camera screen
    cameraTitle:      "Positionnez-vous face à la caméra",
    cameraHint:       "Regardez fixement le point blanc au centre de l'écran",
    qFace:            "Visage détecté",
    qDistance:        "Distance correcte",
    qEyes:            "Yeux visibles",
    qOrientation:     "Orientation frontale",
    statusWaiting:    "En attente du positionnement...",
    statusReady:      "Position parfaite ! Capture dans 2 secondes…",
    cancelBtn:        "Annuler",

    // Countdown
    countdownText:    "Ne bougez plus !",

    // Loading
    loadingTitle:     "Analyse en cours…",
    loadingSubtitle:  "Détection des points oculaires",

    // Results
    resultsTitle:     "Résultats de l'analyse",
    imgAnnotated:     "Image analysée",
    resultsNumerical: "Résultats numériques",
    eyeLeft:          "Œil gauche (OG)",
    eyeRight:         "Œil droit (OD)",
    totalDev:         "Déviation totale",
    deviation_h:      "Déviation horizontale",
    deviation_v:      "Déviation verticale",
    prismDioptr:      "Dioptries prismatiques",
    classification:   "Classification",
    chart_title:      "Échelle de déviation",
    recommendation:   "Recommandation",
    rec_normal:       "Aucun strabisme détecté. Vision binoculaire normale.",
    rec_leger:        "Strabisme léger détecté. Consultation ophtalmologique recommandée.",
    rec_modere:       "Strabisme modéré détecté. Consultation ophtalmologique urgente recommandée.",
    rec_severe:       "Strabisme sévère détecté. Consultation ophtalmologique urgente recommandée.",
    disclaimer:       "Cet outil est un dispositif de dépistage uniquement. Il ne remplace pas un diagnostic médical professionnel. Consultez un ophtalmologue pour tout diagnostic clinique.",
    btnPdf:           "Exporter en PDF",
    btnNewAnalysis:   "Nouvelle analyse",

    // Classification labels
    cls_normal:       "NORMAL",
    cls_leger:        "LÉGER",
    cls_modere:       "MODÉRÉ",
    cls_severe:       "SÉVÈRE",

    // Error screen
    errorTitle:       "Analyse impossible",
    errorRetry:       "Réessayer",
    errorHome:        "Accueil",

    // Voice instructions
    voiceWelcome:     "Bienvenue. Placez-vous face à l'écran à environ 40 centimètres.",
    voiceAdjust:      "Ajustez votre position pour que votre visage soit dans le cadre.",
    voiceReady:       "Parfait. Maintenant, regardez fixement le point blanc au centre de l'écran.",
    voiceDontMove:    "Ne bougez plus. Capture dans",
    voiceCaptured:    "Photo capturée. Analyse en cours, veuillez patienter.",
    voiceDone:        "Analyse terminée. Voici vos résultats.",
    voiceTooClose:    "Éloignez-vous légèrement.",
    voiceTooFar:      "Rapprochez-vous un peu.",
    voiceTurnFront:   "Tournez légèrement la tête vers la caméra.",
    voiceOpenEyes:    "Ouvrez bien les yeux.",
    voiceLight:       "Améliorez l'éclairage de la pièce.",

    // Admin
    adminTitle:       "Interface Administrateur",
    adminLogin:       "Connexion",
    adminLogout:      "Déconnexion",
    adminUser:        "Identifiant",
    adminPass:        "Mot de passe",
    adminLoginBtn:    "Se connecter",
    adminDashTitle:   "Tableau de bord",
    adminTotalAna:    "Analyses totales",
    adminValidated:   "Validées",
    adminAccuracy:    "Précision IA",
    adminFilterAll:   "Toutes",
    adminFilterVal:   "Validées",
    adminFilterUnval: "Non validées",
    colId:            "ID",
    colDate:          "Date",
    colThumb:         "Aperçu",
    colClass:         "Classification",
    colStatus:        "Statut",
    colActions:       "Actions",
    btnValidate:      "Valider",
    statusValidated:  "Validé",
    statusUnvalidated:"Non validé",
    statusCorrected:  "Corrigé",
    validateTitle:    "Validation d'analyse",
    labelRating:      "Note de qualité (1-5)",
    labelCorrection:  "Correction (si nécessaire)",
    labelNotes:       "Commentaires",
    btnSaveValidation:"Enregistrer la validation",
    backDashboard:    "Retour au tableau de bord",
    loginError:       "Identifiants incorrects.",
    sessionExpired:   "Session expirée. Veuillez vous reconnecter.",
  },

  en: {
    appName:          "StrabiScan AI",
    langLabel:        "Language",

    idleTitle:        "StrabiScan AI",
    idleSubtitle:     "AI-powered strabismus screening",
    startBtn:         "Start Analysis",
    feat1Title:       "Automatic Guidance",
    feat1Desc:        "Camera guides you to the ideal position",
    feat2Title:       "AI Analysis",
    feat2Desc:        "Precise measurement of ocular deviation",
    feat3Title:       "Detailed Results",
    feat3Desc:        "Medical classification and PDF export",
    feat4Title:       "Admin Interface",
    feat4Desc:        "Validation by ophthalmologist specialist",

    cameraTitle:      "Position yourself facing the camera",
    cameraHint:       "Stare at the white dot in the center of the screen",
    qFace:            "Face detected",
    qDistance:        "Correct distance",
    qEyes:            "Eyes visible",
    qOrientation:     "Frontal orientation",
    statusWaiting:    "Waiting for positioning...",
    statusReady:      "Perfect position! Capturing in 2 seconds…",
    cancelBtn:        "Cancel",

    countdownText:    "Don't move!",

    loadingTitle:     "Analysis in progress…",
    loadingSubtitle:  "Detecting eye landmarks",

    resultsTitle:     "Analysis Results",
    imgAnnotated:     "Analysed image",
    resultsNumerical: "Numerical Results",
    eyeLeft:          "Left eye (OS)",
    eyeRight:         "Right eye (OD)",
    totalDev:         "Total deviation",
    deviation_h:      "Horizontal deviation",
    deviation_v:      "Vertical deviation",
    prismDioptr:      "Prism diopters",
    classification:   "Classification",
    chart_title:      "Deviation scale",
    recommendation:   "Recommendation",
    rec_normal:       "No strabismus detected. Normal binocular vision.",
    rec_leger:        "Mild strabismus detected. Ophthalmological consultation recommended.",
    rec_modere:       "Moderate strabismus detected. Urgent ophthalmological consultation recommended.",
    rec_severe:       "Severe strabismus detected. Urgent ophthalmological consultation recommended.",
    disclaimer:       "This tool is a screening device only. It does not replace a professional medical diagnosis. Consult an ophthalmologist for any clinical diagnosis.",
    btnPdf:           "Export as PDF",
    btnNewAnalysis:   "New Analysis",

    cls_normal:       "NORMAL",
    cls_leger:        "MILD",
    cls_modere:       "MODERATE",
    cls_severe:       "SEVERE",

    errorTitle:       "Analysis failed",
    errorRetry:       "Retry",
    errorHome:        "Home",

    voiceWelcome:     "Welcome. Position yourself facing the screen at about 40 centimetres.",
    voiceAdjust:      "Adjust your position so your face is within the frame.",
    voiceReady:       "Perfect. Now stare at the white dot in the center of the screen.",
    voiceDontMove:    "Don't move. Capturing in",
    voiceCaptured:    "Photo captured. Analysis in progress, please wait.",
    voiceDone:        "Analysis complete. Here are your results.",
    voiceTooClose:    "Move slightly further away.",
    voiceTooFar:      "Move a little closer.",
    voiceTurnFront:   "Turn your head slightly towards the camera.",
    voiceOpenEyes:    "Please keep your eyes open.",
    voiceLight:       "Improve the room lighting.",

    adminTitle:       "Admin Interface",
    adminLogin:       "Login",
    adminLogout:      "Logout",
    adminUser:        "Username",
    adminPass:        "Password",
    adminLoginBtn:    "Sign in",
    adminDashTitle:   "Dashboard",
    adminTotalAna:    "Total Analyses",
    adminValidated:   "Validated",
    adminAccuracy:    "AI Accuracy",
    adminFilterAll:   "All",
    adminFilterVal:   "Validated",
    adminFilterUnval: "Unvalidated",
    colId:            "ID",
    colDate:          "Date",
    colThumb:         "Preview",
    colClass:         "Classification",
    colStatus:        "Status",
    colActions:       "Actions",
    btnValidate:      "Validate",
    statusValidated:  "Validated",
    statusUnvalidated:"Unvalidated",
    statusCorrected:  "Corrected",
    validateTitle:    "Analysis Validation",
    labelRating:      "Quality rating (1-5)",
    labelCorrection:  "Correction (if needed)",
    labelNotes:       "Comments",
    btnSaveValidation:"Save Validation",
    backDashboard:    "Back to Dashboard",
    loginError:       "Incorrect credentials.",
    sessionExpired:   "Session expired. Please log in again.",
  },
};

let _currentLang = localStorage.getItem("lang") || "fr";

function t(key) {
  const dict = TRANSLATIONS[_currentLang] || TRANSLATIONS["fr"];
  return dict[key] || TRANSLATIONS["fr"][key] || key;
}

function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _currentLang = lang;
  localStorage.setItem("lang", lang);
  applyTranslations();
}

function getLang() {
  return _currentLang;
}

/** Apply data-i18n attributes to all matching elements */
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  // Update lang selector
  const sel = document.getElementById("lang-select");
  if (sel) sel.value = _currentLang;
}
