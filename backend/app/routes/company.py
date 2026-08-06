from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.company import Company

from app.services.company_service import (
    get_company_dashboard,
    get_company_issues,
    get_company_issue,
    update_company_issue_status,
)

company_bp = Blueprint("company", __name__, url_prefix="/api/company")


@company_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():

    identity = get_jwt_identity()

    if not identity.startswith("company:"):
        return jsonify({"success": False, "message": "Invalid token."}), 403

    company_id = int(identity.split(":")[1])

    company = Company.query.get(company_id)

    if company is None:
        return jsonify({"success": False, "message": "Company not found."}), 404

    dashboard = get_company_dashboard(company)

    return jsonify({"success": True, "dashboard": dashboard}), 200


@company_bp.route("/issues", methods=["GET"])
@jwt_required()
def company_issues():

    identity = get_jwt_identity()

    if not identity.startswith("company:"):
        return jsonify({"success": False, "message": "Invalid token."}), 403

    company_id = int(identity.split(":")[1])

    company = Company.query.get(company_id)

    if company is None:
        return jsonify({"success": False, "message": "Company not found."}), 404

    issues = get_company_issues(company)

    response = []

    for issue in issues:
        response.append(
            {
                "id": issue.id,
                "title": issue.title,
                "category": issue.category,
                "status": issue.status,
                "severity": issue.severity,
                "created_at": issue.created_at,
            }
        )

    return jsonify({"success": True, "issues": response}), 200


@company_bp.route("/issues/<int:issue_id>", methods=["GET"])
@jwt_required()
def get_company_issue_route(issue_id):

    identity = get_jwt_identity()

    if not identity.startswith("company:"):
        return jsonify({"success": False, "message": "Company access only"}), 403

    company_id = int(identity.split(":")[1])

    company = Company.query.get(company_id)

    issue = get_company_issue(company, issue_id)

    if not issue:
        return jsonify({"success": False, "message": "Issue not found"}), 404

    return (
        jsonify(
            {
                "success": True,
                "issue": {
                    "id": issue.id,
                    "title": issue.title,
                    "description": issue.description,
                    "company": issue.company,
                    "category": issue.category,
                    "severity": issue.severity,
                    "status": issue.status,
                    "created_at": issue.created_at,
                    "image_url": issue.image_url,
                    "resolution_note": issue.resolution_note,
                },
            }
        ),
        200,
    )


@company_bp.route("/issues/<int:issue_id>/status", methods=["PATCH"])
@jwt_required()
def update_issue_status(issue_id):

    identity = get_jwt_identity()

    if not identity.startswith("company:"):
        return jsonify({"success": False, "message": "Company access only"}), 403

    company_id = int(identity.split(":")[1])

    company = Company.query.get(company_id)

    data = request.get_json()

    result = update_company_issue_status(
        company=company,
        issue_id=issue_id,
        status=data.get("status"),
        resolution_note=data.get("resolution_note"),
    )

    return (
        jsonify(
            {
                "success": result["success"],
                "message": result["message"],
                "issue": (
                    {
                        "id": result["issue"].id,
                        "status": result["issue"].status,
                        "resolution_note": result["issue"].resolution_note,
                        "resolved_at": result["issue"].resolved_at,
                    }
                    if result["success"]
                    else None
                ),
            }
        ),
        result["status_code"],
    )
