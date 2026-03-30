"""
Core strabismus detection algorithm using MediaPipe FaceMesh.
Thread-safe via external ThreadPoolExecutor(max_workers=1) in the router.
"""
import math
import base64
import cv2
import numpy as np
import mediapipe as mp

# ---------------------------------------------------------------------------
# MediaPipe initialised once at module load (not thread-safe — caller must
# ensure serialised access via a single-worker ThreadPoolExecutor).
# ---------------------------------------------------------------------------
_mp_face_mesh = mp.solutions.face_mesh
_face_mesh = _mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,   # enables iris landmarks 468-477
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5,
)

# ---------------------------------------------------------------------------
# Landmark indices (MediaPipe FaceMesh with refine_landmarks=True)
# ---------------------------------------------------------------------------
IDX_LEFT_IRIS_CENTER  = 468
IDX_LEFT_IRIS_RING    = [469, 470, 471, 472]
IDX_RIGHT_IRIS_CENTER = 473
IDX_RIGHT_IRIS_RING   = [474, 475, 476, 477]

IDX_LEFT_EYE_OUTER    = 33
IDX_LEFT_EYE_INNER    = 133
IDX_RIGHT_EYE_INNER   = 362
IDX_RIGHT_EYE_OUTER   = 263

IDX_LEFT_EYE_TOP      = 159
IDX_LEFT_EYE_BOTTOM   = 145
IDX_RIGHT_EYE_TOP     = 386
IDX_RIGHT_EYE_BOTTOM  = 374

IDX_NOSE_TIP          = 1
IDX_CHIN              = 152
IDX_FACE_LEFT         = 234
IDX_FACE_RIGHT        = 454
IDX_FOREHEAD          = 10

# Physical constants
REAL_IPD_MM         = 63.0   # average adult inter-pupillary distance
VIEWING_DISTANCE_MM = 400.0  # 40 cm assumed
KAPPA_CORRECTION_DEG = 3.0   # physiological kappa angle offset
MAX_IMAGE_DIM       = 640


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _px(lm, idx, w, h):
    """Return pixel (x, y) for a landmark index."""
    pt = lm[idx]
    return pt.x * w, pt.y * h


def _iris_radius(lm, center_idx, ring_indices, w, h):
    cx, cy = _px(lm, center_idx, w, h)
    radii = [math.hypot(_px(lm, i, w, h)[0] - cx,
                        _px(lm, i, w, h)[1] - cy)
             for i in ring_indices]
    return sum(radii) / len(radii)


def _encode_image(img, quality=75):
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def _make_thumbnail(img, width=80):
    h, w = img.shape[:2]
    new_h = int(h * width / w)
    thumb = cv2.resize(img, (width, new_h))
    return _encode_image(thumb, quality=60)


def _classify(deg):
    deg = abs(deg)
    if deg < 1.0:
        return "normal"
    if deg < 5.0:
        return "leger"
    if deg < 15.0:
        return "modere"
    return "severe"


# ---------------------------------------------------------------------------
# Main analysis function
# ---------------------------------------------------------------------------

