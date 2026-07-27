from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from app.services.company_service import (
    register_company,
    authenticate_company
)

company_auth_bp = Blueprint(
    "company_auth",
    __name__,
    url_prefix="/api/company"
)


@company_auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    company = register_company(
        name=data.get("name"),
        email=data.get("email"),
        password=data.get("password")
    )

    if not company:
        return jsonify({
            "success": False,
            "message": "Company already exists"
        }), 400

    return jsonify({
        "success": True,
        "message": "Company registered successfully"
    }), 201


@company_auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    company = authenticate_company(
        email=data.get("email"),
        password=data.get("password")
    )

    if not company:
        return jsonify({
            "success": False,
            "message": "Invalid credentials"
        }), 401

    token = create_access_token(identity=f"company:{company.id}")

    return jsonify({
        "success": True,
        "access_token": token
    }), 200