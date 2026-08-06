import os
from uuid import uuid4

from flask import (
    Blueprint,
    request,
    jsonify,
    current_app
)
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)
from werkzeug.utils import secure_filename

from app.services.issue_service import (
    create_issue,
    get_all_issues,
    get_issue_by_id,
    update_issue,
    update_issue_status,
    delete_issue,
    search_issues
)

issue_bp = Blueprint(
    "issues",
    __name__,
    url_prefix="/api/issues"
)


def allowed_file(filename):
    allowed_extensions = current_app.config["ALLOWED_EXTENSIONS"]

    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in allowed_extensions
    )


@issue_bp.route("", methods=["POST"])
@jwt_required()
def create():

    if request.is_json:

        data = request.get_json()

        title = data.get("title")
        description = data.get("description")
        company = data.get("company")
        category = data.get("category")

        image = None

    else:

        title = request.form.get("title")
        description = request.form.get("description")
        company = request.form.get("company")
        category = request.form.get("category")

        image = request.files.get("image")
    if not all([title, description, company]):
        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    image_filename = None

    if image and image.filename != "":

        if not allowed_file(image.filename):
            return jsonify({
                "success": False,
                "message": "Only PNG, JPG and JPEG images are allowed."
            }), 400

        extension = image.filename.rsplit(".", 1)[1].lower()

        image_filename = f"{uuid4()}.{extension}"

        upload_path = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            secure_filename(image_filename)
        )

        image.save(upload_path)

    result = create_issue(
        title=title,
        description=description,
        company=company,
        category=category,
        user_id=int(get_jwt_identity()),
        image_url=image_filename
    )

    # Duplicate issue found
    if result.get("duplicate_found"):
        return jsonify(result), result["status_code"]

    issue = result["issue"]
    ai = result["ai"]

    return jsonify({
        "success": True,
        "message": "Issue created successfully",

        "issue": {
            "id": issue.id,
            "title": issue.title,
            "company": issue.company,
            "category": issue.category,
            "severity": issue.severity,
            "estimated_resolution_days": issue.estimated_resolution_days,
            "status": issue.status,
            "image_url": (
                request.host_url.rstrip("/") + "/uploads/" + issue.image_url
                if issue.image_url
                else None
            )
        },

        "ai_prediction": {
            "spam": ai["spam"],
            "predicted_category": ai["category"],
            "predicted_severity": ai["severity"],
            "estimated_resolution_days": ai["estimated_resolution_days"]
        }

    }), 201


@issue_bp.route("", methods=["GET"])
@jwt_required()
def get_all():

    search = request.args.get("search")
    company = request.args.get("company")
    category = request.args.get("category")
    status = request.args.get("status")
    severity = request.args.get("severity")

    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 10, type=int)
    sort = request.args.get("sort", "latest")

    if any([search, company, category, status, severity]):

        issues = search_issues(
            search=search,
            company=company,
            category=category,
            status=status,
            severity=severity
        )

        total = len(issues)

    else:

        pagination = get_all_issues(
            page=page,
            limit=limit,
            sort=sort
        )

        issues = pagination.items
        total = pagination.total

    response = []

    for issue in issues:
        response.append({
            "id": issue.id,
            "title": issue.title,
            "company": issue.company,
            "estimated_resolution_days": issue.estimated_resolution_days,
            "category": issue.category,
            "status": issue.status,
            "severity": issue.severity,
            "support_count": len(issue.supports),
            "comment_count": len(issue.comments),
            "trending_score": issue.trending_score,
            "image_url": (
                request.host_url.rstrip("/") + "/uploads/" + issue.image_url
                if issue.image_url
                else None
            ),
        })

    return jsonify({
        "success": True,
        "page": page,
        "limit": limit,
        "count": len(response),
        "total": total,
        "data": response
    }), 200


@issue_bp.route("/<int:issue_id>", methods=["GET"])
@jwt_required()
def get_one(issue_id):

    issue = get_issue_by_id(issue_id)

    if not issue:
        return jsonify({
            "success": False,
            "message": "Issue not found"
        }), 404

    return jsonify({
        "success": True,
        "data": {
            "id": issue.id,
            "title": issue.title,
            "description": issue.description,
            "company": issue.company,
            "estimated_resolution_days": issue.estimated_resolution_days,
            "category": issue.category,
            "status": issue.status,
            "severity": issue.severity,
            "support_count": len(issue.supports),
            "comment_count": len(issue.comments),
            "trending_score": issue.trending_score,
            "duplicate_score": issue.duplicate_score,
            "image_url": (
                request.host_url.rstrip("/") + "/uploads/" + issue.image_url
                if issue.image_url
                else None
            ),
            "created_at": issue.created_at,
            "updated_at": issue.updated_at
        }
    }), 200


@issue_bp.route("/<int:issue_id>", methods=["PUT"])
@jwt_required()
def update(issue_id):

    data = request.get_json()

    result = update_issue(
        issue_id,
        int(get_jwt_identity()),
        data
    )

    return jsonify({
        "success": result["success"],
        "message": result["message"]
    }), result["status_code"]

@issue_bp.route("/<int:issue_id>/status", methods=["PATCH"])
@jwt_required()
def update_status(issue_id):

    data = request.get_json()

    result = update_issue_status(
        issue_id=issue_id,
        user_id=int(get_jwt_identity()),
        status=data.get("status"),
        resolution_note=data.get("resolution_note")
    )

    if not result["success"]:
        return jsonify({
            "success": False,
            "message": result["message"]
        }), result["status_code"]

    issue = result["issue"]

    return jsonify({
        "success": True,
        "message": result["message"],
        "data": {
            "id": issue.id,
            "status": issue.status,
            "resolved_at": issue.resolved_at,
            "resolution_note": issue.resolution_note
        }
    }), result["status_code"]

@issue_bp.route("/<int:issue_id>", methods=["DELETE"])
@jwt_required()
def delete(issue_id):

    result = delete_issue(
        issue_id,
        int(get_jwt_identity())
    )

    return jsonify({
        "success": result["success"],
        "message": result["message"]
    }), result["status_code"]