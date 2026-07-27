from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.notification_service import (
    get_notifications,
    mark_as_read,
    mark_all_as_read,
    get_unread_count
)

notification_bp = Blueprint(
    "notification",
    __name__,
    url_prefix="/api/notifications"
)
@notification_bp.route("", methods=["GET"])
@jwt_required()
def notifications():

    user_id = get_jwt_identity()

    notifications = get_notifications(user_id)

    data = []

    for notification in notifications:
        data.append({
            "id": notification.id,
            "type": notification.type,
            "message": notification.message,
            "issue_id": notification.issue_id,
            "is_read": notification.is_read,
            "created_at": notification.created_at
        })

    return {
        "success": True,
        "notifications": data
    }, 200
@notification_bp.route("/<int:notification_id>/read", methods=["PATCH"])
@jwt_required()
def read_notification(notification_id):

    user_id = get_jwt_identity()

    notification = mark_as_read(
        notification_id,
        user_id
    )

    if not notification:
        return {
            "success": False,
            "message": "Notification not found"
        }, 404

    return {
        "success": True,
        "message": "Notification marked as read"
    }, 200
@notification_bp.route("/read-all", methods=["PATCH"])
@jwt_required()
def read_all():

    user_id = get_jwt_identity()

    count = mark_all_as_read(user_id)

    return {
        "success": True,
        "updated": count
    }, 200
@notification_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def unread():

    user_id = get_jwt_identity()

    count = get_unread_count(user_id)

    return {
        "success": True,
        "unread": count
    }, 200
