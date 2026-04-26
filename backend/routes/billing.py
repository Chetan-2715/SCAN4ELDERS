from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.billing import Bill, BillItem
from routes.auth import get_current_user_id
from services.notification_service import create_notification


router = APIRouter(prefix="/billing", tags=["Billing"])
security = HTTPBearer()


class BillItemPayload(BaseModel):
    item_type: str
    description: str
    qty: float = 1
    unit_price: float = 0


class BillCreate(BaseModel):
    patient_id: int
    appointment_id: int | None = None
    due_date: str | None = None
    discount: float = 0
    tax: float = 0
    items: list[BillItemPayload]


class BillStatusUpdate(BaseModel):
    status: str


def get_actor(auth: HTTPAuthorizationCredentials, db: Session):
    user_id = get_current_user_id(auth.credentials)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/create")
async def create_bill(
    payload: BillCreate,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    actor = get_actor(auth, db)
    if actor.role != "nurse":
        raise HTTPException(status_code=403, detail="Only nurse can create bill")

    subtotal = Decimal("0")
    computed_items = []
    for item in payload.items:
        qty = Decimal(str(item.qty))
        unit_price = Decimal(str(item.unit_price))
        amount = qty * unit_price
        subtotal += amount
        computed_items.append((item, amount))

    discount = Decimal(str(payload.discount))
    tax = Decimal(str(payload.tax))
    total = subtotal - discount + tax

    due_date = datetime.strptime(payload.due_date, "%Y-%m-%d").date() if payload.due_date else None

    bill = Bill(
        patient_id=payload.patient_id,
        nurse_id=actor.id,
        appointment_id=payload.appointment_id,
        subtotal=subtotal,
        discount=discount,
        tax=tax,
        total=total,
        status="unpaid",
        due_date=due_date,
    )
    db.add(bill)
    db.flush()

    for original, amount in computed_items:
        db.add(BillItem(
            bill_id=bill.id,
            item_type=original.item_type,
            description=original.description,
            qty=Decimal(str(original.qty)),
            unit_price=Decimal(str(original.unit_price)),
            amount=amount,
        ))

    create_notification(
        db,
        payload.patient_id,
        "billing",
        "New bill generated",
        f"A bill of {float(total):.2f} has been generated.",
        {"bill_id": bill.id},
    )

    db.commit()
    db.refresh(bill)

    return {"success": True, "bill_id": bill.id, "total": float(bill.total), "status": bill.status}


@router.get("/patient/{patient_id}")
async def get_patient_bills(
    patient_id: int,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    actor = get_actor(auth, db)
    if actor.role == "patient" and actor.id != patient_id:
        raise HTTPException(status_code=403, detail="Cannot access another patient's bills")

    bills = db.query(Bill).filter(Bill.patient_id == patient_id).order_by(Bill.created_at.desc()).all()
    output = []
    for bill in bills:
        items = db.query(BillItem).filter(BillItem.bill_id == bill.id).all()
        output.append({
            "id": bill.id,
            "patient_id": bill.patient_id,
            "appointment_id": bill.appointment_id,
            "subtotal": float(bill.subtotal),
            "discount": float(bill.discount),
            "tax": float(bill.tax),
            "total": float(bill.total),
            "status": bill.status,
            "due_date": str(bill.due_date) if bill.due_date else None,
            "created_at": bill.created_at.isoformat() if bill.created_at else None,
            "items": [
                {
                    "id": item.id,
                    "item_type": item.item_type,
                    "description": item.description,
                    "qty": float(item.qty),
                    "unit_price": float(item.unit_price),
                    "amount": float(item.amount),
                }
                for item in items
            ],
        })

    return {"bills": output}


@router.patch("/{bill_id}/status")
async def update_bill_status(
    bill_id: int,
    payload: BillStatusUpdate,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    actor = get_actor(auth, db)
    if actor.role != "nurse":
        raise HTTPException(status_code=403, detail="Only nurse can update bill status")

    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill.status = payload.status
    create_notification(
        db,
        bill.patient_id,
        "billing",
        "Bill status updated",
        f"Bill #{bill.id} status is now {payload.status}.",
        {"bill_id": bill.id, "status": payload.status},
    )
    db.commit()
    return {"success": True, "message": "Bill status updated"}


@router.get("/{bill_id}/pdf")
async def get_bill_pdf_payload(
    bill_id: int,
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    actor = get_actor(auth, db)
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if actor.role == "patient" and actor.id != bill.patient_id:
        raise HTTPException(status_code=403, detail="Cannot access this bill")

    items = db.query(BillItem).filter(BillItem.bill_id == bill.id).all()
    return {
        "bill_id": bill.id,
        "format": "json-pdf-ready",
        "patient_id": bill.patient_id,
        "subtotal": float(bill.subtotal),
        "discount": float(bill.discount),
        "tax": float(bill.tax),
        "total": float(bill.total),
        "status": bill.status,
        "items": [
            {
                "description": item.description,
                "qty": float(item.qty),
                "unit_price": float(item.unit_price),
                "amount": float(item.amount),
            }
            for item in items
        ],
    }
