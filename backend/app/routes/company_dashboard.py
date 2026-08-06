from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.company_dashboard_service import (
    get_company_issues,
    get_company_analytics,
    get_rating_distribution,
    get_company_category_distribution,
    get_company_monthly_trends,
)

from app.models.company import Company
from app.services.company_dashboard_service import get_company_issues

company_dashboard_bp = Blueprint(
    "company_dashboard", __name__, url_prefix="/api/company/dashboard"
)


@company_dashboard_bp.route("/issues", methods=["GET"])
@jwt_required()
def issues():

    identity = get_jwt_identity()

    if not str(identity).startswith("company:"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    company_id = int(str(identity).split(":")[1])

    company = Company.query.get(company_id)

    issues = get_company_issues(company.name)

    result = []

    for issue in issues:
        result.append(
            {
                "id": issue.id,
                "title": issue.title,
                "status": issue.status,
                "supports": len(issue.supports),
                "comments": len(issue.comments),
            }
        )

    return jsonify({"success": True, "issues": result}), 200


@company_dashboard_bp.route("/analytics", methods=["GET"])
@jwt_required()
def analytics():

    identity = get_jwt_identity()

    if not str(identity).startswith("company:"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    company_id = int(identity.split(":")[1])

    company = Company.query.get(company_id)

    data = get_company_analytics(company.name)

    return jsonify({"success": True, "data": data}), 200


@company_dashboard_bp.route("/rating-distribution", methods=["GET"])
@jwt_required()
def rating_distribution():

    identity = get_jwt_identity()

    if not str(identity).startswith("company:"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    company_id = int(identity.split(":")[1])

    company = Company.query.get(company_id)

    return (
        jsonify({"success": True, "data": get_rating_distribution(company.name)}),
        200,
    )


@company_dashboard_bp.route("/category-distribution", methods=["GET"])
@jwt_required()
def category_distribution():

    identity = get_jwt_identity()

    if not str(identity).startswith("company:"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    company_id = int(identity.split(":")[1])

    company = Company.query.get(company_id)

    return (
        jsonify(
            {"success": True, "data": get_company_category_distribution(company.name)}
        ),
        200,
    )


@company_dashboard_bp.route("/monthly-trends", methods=["GET"])
@jwt_required()
def monthly_trends():

    identity = get_jwt_identity()

    if not str(identity).startswith("company:"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    company_id = int(identity.split(":")[1])

    company = Company.query.get(company_id)

    return (
        jsonify({"success": True, "data": get_company_monthly_trends(company.name)}),
        200,
    )
