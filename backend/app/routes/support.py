from flask import Blueprint, jsonify
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
)

from app.services.support_service import (
    toggle_support,
    get_support_count,
    has_user_supported,
)


support_bp = Blueprint(
    "supports",
    __name__,
    url_prefix="/api/supports",
)


# ============================================================
# TOGGLE SUPPORT
# ============================================================

@support_bp.route(
    "/<int:issue_id>",
    methods=["POST"],
)
@jwt_required()
def support(issue_id):

    user_id = int(
        get_jwt_identity()
    )

    result = toggle_support(
        issue_id,
        user_id,
    )

    if not result["success"]:
        return (
            jsonify({
                "success": False,
                "message": result["message"],
                "support_count": 0,
                "supported": False,
            }),
            result["status_code"],
        )

    return (
        jsonify({
            "success": True,
            "message": result["message"],
            "support_count": get_support_count(
                issue_id
            ),
            "supported": has_user_supported(
                issue_id,
                user_id,
            ),
        }),
        result["status_code"],
    )


# ============================================================
# GET SUPPORT STATUS
# ============================================================

@support_bp.route(
    "/<int:issue_id>",
    methods=["GET"],
)
@jwt_required()
def count(issue_id):

    user_id = int(
        get_jwt_identity()
    )

    return (
        jsonify({
            "success": True,
            "support_count": get_support_count(
                issue_id
            ),
            "supported": has_user_supported(
                issue_id,
                user_id,
            ),
        }),
        200,
    )