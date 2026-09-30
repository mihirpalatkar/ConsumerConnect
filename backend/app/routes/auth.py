from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
)

from app.services.auth_service import (
    register_user,
    login_user,
)


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth",
)


# ============================================================
# REGISTER
# ============================================================

@auth_bp.route(
    "/register",
    methods=["POST"],
)
def register():

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    name = data.get(
        "name"
    )

    email = data.get(
        "email"
    )

    password = data.get(
        "password"
    )

    result = register_user(
        name,
        email,
        password,
    )

    if result.get(
        "success"
    ):
        return jsonify(
            result
        ), 201

    return jsonify(
        result
    ), result.get(
        "status_code",
        400,
    )


# ============================================================
# LOGIN
# ============================================================

@auth_bp.route(
    "/login",
    methods=["POST"],
)
def login():

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    email = data.get(
        "email"
    )

    password = data.get(
        "password"
    )

    result = login_user(
        email,
        password,
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


# ============================================================
# PROFILE
# ============================================================

@auth_bp.route(
    "/profile",
    methods=["GET"],
)
@jwt_required()
def profile():

    current_user = (
        get_jwt_identity()
    )

    return (
        jsonify({
            "success": True,
            "message": (
                "Protected route accessed successfully"
            ),
            "user_id": current_user,
        }),
        200,
    )