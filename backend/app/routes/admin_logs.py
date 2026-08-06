from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models.admin_log import AdminLog
from app.utils.admin import admin_required

admin_logs_bp = Blueprint("admin_logs", __name__, url_prefix="/api/admin/logs")


@admin_logs_bp.route("", methods=["GET"])
@jwt_required()
@admin_required
def get_all_logs():

    logs = AdminLog.query.order_by(AdminLog.created_at.desc()).all()

    return (
        jsonify(
            {
                "success": True,
                "count": len(logs),
                "logs": [
                    {
                        "id": log.id,
                        "admin_id": log.admin_id,
                        "action": log.action,
                        "target_type": log.target_type,
                        "target_id": log.target_id,
                        "details": log.details,
                        "created_at": log.created_at,
                    }
                    for log in logs
                ],
            }
        ),
        200,
    )


@admin_logs_bp.route("/<int:log_id>", methods=["GET"])
@jwt_required()
@admin_required
def get_log(log_id):

    log = AdminLog.query.get(log_id)

    if not log:
        return jsonify({"success": False, "message": "Log not found."}), 404

    return (
        jsonify(
            {
                "success": True,
                "log": {
                    "id": log.id,
                    "admin_id": log.admin_id,
                    "action": log.action,
                    "target_type": log.target_type,
                    "target_id": log.target_id,
                    "details": log.details,
                    "created_at": log.created_at,
                },
            }
        ),
        200,
    )
