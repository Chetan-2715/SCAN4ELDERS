from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.appointment import Appointment
from models.patient_medication import PatientMedication
from routes.auth import get_current_user_id
from services.notification_service import create_notification


router = APIRouter(prefix="/nurse", tags=["Nurse"])
security = HTTPBearer()


class PatientMedicationCreate(BaseModel):
    medicine_name: str
    dosage: str | None = None
    frequency: str | None = None
    timing_json: dict | None = None
    start_date: str | None = None
    end_date: str | None = None
    notes: str | None = None


class PatientMedicationUpdate(BaseModel):
    medicine_name: str | None = None
    dosage: str | None = None
    frequency: str | None = None
    timing_json: dict | None = None
    start_date: str | None = None
    end_date: str | None = None
    notes: str | None = None
    active: bool | None = None


def ensure_nurse(auth: HTTPAuthorizationCredentials, db: Session):
    user_id = get_current_user_id(auth.credentials)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "nurse":
        raise HTTPException(status_code=403, detail="Only nurse can perform this action")
    return user


@router.get("/bookings")
async def nurse_bookings(
    date: str | None = None,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    ensure_nurse(auth, db)
    query = db.query(Appointment)
    if date:
        try:
            target = datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(Appointment.appointment_date == target)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    rows = query.order_by(Appointment.appointment_date.asc(), Appointment.slot_start.asc()).limit(200).all()

    user_cache = {}
    def get_name(user_id: int | None):
        if user_id is None:
            return None
        if user_id in user_cache:
            return user_cache[user_id]
        user = db.query(User).filter(User.id == user_id).first()
        name = user.name if user else None
        user_cache[user_id] = name
        return name

    return {
        "bookings": [
            {
                "id": row.id,
                "patient_id": row.patient_id,
                "patient_name": get_name(row.patient_id),
                "doctor_id": row.doctor_id,
                "doctor_name": get_name(row.doctor_id),
                "appointment_date": str(row.appointment_date),
                "slot_start": row.slot_start.strftime("%H:%M"),
                "slot_end": row.slot_end.strftime("%H:%M"),
                "reason": row.reason,
                "status": row.status,
            }
            for row in rows
        ]
    }


@router.post("/patients/{patient_id}/medications")
async def add_patient_medication(
    patient_id: int,
    payload: PatientMedicationCreate,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    nurse = ensure_nurse(auth, db)
    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    start_date = datetime.strptime(payload.start_date, "%Y-%m-%d").date() if payload.start_date else None
    end_date = datetime.strptime(payload.end_date, "%Y-%m-%d").date() if payload.end_date else None

    med = PatientMedication(
        patient_id=patient_id,
        nurse_id=nurse.id,
        medicine_name=payload.medicine_name,
        dosage=payload.dosage,
        frequency=payload.frequency,
        timing_json=payload.timing_json,
        start_date=start_date,
        end_date=end_date,
        notes=payload.notes,
        active=True,
    )
    db.add(med)
    db.flush()

    create_notification(
        db,
        patient_id,
        "medicine",
        "Medication added by nurse",
        f"{payload.medicine_name} has been assigned to you.",
        {"patient_medication_id": med.id},
    )

    db.commit()
    db.refresh(med)

    return {"success": True, "medication": {
        "id": med.id,
        "medicine_name": med.medicine_name,
        "dosage": med.dosage,
        "frequency": med.frequency,
        "timing_json": med.timing_json,
        "active": med.active,
    }}


@router.get("/patients/{patient_id}/medications")
async def get_patient_medications(
    patient_id: int,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = get_current_user_id(auth.credentials)
    actor = db.query(User).filter(User.id == user_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="User not found")
    if actor.role != "nurse" and not (actor.role == "patient" and actor.id == patient_id):
        raise HTTPException(status_code=403, detail="Access denied")

    meds = db.query(PatientMedication).filter(PatientMedication.patient_id == patient_id).order_by(PatientMedication.created_at.desc()).all()
    return {
        "medications": [
            {
                "id": med.id,
                "medicine_name": med.medicine_name,
                "dosage": med.dosage,
                "frequency": med.frequency,
                "timing_json": med.timing_json,
                "start_date": str(med.start_date) if med.start_date else None,
                "end_date": str(med.end_date) if med.end_date else None,
                "notes": med.notes,
                "active": med.active,
            }
            for med in meds
        ]
    }


@router.put("/medications/{medication_id}")
async def update_patient_medication(
    medication_id: int,
    payload: PatientMedicationUpdate,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    nurse = ensure_nurse(auth, db)
    med = db.query(PatientMedication).filter(PatientMedication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    if payload.medicine_name is not None:
        med.medicine_name = payload.medicine_name
    if payload.dosage is not None:
        med.dosage = payload.dosage
    if payload.frequency is not None:
        med.frequency = payload.frequency
    if payload.timing_json is not None:
        med.timing_json = payload.timing_json
    if payload.start_date is not None:
        med.start_date = datetime.strptime(payload.start_date, "%Y-%m-%d").date()
    if payload.end_date is not None:
        med.end_date = datetime.strptime(payload.end_date, "%Y-%m-%d").date()
    if payload.notes is not None:
        med.notes = payload.notes
    if payload.active is not None:
        med.active = payload.active
    med.nurse_id = nurse.id

    create_notification(
        db,
        med.patient_id,
        "medicine",
        "Medication updated",
        f"Your nurse updated {med.medicine_name} schedule/details.",
        {"patient_medication_id": med.id},
    )

    db.commit()
    return {"success": True, "message": "Medication updated"}


@router.delete("/medications/{medication_id}")
async def delete_patient_medication(
    medication_id: int,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    ensure_nurse(auth, db)
    med = db.query(PatientMedication).filter(PatientMedication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    patient_id = med.patient_id
    med_name = med.medicine_name
    db.delete(med)

    create_notification(
        db,
        patient_id,
        "medicine",
        "Medication removed",
        f"{med_name} was removed from your active medication plan.",
        {},
    )

    db.commit()
    return {"success": True, "message": "Medication removed"}