def analyze_image(image_bytes: bytes) -> dict:
    """
    Analyse a JPEG/PNG image for strabismus.

    Returns a dict with all measurements, classifications and base64 images.
    Raises ValueError with a user-friendly message on failure.
    """
    # --- Decode ---
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Impossible de décoder l'image. Format non supporté.")

    # --- Resize to max 640px ---
    h_orig, w_orig = img.shape[:2]
    scale = min(MAX_IMAGE_DIM / w_orig, MAX_IMAGE_DIM / h_orig, 1.0)
    if scale < 1.0:
        img = cv2.resize(img, (int(w_orig * scale), int(h_orig * scale)))
    h, w = img.shape[:2]

    # --- Store original (compressed) ---
    original_b64 = _encode_image(img, quality=70)

    # --- MediaPipe ---
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = _face_mesh.process(img_rgb)

    if not results.multi_face_landmarks:
        raise ValueError("Aucun visage détecté. Assurez-vous d'être bien centré et éclairé.")

    lm = results.multi_face_landmarks[0].landmark

    # --- Extract key pixel coordinates ---
    left_iris   = _px(lm, IDX_LEFT_IRIS_CENTER,  w, h)
    right_iris  = _px(lm, IDX_RIGHT_IRIS_CENTER, w, h)

    # Geometric eye centers (midpoint of inner+outer corners)
    left_cx  = (lm[IDX_LEFT_EYE_OUTER].x  + lm[IDX_LEFT_EYE_INNER].x)  / 2 * w
    left_cy  = (lm[IDX_LEFT_EYE_TOP].y    + lm[IDX_LEFT_EYE_BOTTOM].y) / 2 * h
    right_cx = (lm[IDX_RIGHT_EYE_INNER].x + lm[IDX_RIGHT_EYE_OUTER].x) / 2 * w
    right_cy = (lm[IDX_RIGHT_EYE_TOP].y   + lm[IDX_RIGHT_EYE_BOTTOM].y)/ 2 * h

    # Inter-pupillary distance in pixels
    ipd_pixels = math.hypot(right_iris[0] - left_iris[0],
                             right_iris[1] - left_iris[1])
    if ipd_pixels < 10:
        raise ValueError("Yeux trop petits dans l'image. Rapprochez-vous de la caméra.")

    mm_per_pixel = REAL_IPD_MM / ipd_pixels

    # --- Iris radii for annotation ---
    left_radius  = _iris_radius(lm, IDX_LEFT_IRIS_CENTER,  IDX_LEFT_IRIS_RING,  w, h)
    right_radius = _iris_radius(lm, IDX_RIGHT_IRIS_CENTER, IDX_RIGHT_IRIS_RING, w, h)

    # --- Deviations (iris centre vs geometric eye centre) ---
    left_dev_x_px  = left_iris[0]  - left_cx
    left_dev_y_px  = left_iris[1]  - left_cy
    right_dev_x_px = right_iris[0] - right_cx
    right_dev_y_px = right_iris[1] - right_cy

    left_dev_x_mm  = left_dev_x_px  * mm_per_pixel
    left_dev_y_mm  = left_dev_y_px  * mm_per_pixel
    right_dev_x_mm = right_dev_x_px * mm_per_pixel
    right_dev_y_mm = right_dev_y_px * mm_per_pixel

    left_dev_h_deg  = math.degrees(math.atan2(left_dev_x_mm,  VIEWING_DISTANCE_MM))
    left_dev_v_deg  = math.degrees(math.atan2(left_dev_y_mm,  VIEWING_DISTANCE_MM))
    right_dev_h_deg = math.degrees(math.atan2(right_dev_x_mm, VIEWING_DISTANCE_MM))
    right_dev_v_deg = math.degrees(math.atan2(right_dev_y_mm, VIEWING_DISTANCE_MM))

    # Apply kappa angle correction (subtract physiological offset)
    left_dev_h_deg  -= KAPPA_CORRECTION_DEG * (1 if left_dev_h_deg  >= 0 else -1)
    right_dev_h_deg -= KAPPA_CORRECTION_DEG * (1 if right_dev_h_deg >= 0 else -1)

    # Clamp negatives to 0 after correction
    left_dev_h_deg  = max(0.0, left_dev_h_deg)  if left_dev_h_deg  > 0 else min(0.0, left_dev_h_deg)
    right_dev_h_deg = max(0.0, right_dev_h_deg) if right_dev_h_deg > 0 else min(0.0, right_dev_h_deg)

    # Total deviation = worst horizontal eye
    total_h   = max(abs(left_dev_h_deg), abs(right_dev_h_deg))
    total_v   = max(abs(left_dev_v_deg), abs(right_dev_v_deg))
    total_deg = math.hypot(total_h, total_v)

    prism_diopters = math.tan(math.radians(total_deg)) * 100

    classification = _classify(total_deg)

    # --- Head pose estimation ---
    face_w_l   = (lm[IDX_NOSE_TIP].x - lm[IDX_FACE_LEFT].x)  * w
    face_w_r   = (lm[IDX_FACE_RIGHT].x - lm[IDX_NOSE_TIP].x) * w
    denom      = face_w_l + face_w_r
    yaw_deg    = ((face_w_l - face_w_r) / denom * 90) if denom > 0 else 0.0

    nose_chin    = (lm[IDX_CHIN].y     - lm[IDX_NOSE_TIP].y)  * h
    nose_fore    = (lm[IDX_NOSE_TIP].y - lm[IDX_FOREHEAD].y)  * h
    denom_p      = nose_chin + nose_fore
    pitch_deg    = ((nose_chin - nose_fore) / denom_p * 60) if denom_p > 0 else 0.0

    quality_score = max(0.0, min(1.0, 1.0 - abs(yaw_deg) / 45.0))

    # --- Annotate image ---
    ann = img.copy()

    # Classification colour (BGR)
    colour_map = {
        "normal": (76, 175, 80),
        "leger":  (33, 193, 255),
        "modere": (0,  152, 255),
        "severe": (54, 67,  244),
    }
    cls_colour = colour_map.get(classification, (255, 255, 255))

    # Iris circles
    cv2.circle(ann, (int(left_iris[0]),  int(left_iris[1])),
               max(2, int(left_radius)),  (255, 255,   0), 2)   # cyan
    cv2.circle(ann, (int(right_iris[0]), int(right_iris[1])),
               max(2, int(right_radius)), (0,   255, 255), 2)   # yellow

    # Eye centre markers
    for cx_pt, cy_pt in [(left_cx, left_cy), (right_cx, right_cy)]:
        xi, yi = int(cx_pt), int(cy_pt)
        cv2.line(ann, (xi - 6, yi), (xi + 6, yi), (0, 255, 0), 1)
        cv2.line(ann, (xi, yi - 6), (xi, yi + 6), (0, 255, 0), 1)

    # Deviation arrows (5× magnified)
    MAG = 5
    for (ix, iy), (ex, ey), (dx, dy) in [
        (left_iris,  (left_cx,  left_cy),  (left_dev_x_px,  left_dev_y_px)),
        (right_iris, (right_cx, right_cy), (right_dev_x_px, right_dev_y_px)),
    ]:
        if abs(dx) > 1 or abs(dy) > 1:
            cv2.arrowedLine(
                ann,
                (int(ex), int(ey)),
                (int(ex + dx * MAG), int(ey + dy * MAG)),
                (0, 0, 255), 2, tipLength=0.3,
            )

    # Text overlay
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.rectangle(ann, (0, 0), (w, 90), (0, 0, 0), -1)
    cv2.putText(ann, f"OG: {left_dev_h_deg:+.1f}dH / {left_dev_v_deg:+.1f}dV",
                (8, 22), font, 0.55, (255, 255, 255), 1)
    cv2.putText(ann, f"OD: {right_dev_h_deg:+.1f}dH / {right_dev_v_deg:+.1f}dV",
                (8, 44), font, 0.55, (255, 255, 255), 1)
    cv2.putText(ann, f"Total: {total_deg:.1f}deg = {prism_diopters:.1f}PD",
                (8, 66), font, 0.65, cls_colour, 2)
    cv2.putText(ann, classification.upper(),
                (w - 100, 22), font, 0.65, cls_colour, 2)

    annotated_b64  = _encode_image(ann, quality=80)
    thumbnail_b64  = _make_thumbnail(ann)

    return {
        "image_original_b64":  original_b64,
        "image_annotated_b64": annotated_b64,
        "image_thumbnail_b64": thumbnail_b64,
        "left_iris":           left_iris,
        "right_iris":          right_iris,
        "left_center":         (left_cx, left_cy),
        "right_center":        (right_cx, right_cy),
        "ipd_pixels":          ipd_pixels,
        "left_dev_h":          round(left_dev_h_deg,  2),
        "left_dev_v":          round(left_dev_v_deg,  2),
        "right_dev_h":         round(right_dev_h_deg, 2),
        "right_dev_v":         round(right_dev_v_deg, 2),
        "total_deg":           round(total_deg,        2),
        "prism_diopters":      round(prism_diopters,   2),
        "classification":      classification,
        "yaw_deg":             round(yaw_deg,   1),
        "pitch_deg":           round(pitch_deg, 1),
        "quality_score":       round(quality_score, 2),
    }
