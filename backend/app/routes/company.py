from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.company import Company
from app.models.issue import Issue
from app.models.comment import Comment
from app.models.user import User

from app.services.company_service import (
    get_company_dashboard,
    get_company_issues,
    get_company_issue,
    update_company_issue_status,
    get_company_status_requests,
)

from app.services.comment_service import (
    get_comments,
)


company_bp = Blueprint(
    "company",
    __name__,
    url_prefix="/api/company",
)


# ============================================================
# HELPERS
# ============================================================

def get_current_company():
    identity = get_jwt_identity()

    if not isinstance(identity, str):
        return None

    if not identity.startswith("company:"):
        return None

    try:
        company_id = int(
            identity.split(":", 1)[1]
        )
    except (ValueError, IndexError):
        return None

    return db.session.get(
        Company,
        company_id,
    )


def serialize_comment(comment):
    """
    Return a unified author format for both consumers
    and companies.
    """

    author_name = "User"
    author_type = "user"

    if comment.company_id:
        company = db.session.get(
            Company,
            comment.company_id,
        )

        if company:
            author_name = (
                company.name
                or company.email
                or f"Company {company.id}"
            )

        author_type = "company"

    elif comment.user_id:
        user = db.session.get(
            User,
            comment.user_id,
        )

        if user:
            author_name = (
                user.name
                or user.email
                or f"User {user.id}"
            )

    return {
        "id": comment.id,
        "content": comment.content,
        "issue_id": comment.issue_id,
        "user_id": comment.user_id,
        "company_id": comment.company_id,
        "user_name": author_name,
        "author_name": author_name,
        "author_type": author_type,
        "parent_id": comment.parent_id,
        "created_at": comment.created_at,
    }


def serialize_issue(issue):
    comments = [
        comment
        for comment in (issue.comments or [])
        if not getattr(
            comment,
            "is_deleted",
            False,
        )
    ]

    return {
        "id": issue.id,
        "title": issue.title,
        "description": issue.description,
        "company": issue.company,
        "category": issue.category,
        "status": issue.status,
        "severity": issue.severity,
        "estimated_resolution_days":
            issue.estimated_resolution_days,
        "image_url": issue.image_url,
        "created_at": issue.created_at,
        "updated_at": issue.updated_at,
        "resolved_at": issue.resolved_at,
        "resolution_note": issue.resolution_note,
        "user_id": issue.user_id,
        "support_count": len(
            issue.supports or []
        ),
        "comment_count": len(
            comments
        ),
    }


# ============================================================
# DASHBOARD
# ============================================================

@company_bp.route(
    "/dashboard",
    methods=["GET"],
)
@jwt_required()
def dashboard():

    company = get_current_company()

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company access only.",
        }), 403

    try:
        data = get_company_dashboard(
            company
        )

        return jsonify({
            "success": True,
            "dashboard": data,
        }), 200

    except Exception as error:
        print(
            "Company dashboard error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load company dashboard."
            ),
        }), 500


# ============================================================
# COMPANY ISSUES
# ============================================================

@company_bp.route(
    "/issues",
    methods=["GET"],
)
@jwt_required()
def company_issues():

    company = get_current_company()

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company access only.",
        }), 403

    try:
        issues = get_company_issues(
            company
        )

        return jsonify({
            "success": True,
            "issues": [
                serialize_issue(issue)
                for issue in issues
            ],
        }), 200

    except Exception as error:
        print(
            "Company issues error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load company issues."
            ),
        }), 500


# ============================================================
# SINGLE COMPANY ISSUE
# ============================================================

@company_bp.route(
    "/issues/<int:issue_id>",
    methods=["GET"],
)
@jwt_required()
def company_issue(
    issue_id,
):

    company = get_current_company()

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company access only.",
        }), 403

    try:
        issue = get_company_issue(
            company,
            issue_id,
        )

        if issue is None:
            return jsonify({
                "success": False,
                "message": "Issue not found.",
            }), 404

        return jsonify({
            "success": True,
            "issue": serialize_issue(
                issue
            ),
        }), 200

    except Exception as error:
        print(
            "Company issue detail error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load issue."
            ),
        }), 500


# ============================================================
# UPDATE ISSUE STATUS
# ============================================================

@company_bp.route(
    "/issues/<int:issue_id>/status",
    methods=["PATCH"],
)
@jwt_required()
def update_status(
    issue_id,
):

    company = get_current_company()

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company access only.",
        }), 403

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    status = data.get(
        "status"
    )

    resolution_note = data.get(
        "resolution_note"
    )

    if not status:
        return jsonify({
            "success": False,
            "message": "status is required.",
        }), 400

    try:
        result = update_company_issue_status(
            company=company,
            issue_id=issue_id,
            status=status,
            resolution_note=resolution_note,
        )

        return jsonify({
            "success": result["success"],
            "message": result["message"],
            "issue": (
                result.get("issue")
                if result["success"]
                else None
            ),
            "status_request": (
                result.get("status_request")
                if result["success"]
                else None
            ),
        }), result["status_code"]

    except Exception as error:
        print(
            "Company status update error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to update issue status."
            ),
        }), 500


