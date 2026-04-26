from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.sql import func
from database import Base


class PatientMedication(Base):
    __tablename__ = "patient_medications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    nurse_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    medicine_name = Column(String(300), nullable=False)
    dosage = Column(String(200), nullable=True)
    frequency = Column(String(100), nullable=True)
    timing_json = Column(JSON, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
