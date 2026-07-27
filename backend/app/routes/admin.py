from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.utils.admin import admin_required
from app.services.admin_service import (
    get_all_users,
    get_all_issues
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route("/test", methods=["GET"])
@jwt_required()
@admin_required
def admin_test():

    return jsonify({
        "success": True,
        "message": "Welcome Admin!"
    }), 200
@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@admin_required
def get_users():

    result = get_all_users()

    return jsonify(result), 200
@admin_bp.route("/issues", methods=["GET"])
@jwt_required()
@admin_required
def get_issues():

    result = get_all_issues()

    return jsonify(result), 200