# ============================================================
# COMPANY STATUS REQUESTS
# ============================================================

@company_bp.route(
    "/status-requests",
    methods=["GET"],
)
@jwt_required()
def company_status_requests():

    company = get_current_company()

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company access only.",
        }), 403

    try:
        requests_data = get_company_status_requests(
            company
        )

        return jsonify({
            "success": True,
            "requests": requests_data,
            "count": len(requests_data),
        }), 200

    except Exception as error:
        print(
            "Company status requests error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load status requests."
            ),
        }), 500


# ============================================================
# COMMUNITY COMMENTS - READ
# ============================================================

@company_bp.route(
    "/community/issues/<int:issue_id>/comments",
    methods=["GET"],
)
@jwt_required()
def community_comments(
    issue_id,
):

    company = get_current_company()

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company access only.",
        }), 403

    try:
        issue = (
            Issue.query
            .filter_by(
                id=issue_id,
                is_deleted=False,
            )
            .first()
        )

        if issue is None:
            return jsonify({
                "success": False,
                "message": "Issue not found.",
            }), 404

        comments = get_comments(
            issue_id
        )

        data = []

        for comment in comments:

            if comment.parent_id is not None:
                continue

            if getattr(
                comment,
                "is_deleted",
                False,
            ):
                continue

            serialized = serialize_comment(
                comment
            )

            replies = []

            for reply in (
                comment.replies or []
            ):

                if getattr(
                    reply,
                    "is_deleted",
                    False,
                ):
                    continue

                replies.append(
                    serialize_comment(
                        reply
                    )
                )

            serialized["replies"] = replies

            data.append(
                serialized
            )

        return jsonify({
            "success": True,
            "data": data,
            "comment_count": len(data),
        }), 200

    except Exception as error:
        print(
            "Company comments error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load comments."
            ),
        }), 500


# ============================================================
# COMPANY COMMENT
# ============================================================

@company_bp.route(
    "/comments",
    methods=["POST"],
)
@jwt_required()
def create_company_comment():

    company = get_current_company()

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company access only.",
        }), 403

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    issue_id = data.get(
        "issue_id"
    )

    content = data.get(
        "content"
    )

    if issue_id is None:
        return jsonify({
            "success": False,
            "message": "issue_id is required.",
        }), 400

    if (
        not content
        or not str(content).strip()
    ):
        return jsonify({
            "success": False,
            "message": "Comment content is required.",
        }), 400

    issue = (
        Issue.query
        .filter_by(
            id=int(issue_id),
            is_deleted=False,
        )
        .first()
    )

    if issue is None:
        return jsonify({
            "success": False,
            "message": "Issue not found.",
        }), 404

    comment = Comment(
        content=str(
            content
        ).strip(),
        issue_id=issue.id,
        user_id=None,
        company_id=company.id,
        parent_id=None,
    )

    db.session.add(
        comment
    )

    try:
        db.session.commit()
    except Exception as error:
        db.session.rollback()

        print(
            "Company comment database error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to create company comment."
            ),
        }), 500

    return jsonify({
        "success": True,
        "message": "Comment created successfully.",
        "comment": serialize_comment(
            comment
        ),
    }), 201


# ============================================================
# COMPANY REPLY
# ============================================================

@company_bp.route(
    "/comments/reply",
    methods=["POST"],
)
@jwt_required()
def create_company_reply():

    company = get_current_company()

    if company is None:
        return jsonify({
            "success": False,
            "message": "Company access only.",
        }), 403

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    issue_id = data.get(
        "issue_id"
    )

    parent_id = data.get(
        "parent_id"
    )

    content = data.get(
        "content"
    )

    if issue_id is None:
        return jsonify({
            "success": False,
            "message": "issue_id is required.",
        }), 400

    if parent_id is None:
        return jsonify({
            "success": False,
            "message": "parent_id is required.",
        }), 400

    if (
        not content
        or not str(content).strip()
    ):
        return jsonify({
            "success": False,
            "message": "Reply content is required.",
        }), 400

    issue = (
        Issue.query
        .filter_by(
            id=int(issue_id),
            is_deleted=False,
        )
        .first()
    )

    if issue is None:
        return jsonify({
            "success": False,
            "message": "Issue not found.",
        }), 404

    parent = (
        Comment.query
        .filter_by(
            id=int(parent_id),
            issue_id=issue.id,
            is_deleted=False,
        )
        .first()
    )

    if parent is None:
        return jsonify({
            "success": False,
            "message": (
                "Parent comment not found."
            ),
        }), 404

    reply = Comment(
        content=str(
            content
        ).strip(),
        issue_id=issue.id,
        user_id=None,
        company_id=company.id,
        parent_id=parent.id,
    )

    db.session.add(
        reply
    )

    try:
        db.session.commit()
    except Exception as error:
        db.session.rollback()

        print(
            "Company reply database error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to create company reply."
            ),
        }), 500

    return jsonify({
        "success": True,
        "message": "Reply created successfully.",
        "reply": serialize_comment(
            reply
        ),
    }), 201