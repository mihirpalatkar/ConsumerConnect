from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app.services.company_service import (
    register_company,
    authenticate_company
)
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from app.models.company import Company
from app.services.company_service import get_company_dashboard

from app.services.company_service import register_company

company_bp = Blueprint(
    "company",
    __name__,
    url_prefix="/api/company"
)


@company_bp.route("/register", methods=["POST"])
def company_register():

    data = request.get_json()

    required_fields = [
        "name",
        "email",
        "password"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "success": False,
                "message": f"{field} is required."
            }), 400

    company = register_company(
        data["name"],
        data["email"],
        data["password"]
    )

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company already exists."
        }), 400

    return jsonify({
        "success": True,
        "message": "Company registered successfully."
    }), 201
@company_bp.route("/login", methods=["POST"])
def company_login():

    data = request.get_json()

    required_fields = [
        "email",
        "password"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "success": False,
                "message": f"{field} is required."
            }), 400

    company = authenticate_company(
        data["email"],
        data["password"]
    )

    if company is None:
        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    access_token = create_access_token(
        identity=f"company:{company.id}",
        additional_claims={
            "role": "Company"
        }
    )

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "access_token": access_token,
        "company": {
            "id": company.id,
            "name": company.name,
            "email": company.email
        }
    }), 200
@company_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():

    identity = get_jwt_identity()

    if not identity.startswith("company:"):
        return jsonify({
            "success": False,
            "message": "Invalid token."
        }), 403

    company_id = int(identity.split(":")[1])

    company = Company.query.get(company_id)

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company not found."
        }), 404

    dashboard = get_company_dashboard(company)

    return jsonify({
        "success": True,
        "dashboard": dashboard
    }), 200