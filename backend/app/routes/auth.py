from flask import Blueprint, request, jsonify

from app.services.auth_service import register_user

auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    result = register_user(
        name,
        email,
        password
    )

    if result["success"]:
        return jsonify(result), 201

    return jsonify(result), 400