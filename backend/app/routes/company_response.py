from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.company import Company
from app.services.company_response_service import (
    create_company_response,
    get_company_responses,
)

company_response_bp = Blueprint(
    "company_response",
    __name__,
    url_prefix="/api/company/responses",
)


@company_response_bp.route("", methods=["POST"])
@jwt_required()
def create_response():
    identity = get_jwt_identity()

    if not str(identity).startswith("company:"):
        return jsonify({
            "success": False,
            "message": "Unauthorized",
        }), 403

    try:
        company_id = int(str(identity).split(":")[1])
    except (ValueError, IndexError):
        return jsonify({
            "success": False,
            "message": "Invalid company identity",
        }), 401

    company = Company.query.get(company_id)

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company not found.",
        }), 404

    data = request.get_json(silent=True) or {}

    result = create_company_response(
        company=company,
        issue_id=data.get("issue_id"),
        response=data.get("response"),
    )

    if not result["success"]:
        return jsonify(result), result["status_code"]

    return jsonify(result), result["status_code"]


@company_response_bp.route("/<int:issue_id>", methods=["GET"])
@jwt_required()
def responses(issue_id):
    responses = get_company_responses(issue_id)

    return jsonify({
        "success": True,
        "responses": responses,
    }), 200