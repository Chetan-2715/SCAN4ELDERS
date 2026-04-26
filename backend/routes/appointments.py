from datetime import datetime, date, time, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.appointment import Appointment, SlotTemplate
from routes.auth import get_current_user_id
from services.notification_service import create_notification


router = APIRouter(prefix="/appointments", tags=["Appointments"])
security = HTTPBearer()


class AppointmentBook(BaseModel):
    doctor_id: int | None = None
    appointment_date: str
    slot_start: str
    slot_end: str
    reason: str | None = None


class AppointmentStatusUpdate(BaseModel):
    status: str


def get_actor(auth: HTTPAuthorizationCredentials, db: Session):
    user_id = get_current_user_id(auth.credentials)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/book")
async def book_appointment(
    payload: AppointmentBook,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    actor = get_actor(auth, db)
    if actor.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments")

    try:
        appointment_date = datetime.strptime(payload.appointment_date, "%Y-%m-%d").date()
        slot_start = datetime.strptime(payload.slot_start, "%H:%M").time()
        slot_end = datetime.strptime(payload.slot_end, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date/time format")

    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == payload.doctor_id,
        Appointment.appointment_date == appointment_date,
        Appointment.slot_start == slot_start,
        Appointment.status.in_(["booked", "confirmed"]),
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="This slot is already booked")

    appointment = Appointment(
        patient_id=actor.id,
        doctor_id=payload.doctor_id,
        appointment_date=appointment_date,
        slot_start=slot_start,
        slot_end=slot_end,
        reason=payload.reason,
        status="booked",
        created_by=actor.id,
    )
    db.add(appointment)
    db.flush()

    if payload.doctor_id:
        create_notification(
            db,
            payload.doctor_id,
            "appointment",
            "New appointment booked",
            f"{actor.name} booked {appointment_date} {payload.slot_start}-{payload.slot_end}",
            {"appointment_id": appointment.id},
        )

    create_notification(
        db,
        actor.id,
        "appointment",
        "Appointment booked",
        f"Your appointment is booked for {appointment_date} at {payload.slot_start}.",
        {"appointment_id": appointment.id},
    )

    db.commit()
    db.refresh(appointment)

    return {"success": True, "appointment": {
        "id": appointment.id,
        "doctor_id": appointment.doctor_id,
        "appointment_date": str(appointment.appointment_date),
        "slot_start": appointment.slot_start.strftime("%H:%M"),
        "slot_end": appointment.slot_end.strftime("%H:%M"),
        "status": appointment.status,
        "reason": appointment.reason,
    }}


@router.get("/my")
async def my_appointments(
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    actor = get_actor(auth, db)

    query = db.query(Appointment)
    if actor.role == "patient":
        query = query.filter(Appointment.patient_id == actor.id)
    elif actor.role == "doctor":
        query = query.filter(Appointment.doctor_id == actor.id)

    appointments = query.order_by(Appointment.appointment_date.desc(), Appointment.slot_start.desc()).limit(100).all()

    return {
        "appointments": [
            {
                "id": appt.id,
                "patient_id": appt.patient_id,
                "doctor_id": appt.doctor_id,
                "appointment_date": str(appt.appointment_date),
                "slot_start": appt.slot_start.strftime("%H:%M"),
                "slot_end": appt.slot_end.strftime("%H:%M"),
                "reason": appt.reason,
                "status": appt.status,
            }
            for appt in appointments
        ]
    }


@router.get("/slots")
async def available_slots(doctor_id: int, appointment_date: str, db: Session = Depends(get_db)):
    try:
        day = datetime.strptime(appointment_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    templates = db.query(SlotTemplate).filter(
        SlotTemplate.doctor_id == doctor_id,
        SlotTemplate.day_of_week == day.weekday(),
        SlotTemplate.is_active.is_(True),
    ).all()

    candidate_slots = []
    if templates:
        for template in templates:
            candidate_slots.append({
                "slot_start": template.slot_start.strftime("%H:%M"),
                "slot_end": template.slot_end.strftime("%H:%M"),
            })
    else:
        start_dt = datetime.combine(day, time(9, 0))
        for i in range(16):
            s = start_dt + timedelta(minutes=30 * i)
            e = s + timedelta(minutes=30)
            candidate_slots.append({"slot_start": s.strftime("%H:%M"), "slot_end": e.strftime("%H:%M")})

    booked = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == day,
        Appointment.status.in_(["booked", "confirmed"]),
    ).all()

    booked_starts = {b.slot_start.strftime("%H:%M") for b in booked}
    available = [slot for slot in candidate_slots if slot["slot_start"] not in booked_starts]
    return {"date": appointment_date, "doctor_id": doctor_id, "slots": available}


@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: int,
    payload: AppointmentStatusUpdate,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    actor = get_actor(auth, db)
    if actor.role not in ["nurse", "doctor"]:
        raise HTTPException(status_code=403, detail="Only nurse/doctor can update appointment status")

    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment.status = payload.status
    create_notification(
        db,
        appointment.patient_id,
        "appointment",
        "Appointment status updated",
        f"Your appointment status is now {payload.status}.",
        {"appointment_id": appointment.id, "status": payload.status},
    )
    db.commit()

    return {"success": True, "message": "Appointment status updated"}
