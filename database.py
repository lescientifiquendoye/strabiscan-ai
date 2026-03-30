import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, Float, String,
    Boolean, DateTime, Text
)
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = os.environ.get("DB_PATH", "./strabismus.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Analysis(Base):
    __tablename__ = "analyses"

    id                   = Column(Integer, primary_key=True, index=True)
    created_at           = Column(DateTime, default=datetime.utcnow)

    # Stored images (base64 JPEG)
    image_original       = Column(Text, nullable=True)
    image_annotated      = Column(Text, nullable=True)
    image_thumbnail      = Column(Text, nullable=True)   # 80px wide

    # Raw landmark measurements (pixel coords)
    left_iris_x          = Column(Float, nullable=True)
    left_iris_y          = Column(Float, nullable=True)
    right_iris_x         = Column(Float, nullable=True)
    right_iris_y         = Column(Float, nullable=True)
    left_eye_center_x    = Column(Float, nullable=True)
    left_eye_center_y    = Column(Float, nullable=True)
    right_eye_center_x   = Column(Float, nullable=True)
    right_eye_center_y   = Column(Float, nullable=True)
    ipd_pixels           = Column(Float, nullable=True)

    # Analysis results
    left_dev_h_deg       = Column(Float, nullable=True)
    left_dev_v_deg       = Column(Float, nullable=True)
    right_dev_h_deg      = Column(Float, nullable=True)
    right_dev_v_deg      = Column(Float, nullable=True)
    total_deviation_deg  = Column(Float, nullable=True)
    prism_diopters       = Column(Float, nullable=True)
    classification       = Column(String, nullable=True)

    # Head pose (quality metadata)
    face_yaw_deg         = Column(Float, nullable=True)
    face_pitch_deg       = Column(Float, nullable=True)
    quality_score        = Column(Float, nullable=True)

    # Admin validation
    validated            = Column(Boolean, default=False)
    validator_rating     = Column(Integer, nullable=True)
    validator_correction = Column(String, nullable=True)
    validator_notes      = Column(Text, nullable=True)
    validated_at         = Column(DateTime, nullable=True)
