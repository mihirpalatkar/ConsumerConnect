from app.extensions import db
from app.models.notification import Notification


def create_notification(user_id, issue_id, notification_type, message):

    notification = Notification(
        user_id=user_id,
        issue_id=issue_id,
        type=notification_type,
        message=message
    )

    db.session.add(notification)
    db.session.commit()

    return notification


def get_notifications(user_id):

    return Notification.query.filter_by(
        user_id=user_id
    ).order_by(
        Notification.created_at.desc()
    ).all()


def mark_as_read(notification_id, user_id):

    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=user_id
    ).first()

    if not notification:
        return None

    notification.is_read = True

    db.session.commit()

    return notification


def mark_all_as_read(user_id):

    notifications = Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).all()

    for notification in notifications:
        notification.is_read = True

    db.session.commit()

    return len(notifications)


def get_unread_count(user_id):

    return Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).count()