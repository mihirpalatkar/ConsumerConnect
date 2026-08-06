from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from app.services.company_service import register_company, authenticate_company

company_auth_bp = Blueprint("company_auth", __name__, url_prefix="/api/company")


@company_auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    required_fields = ["name", "email", "password"]

    for field in required_fields:
        if field not in data:
            return jsonify({"success": False, "message": f"{field} is required."}), 400

    company = register_company(data["name"], data["email"], data["password"])

    if company is None:
        return jsonify({"success": False, "message": "Company already exists."}), 400

    access_token = create_access_token(
        identity=f"company:{company.id}", additional_claims={"role": "Company"}
    )

    return (
        jsonify(
            {
                "success": True,
                "message": "Company registered successfully.",
                "access_token": access_token,
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "email": company.email,
                },
            }
        ),
        201,
    )


@company_auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    required_fields = ["email", "password"]

    for field in required_fields:
        if field not in data:
            return jsonify({"success": False, "message": f"{field} is required."}), 400

    company = authenticate_company(data["email"], data["password"])

    if isinstance(company, dict):
        return jsonify(company), company.get("status_code", 401)

    if company is None:
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    access_token = create_access_token(
        identity=f"company:{company.id}", additional_claims={"role": "Company"}
    )

    return (
        jsonify(
            {
                "success": True,
                "message": "Login successful.",
                "access_token": access_token,
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "email": company.email,
                },
            }
        ),
        200,
    )
