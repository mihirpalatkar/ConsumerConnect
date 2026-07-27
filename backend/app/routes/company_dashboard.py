from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.company import Company
from app.services.company_dashboard_service import get_company_issues

company_dashboard_bp = Blueprint(
    "company_dashboard",
    __name__,
    url_prefix="/api/company/dashboard"
)


@company_dashboard_bp.route("/issues", methods=["GET"])
@jwt_required()
def issues():

    identity = get_jwt_identity()

    if not str(identity).startswith("company:"):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403

    company_id = int(str(identity).split(":")[1])

    company = Company.query.get(company_id)

    issues = get_company_issues(company.name)

    result = []

    for issue in issues:
        result.append({
            "id": issue.id,
            "title": issue.title,
            "status": issue.status,
            "supports": len(issue.supports),
            "comments": len(issue.comments)
        })

    return jsonify({
        "success": True,
        "issues": result
    }), 200