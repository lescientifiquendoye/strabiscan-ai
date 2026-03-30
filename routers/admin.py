import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db, Analysis

router = APIRouter()
security = HTTPBearer()

SECRET_KEY     = os.environ.get("SECRET_KEY", "change-this-secret-key-32chars!!")
ALGORITHM      = "HS256"
TOKEN_EXPIRE_H = 24

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "strabiscan2024")


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def _create_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_H)
    return jwt.encode(
        {"sub": username, "role": "admin", "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM,
    )


async def _require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not admin")
        return payload
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token invalide ou expiré")


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class ValidateRequest(BaseModel):
    rating: Optional[int] = None          # 1-5
    correction: Optional[str] = None      # corrected classification
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/login")
async def login(body: LoginRequest):
    if body.username != ADMIN_USERNAME or body.password != ADMIN_PASSWORD:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiants incorrects")
    token = _create_token(body.username)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/analyses")
async def list_analyses(
    page: int = 1,
    per_page: int = 20,
    filter: str = "all",        # all | validated | unvalidated
    db: Session = Depends(get_db),
    _: dict = Depends(_require_admin),
):
    query = db.query(Analysis)
    if filter == "validated":
        query = query.filter(Analysis.validated == True)
    elif filter == "unvalidated":
        query = query.filter(Analysis.validated == False)

    total  = query.count()
    items  = query.order_by(Analysis.created_at.desc()) \
                  .offset((page - 1) * per_page) \
                  .limit(per_page) \
                  .all()

    return JSONResponse({
        "total": total,
        "page":  page,
        "per_page": per_page,
        "items": [_summary(a) for a in items],
    })


@router.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(_require_admin),
):
    rec = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not rec:
        raise HTTPException(404, "Analyse introuvable")
    return JSONResponse(_detail(rec))


@router.put("/analyses/{analysis_id}/validate")
async def validate_analysis(
    analysis_id: int,
    body: ValidateRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(_require_admin),
):
    rec = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not rec:
        raise HTTPException(404, "Analyse introuvable")

    rec.validated            = True
    rec.validator_rating     = body.rating
    rec.validator_correction = body.correction
    rec.validator_notes      = body.notes
    rec.validated_at         = datetime.utcnow()
    db.commit()
    return {"status": "ok", "id": analysis_id}


@router.get("/stats")
async def stats(
    db: Session = Depends(get_db),
    _: dict = Depends(_require_admin),
):
    total      = db.query(func.count(Analysis.id)).scalar()
    validated  = db.query(func.count(Analysis.id)).filter(Analysis.validated == True).scalar()
    correct    = db.query(func.count(Analysis.id)).filter(
        Analysis.validated == True,
        Analysis.validator_correction == None,
    ).scalar()
    accuracy = round(correct / validated * 100, 1) if validated > 0 else None

    dist = db.query(Analysis.classification, func.count(Analysis.id)) \
             .group_by(Analysis.classification).all()
    distribution = {cls: cnt for cls, cnt in dist}

    return JSONResponse({
        "total":        total,
        "validated":    validated,
        "accuracy_pct": accuracy,
        "distribution": distribution,
    })


# ---------------------------------------------------------------------------
# Serialisers
# ---------------------------------------------------------------------------

def _summary(a: Analysis) -> dict:
    return {
        "id":            a.id,
        "created_at":    a.created_at.isoformat() if a.created_at else None,
        "thumbnail":     a.image_thumbnail,
        "classification":a.classification,
        "total_deg":     a.total_deviation_deg,
        "prism_diopters":a.prism_diopters,
        "validated":     a.validated,
        "validator_correction": a.validator_correction,
    }


def _detail(a: Analysis) -> dict:
    return {
        **_summary(a),
        "image_annotated":   a.image_annotated,
        "left_dev_h":        a.left_dev_h_deg,
        "left_dev_v":        a.left_dev_v_deg,
        "right_dev_h":       a.right_dev_h_deg,
        "right_dev_v":       a.right_dev_v_deg,
        "ipd_pixels":        a.ipd_pixels,
        "face_yaw_deg":      a.face_yaw_deg,
        "quality_score":     a.quality_score,
        "validator_rating":  a.validator_rating,
        "validator_notes":   a.validator_notes,
        "validated_at":      a.validated_at.isoformat() if a.validated_at else None,
    }
