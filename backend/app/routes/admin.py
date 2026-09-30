from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
)

from app.utils.admin import admin_required

from app.services.admin_user_service import (
    get_all_users,
    get_user_by_id,
    block_user,
    unblock_user,
)

from app.services.admin_company_service import (
    get_all_companies,
    get_company_by_id,
    block_company,
    unblock_company,
)

from app.services.admin_issue_service import (
    get_all_issues,
    get_issue_by_id,
    update_issue_status,
    delete_issue,
    restore_issue,
)

from app.services.company_status_request_service import (
    get_pending_status_requests,
    get_status_request,
    approve_status_request,
    reject_status_request,
)


admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin",
)


# ============================================================
# TEST
# ============================================================

@admin_bp.route(
    "/test",
    methods=["GET"],
)
@jwt_required()
@admin_required
def admin_test():

    return jsonify({
        "success": True,
        "message": "Welcome Admin!",
    }), 200


# ============================================================
# USERS
# ============================================================

@admin_bp.route(
    "/users",
    methods=["GET"],
)
@jwt_required()
@admin_required
def get_users():

    result = get_all_users()

    return jsonify(
        result
    ), 200


@admin_bp.route(
    "/users/<int:user_id>",
    methods=["GET"],
)
@jwt_required()
@admin_required
def get_user(
    user_id,
):

    result = get_user_by_id(
        user_id
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


@admin_bp.route(
    "/users/<int:user_id>/block",
    methods=["PATCH"],
)
@jwt_required()
@admin_required
def block_user_route(
    user_id,
):

    result = block_user(
        user_id
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


@admin_bp.route(
    "/users/<int:user_id>/unblock",
    methods=["PATCH"],
)
@jwt_required()
@admin_required
def unblock_user_route(
    user_id,
):

    result = unblock_user(
        user_id
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


# ============================================================
# COMPANIES
# ============================================================

@admin_bp.route(
    "/companies",
    methods=["GET"],
)
@jwt_required()
@admin_required
def get_companies():

    result = get_all_companies()

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


@admin_bp.route(
    "/companies/<int:company_id>",
    methods=["GET"],
)
@jwt_required()
@admin_required
def get_company(
    company_id,
):

    result = get_company_by_id(
        company_id
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


@admin_bp.route(
    "/companies/<int:company_id>/block",
    methods=["PATCH"],
)
@jwt_required()
@admin_required
def block_company_route(
    company_id,
):

    result = block_company(
        company_id
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


@admin_bp.route(
    "/companies/<int:company_id>/unblock",
    methods=["PATCH"],
)
@jwt_required()
@admin_required
def unblock_company_route(
    company_id,
):

    result = unblock_company(
        company_id
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


# ============================================================
# ISSUES
# ============================================================

@admin_bp.route(
    "/issues",
    methods=["GET"],
)
@jwt_required()
@admin_required
def get_issues():

    result = get_all_issues()

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


@admin_bp.route(
    "/issues/<int:issue_id>",
    methods=["GET"],
)
@jwt_required()
@admin_required
def get_issue(
    issue_id,
):

    result = get_issue_by_id(
        issue_id
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


# ============================================================
# DIRECT ADMIN STATUS UPDATE
# ============================================================

@admin_bp.route(
    "/issues/<int:issue_id>/status",
    methods=["PATCH"],
)
@jwt_required()
@admin_required
def update_issue(
    issue_id,
):

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    status = data.get(
        "status"
    )

    if not status:

        return jsonify({
            "success": False,
            "message": (
                "status is required."
            ),
        }), 400

    result = update_issue_status(
        issue_id,
        status,
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


# ============================================================
# DELETE / RESTORE
# ============================================================

@admin_bp.route(
    "/issues/<int:issue_id>/delete",
    methods=["PATCH"],
)
@jwt_required()
@admin_required
def delete_issue_route(
    issue_id,
):

    result = delete_issue(
        issue_id
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


@admin_bp.route(
    "/issues/<int:issue_id>/restore",
    methods=["PATCH"],
)
@jwt_required()
@admin_required
def restore_issue_route(
    issue_id,
):

    result = restore_issue(
        issue_id
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


# ============================================================
# COMPANY STATUS REQUESTS
# ============================================================

@admin_bp.route(
    "/status-requests",
    methods=["GET"],
)
@jwt_required()
@admin_required
def get_status_requests():

    requests_data = (
        get_pending_status_requests()
    )

    return jsonify({
        "success": True,
        "requests": requests_data,
        "count": len(
            requests_data
        ),
    }), 200


# ============================================================
# GET ONE STATUS REQUEST
# ============================================================

@admin_bp.route(
    "/status-requests/<int:request_id>",
    methods=["GET"],
)
@jwt_required()
@admin_required
def get_one_status_request(
    request_id,
):

    result = get_status_request(
        request_id
    )

    if result is None:

        return jsonify({
            "success": False,
            "message": (
                "Status request not found."
            ),
        }), 404

    return jsonify({
        "success": True,
        "status_request": result,
    }), 200


# ============================================================
# APPROVE STATUS REQUEST
# ============================================================

@admin_bp.route(
    "/status-requests/<int:request_id>/approve",
    methods=["PATCH"],
)
@jwt_required()
@admin_required
def approve_status_request_route(
    request_id,
):

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    review_note = data.get(
        "review_note"
    )

    try:
        admin_user_id = int(
            get_jwt_identity()
        )
    except (
        TypeError,
        ValueError,
    ):

        return jsonify({
            "success": False,
            "message": (
                "Invalid admin identity."
            ),
        }), 401

    result = approve_status_request(
        request_id=request_id,
        admin_user_id=admin_user_id,
        review_note=review_note,
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )


# ============================================================
# REJECT STATUS REQUEST
# ============================================================

@admin_bp.route(
    "/status-requests/<int:request_id>/reject",
    methods=["PATCH"],
)
@jwt_required()
@admin_required
def reject_status_request_route(
    request_id,
):

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    review_note = data.get(
        "review_note"
    )

    try:
        admin_user_id = int(
            get_jwt_identity()
        )
    except (
        TypeError,
        ValueError,
    ):

        return jsonify({
            "success": False,
            "message": (
                "Invalid admin identity."
            ),
        }), 401

    result = reject_status_request(
        request_id=request_id,
        admin_user_id=admin_user_id,
        review_note=review_note,
    )

    return jsonify(
        result
    ), result.get(
        "status_code",
        200,
    )