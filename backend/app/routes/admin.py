from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.services.admin_log_service import AdminLogService

from app.utils.admin import admin_required
from app.services.admin_user_service import (
    get_all_users,
    get_user_by_id,
    block_user,
    unblock_user
)

from app.services.admin_company_service import (
    get_all_companies,
    get_company_by_id,
    block_company,
    unblock_company
)
from app.services.admin_issue_service import (
    get_all_issues,
    get_issue_by_id,
    update_issue_status,
    delete_issue,
    restore_issue
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
@admin_bp.route("/users/<int:user_id>", methods=["GET"])
@jwt_required()
@admin_required
def get_user(user_id):

    result = get_user_by_id(user_id)

    return jsonify(result), result.get("status_code", 200)


@admin_bp.route("/users/<int:user_id>/block", methods=["PATCH"])
@jwt_required()
@admin_required
def block_user_route(user_id):
    result = block_user(user_id)
    return jsonify(result), result.get("status_code", 200)


@admin_bp.route("/users/<int:user_id>/unblock", methods=["PATCH"])
@jwt_required()
@admin_required
def unblock_user_route(user_id):

    result = unblock_user(user_id)

    return jsonify(result), result.get("status_code", 200)
@admin_bp.route("/companies", methods=["GET"])
@jwt_required()
@admin_required
def get_companies():

    result = get_all_companies()

    return jsonify(result), result.get("status_code", 200)
@admin_bp.route("/companies/<int:company_id>", methods=["GET"])
@jwt_required()
@admin_required
def get_company(company_id):

    result = get_company_by_id(company_id)

    return jsonify(result), result.get("status_code", 200)
@admin_bp.route("/companies/<int:company_id>/block", methods=["PATCH"])
@jwt_required()
@admin_required
def block_company_route(company_id):

    result = block_company(company_id)

    return jsonify(result), result.get("status_code", 200)
@admin_bp.route("/companies/<int:company_id>/unblock", methods=["PATCH"])
@jwt_required()
@admin_required
def unblock_company_route(company_id):

    result = unblock_company(company_id)

    return jsonify(result), result.get("status_code", 200)
@admin_bp.route("/issues", methods=["GET"])
@jwt_required()
@admin_required
def get_issues():

    result = get_all_issues()

    return jsonify(result), result.get("status_code", 200)
@admin_bp.route("/issues/<int:issue_id>", methods=["GET"])
@jwt_required()
@admin_required
def get_issue(issue_id):

    result = get_issue_by_id(issue_id)

    return jsonify(result), result.get("status_code", 200)
@admin_bp.route("/issues/<int:issue_id>/status", methods=["PATCH"])
@jwt_required()
@admin_required
def update_issue(issue_id):

    data = request.get_json()

    result = update_issue_status(
        issue_id,
        data.get("status")
    )

    return jsonify(result), result.get("status_code", 200)
@admin_bp.route("/issues/<int:issue_id>/delete", methods=["PATCH"])
@jwt_required()
@admin_required
def delete_issue_route(issue_id):

    result = delete_issue(issue_id)

    return jsonify(result), result.get("status_code", 200)
@admin_bp.route("/issues/<int:issue_id>/restore", methods=["PATCH"])
@jwt_required()
@admin_required
def restore_issue_route(issue_id):

    result = restore_issue(issue_id)

    return jsonify(result), result.get("status_code", 200)
