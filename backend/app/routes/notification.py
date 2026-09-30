from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.notification_service import (
    get_notifications,
    mark_as_read,
    mark_all_as_read,
    get_unread_count,
)


notification_bp = Blueprint(
    "notification",
    __name__,
    url_prefix="/api/notifications",
)


# ============================================================
# HELPERS
# ============================================================

def get_identity():
    """
    Return the current JWT identity as a string.
    """

    identity = get_jwt_identity()

    if identity is None:
        return None

    return str(identity)


def get_user_id_from_identity():
    """
    Return a numeric consumer user ID.

    Company identities use the format:
        company:<id>

    Those are intentionally not treated as consumer user IDs.
    """

    identity = get_identity()

    if not identity:
        return None

    if identity.startswith("company:"):
        return None

    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None

    if user_id <= 0:
        return None

    return user_id


def is_company_identity():
    """
    Check whether the current JWT belongs to a company.
    """

    identity = get_identity()

    return bool(
        identity
        and identity.startswith("company:")
    )


# ============================================================
# GET NOTIFICATIONS
# ============================================================

@notification_bp.route(
    "",
    methods=["GET"],
)
@jwt_required()
def notifications():

    # --------------------------------------------------------
    # COMPANY
    # --------------------------------------------------------
    #
    # The current notification system stores notifications
    # against consumer user IDs. A company JWT uses the
    # company:<id> identity format, so there is currently no
    # valid consumer user ID to pass to get_notifications().
    #
    # Return an empty list rather than crashing.
    # --------------------------------------------------------

    if is_company_identity():

        return {
            "success": True,
            "notifications": [],
        }, 200

    # --------------------------------------------------------
    # CONSUMER
    # --------------------------------------------------------

    user_id = get_user_id_from_identity()

    if user_id is None:

        return {
            "success": False,
            "message": "Invalid user identity.",
        }, 401

    notifications = get_notifications(
        user_id
    )

    data = []

    for notification in notifications:

        data.append(
            {
                "id": notification.id,
                "type": notification.type,
                "message": notification.message,
                "issue_id": notification.issue_id,
                "is_read": notification.is_read,
                "created_at": notification.created_at,
            }
        )

    return {
        "success": True,
        "notifications": data,
    }, 200


# ============================================================
# MARK ONE NOTIFICATION AS READ
# ============================================================

@notification_bp.route(
    "/<int:notification_id>/read",
    methods=["PATCH"],
)
@jwt_required()
def read_notification(
    notification_id
):

    # --------------------------------------------------------
    # COMPANY
    # --------------------------------------------------------

    if is_company_identity():

        return {
            "success": False,
            "message": "Company notifications are not available yet.",
        }, 404

    # --------------------------------------------------------
    # CONSUMER
    # --------------------------------------------------------

    user_id = get_user_id_from_identity()

    if user_id is None:

        return {
            "success": False,
            "message": "Invalid user identity.",
        }, 401

    notification = mark_as_read(
        notification_id,
        user_id,
    )

    if not notification:

        return {
            "success": False,
            "message": "Notification not found",
        }, 404

    return {
        "success": True,
        "message": "Notification marked as read",
    }, 200


# ============================================================
# MARK ALL NOTIFICATIONS AS READ
# ============================================================

@notification_bp.route(
    "/read-all",
    methods=["PATCH"],
)
@jwt_required()
def read_all():

    # --------------------------------------------------------
    # COMPANY
    # --------------------------------------------------------

    if is_company_identity():

        return {
            "success": True,
            "updated": 0,
        }, 200

    # --------------------------------------------------------
    # CONSUMER
    # --------------------------------------------------------

    user_id = get_user_id_from_identity()

    if user_id is None:

        return {
            "success": False,
            "message": "Invalid user identity.",
        }, 401

    count = mark_all_as_read(
        user_id
    )

    return {
        "success": True,
        "updated": count,
    }, 200


# ============================================================
# GET UNREAD NOTIFICATION COUNT
# ============================================================

@notification_bp.route(
    "/unread-count",
    methods=["GET"],
)
@jwt_required()
def unread():

    # --------------------------------------------------------
    # COMPANY
    # --------------------------------------------------------

    if is_company_identity():

        return {
            "success": True,
            "unread": 0,
        }, 200

    # --------------------------------------------------------
    # CONSUMER
    # --------------------------------------------------------

    user_id = get_user_id_from_identity()

    if user_id is None:

        return {
            "success": False,
            "message": "Invalid user identity.",
        }, 401

    count = get_unread_count(
        user_id
    )

    return {
        "success": True,
        "unread": count,
    }, 200