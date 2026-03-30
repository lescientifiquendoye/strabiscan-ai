import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db, Analysis
from services.strabismus import analyze_image

router = APIRouter()

# Single-worker executor — MediaPipe FaceMesh is NOT thread-safe
_executor = ThreadPoolExecutor(max_workers=1)


@router.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(400, "Format non supporté. Utilisez JPEG ou PNG.")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB guard
        raise HTTPException(400, "Image trop grande (max 10 MB).")

    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(_executor, analyze_image, image_bytes)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    record = Analysis(
        image_original        = result["image_original_b64"],
        image_annotated       = result["image_annotated_b64"],
        image_thumbnail       = result["image_thumbnail_b64"],
        left_iris_x           = result["left_iris"][0],
        left_iris_y           = result["left_iris"][1],
        right_iris_x          = result["right_iris"][0],
        right_iris_y          = result["right_iris"][1],
        left_eye_center_x     = result["left_center"][0],
        left_eye_center_y     = result["left_center"][1],
        right_eye_center_x    = result["right_center"][0],
        right_eye_center_y    = result["right_center"][1],
        ipd_pixels            = result["ipd_pixels"],
        left_dev_h_deg        = result["left_dev_h"],
        left_dev_v_deg        = result["left_dev_v"],
        right_dev_h_deg       = result["right_dev_h"],
        right_dev_v_deg       = result["right_dev_v"],
        total_deviation_deg   = result["total_deg"],
        prism_diopters        = result["prism_diopters"],
        classification        = result["classification"],
        face_yaw_deg          = result.get("yaw_deg"),
        face_pitch_deg        = result.get("pitch_deg"),
        quality_score         = result.get("quality_score"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    left_pd  = round(abs(result["left_dev_h"])  / 0.57, 2)
    right_pd = round(abs(result["right_dev_h"]) / 0.57, 2)

    return JSONResponse({
        "id": record.id,
        "created_at": record.created_at.isoformat(),
        "left_eye": {
            "deviation_h_deg": result["left_dev_h"],
            "deviation_v_deg": result["left_dev_v"],
            "prism_diopters":  left_pd,
        },
        "right_eye": {
            "deviation_h_deg": result["right_dev_h"],
            "deviation_v_deg": result["right_dev_v"],
            "prism_diopters":  right_pd,
        },
        "total_deviation_deg": result["total_deg"],
        "prism_diopters":      result["prism_diopters"],
        "classification":      result["classification"],
        "annotated_image":     result["image_annotated_b64"],
        "quality": {
            "yaw_deg":       result.get("yaw_deg"),
            "pitch_deg":     result.get("pitch_deg"),
            "quality_score": result.get("quality_score"),
        },
    })
