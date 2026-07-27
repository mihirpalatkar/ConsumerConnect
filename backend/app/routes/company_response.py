from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.company import Company
from app.services.company_response_service import (
    add_response,
    get_responses
)

company_response_bp = Blueprint(
    "company_response",
    __name__,
    url_prefix="/api/company/responses"
)
@company_response_bp.route("", methods=["POST"])
@jwt_required()
def create_response():

    identity = get_jwt_identity()

    if not str(identity).startswith("company:"):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403

    company = Company.query.get(
        int(str(identity).split(":")[1])
    )

    data = request.get_json()

    result = add_response(
        company.name,
        data.get("issue_id"),
        data.get("response")
    )

    if not result["success"]:
        return jsonify(result), result["status_code"]

    return jsonify({
        "success": True,
        "message": "Official response posted"
    }), 201
@company_response_bp.route("/<int:issue_id>", methods=["GET"])
@jwt_required()
def responses(issue_id):

    responses = get_responses(issue_id)

    data = []

    for response in responses:
        data.append({
            "company": response.company_name,
            "response": response.response,
            "created_at": response.created_at
        })

    return jsonify({
        "success": True,
        "responses": data
    }), 200