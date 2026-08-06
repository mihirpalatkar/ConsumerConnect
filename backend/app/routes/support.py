from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.support_service import toggle_support, get_support_count

support_bp = Blueprint("supports", __name__, url_prefix="/api/supports")


@support_bp.route("/<int:issue_id>", methods=["POST"])
@jwt_required()
def support(issue_id):

    result = toggle_support(issue_id, int(get_jwt_identity()))

    return (
        jsonify({"success": result["success"], "message": result["message"]}),
        result["status_code"],
    )


@support_bp.route("/<int:issue_id>", methods=["GET"])
@jwt_required()
def count(issue_id):

    return jsonify({"success": True, "support_count": get_support_count(issue_id)}), 200
