from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.notification import Notification
from models.patient_medication import PatientMedication
from routes.auth import get_current_user_id
from services.notification_service import create_notification


router = APIRouter(prefix="/notifications", tags=["Notifications"])
security = HTTPBearer()


def get_user(auth: HTTPAuthorizationCredentials, db: Session):
    user_id = get_current_user_id(auth.credentials)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/my")
async def my_notifications(
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user = get_user(auth, db)
    rows = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(200).all()

    return {
        "notifications": [
            {
                "id": row.id,
                "type": row.type,
                "title": row.title,
                "message": row.message,
                "payload_json": row.payload_json,
                "is_read": row.is_read,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]
    }


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user = get_user(auth, db)
    row = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")

    row.is_read = True
    row.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True}


@router.post("/mark-all-read")
async def mark_all_read(
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user = get_user(auth, db)
    db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read.is_(False)).update(
        {"is_read": True, "read_at": datetime.now(timezone.utc)},
        synchronize_session=False,
    )
    db.commit()
    return {"success": True}


@router.post("/medicine-reminder-run")
async def run_medicine_reminders(
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    actor = get_user(auth, db)
    if actor.role not in ["nurse", "doctor"]:
        raise HTTPException(status_code=403, detail="Only nurse/doctor can trigger reminders")

    now = datetime.now()
    current_time = now.strftime("%H:%M")

    meds = db.query(PatientMedication).filter(PatientMedication.active.is_(True)).all()
    generated = 0

    for med in meds:
        timing = med.timing_json or {}
        times = timing.get("times", []) if isinstance(timing, dict) else []
        if current_time in times:
            create_notification(
                db,
                med.patient_id,
                "medicine",
                "Time to take medicine",
                f"Please take {med.medicine_name} now.",
                {"medication_id": med.id, "time": current_time},
            )
            generated += 1

    db.commit()
    return {"success": True, "generated": generated, "time": current_time}
