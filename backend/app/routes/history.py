from flask import Blueprint
from flask_jwt_extended import jwt_required

from app.services.history_service import get_issue_history

history_bp = Blueprint("history", __name__, url_prefix="/api/issues")


@history_bp.route("/<int:issue_id>/history", methods=["GET"])
@jwt_required()
def issue_history(issue_id):

    history = get_issue_history(issue_id)

    data = []

    for item in history:
        data.append(
            {
                "id": item.id,
                "action": item.action,
                "performed_by": item.performed_by,
                "old_value": item.old_value,
                "new_value": item.new_value,
                "message": item.message,
                "created_at": item.created_at,
            }
        )

    return {"success": True, "history": data}, 200
