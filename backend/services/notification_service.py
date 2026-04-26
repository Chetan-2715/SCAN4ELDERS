from models.notification import Notification


def create_notification(db, user_id: int, notification_type: str, title: str, message: str, payload: dict | None = None):
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        payload_json=payload or {},
        is_read=False,
    )
    db.add(notification)
    db.flush()
    return notification
