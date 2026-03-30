/**
 * camera.js — Webcam capture + real-time quality check
 * Uses MediaPipe FaceDetection JS for lightweight live analysis.
 */

const Camera = (() => {
  // ── State ────────────────────────────────────────────────────────────────
  let videoEl       = null;
  let canvasEl      = null;
  let ctx           = null;
  let stream        = null;
  let faceDetector  = null;
  let rafId         = null;
  let lastFrameTime = 0;
  const FRAME_INTERVAL = 100;  // 10 fps for quality check

  let consecutiveOkFrames = 0;
  const REQUIRED_OK_FRAMES = 20;  // 2 seconds at 10fps
  let onReadyCallback  = null;
  let onQualityChange  = null;

  // Thresholds
  const FACE_WIDTH_MIN = 0.28;   // too far
  const FACE_WIDTH_MAX = 0.58;   // too close
  const CONFIDENCE_MIN = 0.75;

  let quality = {
    faceDetected:  false,
    distanceOk:    false,
    eyesVisible:   false,
    orientationOk: false,
  };

  // Voice feedback throttle
  let lastVoiceTime = 0;
  const VOICE_INTERVAL = 4000;  // ms between repeated instructions

  // ── Init MediaPipe FaceDetection ─────────────────────────────────────────
  async function init(videoElement, canvasElement) {
    videoEl  = videoElement;
    canvasEl = canvasElement;
    ctx      = canvasEl.getContext("2d");

    // Request webcam
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      videoEl.srcObject = stream;
      await new Promise(resolve => { videoEl.onloadedmetadata = resolve; });
      await videoEl.play();
    } catch (err) {
      throw new Error("Impossible d'accéder à la caméra : " + err.message);
    }

    // Load MediaPipe FaceDetection
    faceDetector = new FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });
    faceDetector.setOptions({
      model: "short",
      minDetectionConfidence: CONFIDENCE_MIN,
    });
    faceDetector.onResults(_onFaceResults);
    await faceDetector.initialize();

    _startLoop();
  }

  // ── Frame loop ────────────────────────────────────────────────────────────
  function _startLoop() {
    rafId = requestAnimationFrame(_loop);
  }

  async function _loop(timestamp) {
    if (timestamp - lastFrameTime >= FRAME_INTERVAL) {
      lastFrameTime = timestamp;
      if (videoEl && videoEl.readyState >= 2) {
        await faceDetector.send({ image: videoEl });
      }
    }
    rafId = requestAnimationFrame(_loop);
  }

  // ── FaceDetection results ─────────────────────────────────────────────────
  function _onFaceResults(results) {
    _drawOverlay(results);

    const faces = results.detections || [];
    const vw = videoEl.videoWidth  || 640;

    if (faces.length === 0) {
      _setQuality({ faceDetected: false, distanceOk: false, eyesVisible: false, orientationOk: false });
      consecutiveOkFrames = 0;
      _voiceFeedback("noFace");
      return;
    }

    const face = faces[0];
    const bbox = face.boundingBox;                  // normalised 0-1
    const faceWidthFraction = bbox.width;
    const confidence = (face.score && face.score[0]) || 0.9;

    const faceDetected  = true;
    const distanceOk    = faceWidthFraction >= FACE_WIDTH_MIN && faceWidthFraction <= FACE_WIDTH_MAX;
    const eyesVisible   = confidence >= CONFIDENCE_MIN;
    // Orientation: use xCenter — if far from 0.5 the face is off-centre/rotated
    const xCenter       = bbox.xCenter || (bbox.xMin + bbox.width / 2);
    const orientationOk = Math.abs(xCenter - 0.5) < 0.18;

    _setQuality({ faceDetected, distanceOk, eyesVisible, orientationOk });

    const allOk = faceDetected && distanceOk && eyesVisible && orientationOk;

    if (allOk) {
      consecutiveOkFrames++;
      if (consecutiveOkFrames >= REQUIRED_OK_FRAMES && onReadyCallback) {
        consecutiveOkFrames = 0;
        onReadyCallback();
      } else if (consecutiveOkFrames === 1) {
        Voice.speak(t("voiceReady"));
      }
    } else {
      consecutiveOkFrames = 0;
      // Give corrective voice feedback
      if (!distanceOk) {
        _voiceFeedback(faceWidthFraction < FACE_WIDTH_MIN ? "tooFar" : "tooClose");
      } else if (!orientationOk) {
        _voiceFeedback("turnFront");
      } else if (!eyesVisible) {
        _voiceFeedback("openEyes");
      }
    }
  }

  // ── Canvas overlay (oval guide + quality visual) ──────────────────────────
  function _drawOverlay(results) {
    if (!canvasEl || !videoEl) return;
    canvasEl.width  = videoEl.videoWidth  || 640;
    canvasEl.height = videoEl.videoHeight || 480;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    const cw = canvasEl.width;
    const ch = canvasEl.height;

    // Oval guide
    const ovalW = cw * 0.42;
    const ovalH = ch * 0.64;
    ctx.beginPath();
    ctx.ellipse(cw / 2, ch / 2, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2);

    const allOk = quality.faceDetected && quality.distanceOk && quality.eyesVisible && quality.orientationOk;
    ctx.strokeStyle = allOk ? "#4CAF50" : "rgba(255,255,255,0.5)";
    ctx.lineWidth   = 2.5;
    ctx.setLineDash(allOk ? [] : [8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Alignment cross-hairs
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cw / 2 - 20, ch / 2); ctx.lineTo(cw / 2 + 20, ch / 2);
    ctx.moveTo(cw / 2, ch / 2 - 20); ctx.lineTo(cw / 2, ch / 2 + 20);
    ctx.stroke();

    // Draw detected face bbox (debug / guidance)
    const faces = (results && results.detections) || [];
    if (faces.length > 0) {
      const bbox = faces[0].boundingBox;
      ctx.strokeStyle = "rgba(33,150,243,0.7)";
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(
        bbox.xMin * cw,
        bbox.yMin * ch,
        bbox.width * cw,
        bbox.height * ch,
      );
    }

    // Progress arc (consecutive ok frames)
    if (consecutiveOkFrames > 0) {
      const prog = consecutiveOkFrames / REQUIRED_OK_FRAMES;
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, ovalW / 2 + 8, -Math.PI / 2, -Math.PI / 2 + prog * 2 * Math.PI);
      ctx.strokeStyle = "#4CAF50";
      ctx.lineWidth   = 4;
      ctx.stroke();
    }
  }

  // ── Quality state update ──────────────────────────────────────────────────
  function _setQuality(q) {
    quality = { ...q };
    if (onQualityChange) onQualityChange(quality);
  }

  // ── Voice feedback (throttled) ────────────────────────────────────────────
  function _voiceFeedback(reason) {
    const now = Date.now();
    if (now - lastVoiceTime < VOICE_INTERVAL) return;
    lastVoiceTime = now;

    const map = {
      noFace:    "voiceAdjust",
      tooFar:    "voiceTooFar",
      tooClose:  "voiceTooClose",
      turnFront: "voiceTurnFront",
      openEyes:  "voiceOpenEyes",
    };
    const key = map[reason];
    if (key) Voice.speak(t(key));
  }

  // ── Capture a frame as a Blob ─────────────────────────────────────────────
  function capture() {
    return new Promise(resolve => {
      const cap = document.createElement("canvas");
      cap.width  = videoEl.videoWidth;
      cap.height = videoEl.videoHeight;
      const c = cap.getContext("2d");
      // Un-mirror for the captured image (we mirror the video display only)
      c.translate(cap.width, 0);
      c.scale(-1, 1);
      c.drawImage(videoEl, 0, 0);
      cap.toBlob(blob => resolve(blob), "image/jpeg", 0.90);
    });
  }

  // ── Stop camera ───────────────────────────────────────────────────────────
  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    consecutiveOkFrames = 0;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    init,
    stop,
    capture,
    onReady(cb)         { onReadyCallback = cb; },
    onQualityUpdate(cb) { onQualityChange = cb; },
    getQuality()        { return { ...quality }; },
  };
})();


// ── Voice helper (Web Speech API) ─────────────────────────────────────────
const Voice = (() => {
  let enabled   = true;
  let speaking  = false;

  function speak(text, priority = false) {
    if (!enabled || !window.speechSynthesis) return;
    if (speaking && !priority) return;
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.lang   = getLang() === "fr" ? "fr-FR" : "en-US";
    utt.rate   = 0.95;
    utt.pitch  = 1.0;
    utt.volume = 1.0;
    utt.onstart = () => { speaking = true;  };
    utt.onend   = () => { speaking = false; };
    window.speechSynthesis.speak(utt);
  }

  function setEnabled(val) { enabled = val; }

  return { speak, setEnabled };
})();
