from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
)

from app.models.issue import Issue
from app.models.comment import Comment

from app.services.issue_service import (
    create_issue,
    get_all_issues,
    get_issue_by_id,
    update_issue,
    delete_issue,
    search_issues,
    update_issue_status,
)


issue_bp = Blueprint(
    "issue",
    __name__,
    url_prefix="/api/issues",
)


# ============================================================
# ISSUE SERIALIZER
# ============================================================

def serialize_issue(issue):

    if not issue:
        return None

    # --------------------------------------------------------
    # COMMENT COUNT
    # --------------------------------------------------------

    try:

        comment_count = (
            Comment.query
            .filter_by(
                issue_id=issue.id,
                is_deleted=False,
            )
            .count()
        )

    except Exception:

        comment_count = 0

    # --------------------------------------------------------
    # SERIALIZED OBJECT
    # --------------------------------------------------------

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

        "image_url": getattr(
            issue,
            "image_url",
            None,
        ),

        "duplicate_score": getattr(
            issue,
            "duplicate_score",
            None,
        ),

        "trending_score": (
            getattr(
                issue,
                "trending_score",
                0,
            )
            or 0
        ),

        "user_id": getattr(
            issue,
            "user_id",
            None,
        ),

        "created_at": getattr(
            issue,
            "created_at",
            None,
        ),

        "updated_at": getattr(
            issue,
            "updated_at",
            None,
        ),

        "resolved_at": getattr(
            issue,
            "resolved_at",
            None,
        ),

        "resolution_note": getattr(
            issue,
            "resolution_note",
            None,
        ),

        "support_count": (
            getattr(
                issue,
                "support_count",
                0,
            )
            or 0
        ),

        "comment_count": comment_count,
    }


# ============================================================
# CREATE ISSUE
# ============================================================

@issue_bp.route(
    "",
    methods=["POST"],
)
@jwt_required()
def create():

    # --------------------------------------------------------
    # SUPPORT JSON + FORM DATA
    # --------------------------------------------------------

    json_data = request.get_json(
        silent=True
    )

    if (
        json_data
        and isinstance(
            json_data,
            dict,
        )
    ):
        data = json_data

    else:
        data = request.form

    # --------------------------------------------------------
    # GET FIELDS
    # --------------------------------------------------------

    title = data.get(
        "title"
    )

    description = data.get(
        "description"
    )

    company = data.get(
        "company"
    )

    category = data.get(
        "category"
    )

    image_url = data.get(
        "image_url"
    )

    # --------------------------------------------------------
    # CLEAN STRINGS
    # --------------------------------------------------------

    if isinstance(
        title,
        str,
    ):
        title = title.strip()

    if isinstance(
        description,
        str,
    ):
        description = description.strip()

    if isinstance(
        company,
        str,
    ):
        company = company.strip()

    if isinstance(
        category,
        str,
    ):
        category = category.strip()

    if isinstance(
        image_url,
        str,
    ):
        image_url = image_url.strip()

    # --------------------------------------------------------
    # CHECK OPTIONAL UPLOADED IMAGE
    # --------------------------------------------------------
    #
    # The current service layer accepts image_url rather
    # than a FileStorage object.
    #
    # We still read the uploaded image so multipart requests
    # are handled correctly without crashing the route.
    # --------------------------------------------------------

    uploaded_image = request.files.get(
        "image"
    )

    if uploaded_image:

        print(
            "Image received:",
            uploaded_image.filename,
        )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not title:

        return jsonify({
            "success": False,
            "message": "title is required.",
        }), 400

    if not description:

        return jsonify({
            "success": False,
            "message": "description is required.",
        }), 400

    if not company:

        return jsonify({
            "success": False,
            "message": "company is required.",
        }), 400

    # --------------------------------------------------------
    # USER ID
    # --------------------------------------------------------

    try:

        user_id = int(
            get_jwt_identity()
        )

    except (
        TypeError,
        ValueError,
    ):

        return jsonify({
            "success": False,
            "message": (
                "Invalid user identity."
            ),
        }), 401

    # --------------------------------------------------------
    # CREATE
    # --------------------------------------------------------

    try:

        result = create_issue(
            title=title,
            description=description,
            company=company,
            category=category,
            user_id=user_id,
            image_url=image_url,
        )

        # ----------------------------------------------------
        # SERIALIZE ISSUE
        # ----------------------------------------------------

        if result.get(
            "issue"
        ):

            result["issue"] = (
                serialize_issue(
                    result["issue"]
                )
            )

        # ----------------------------------------------------
        # RETURN
        # ----------------------------------------------------

        return jsonify(
            result
        ), result.get(
            "status_code",
            201,
        )

    except Exception as error:

        print(
            "Create issue error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to create issue."
            ),
        }), 500


# ============================================================
# COMMUNITY
# ============================================================

@issue_bp.route(
    "/community",
    methods=["GET"],
)
@jwt_required()
def community():

    page = request.args.get(
        "page",
        default=1,
        type=int,
    )

    limit = request.args.get(
        "limit",
        default=50,
        type=int,
    )

    sort = request.args.get(
        "sort",
        default="latest",
        type=str,
    )

    # --------------------------------------------------------
    # VALIDATE PAGINATION
    # --------------------------------------------------------

    if page < 1:
        page = 1

    if limit < 1:
        limit = 1

    if limit > 100:
        limit = 100

    # --------------------------------------------------------
    # VALIDATE SORT
    # --------------------------------------------------------

    if sort not in {
        "latest",
        "oldest",
        "trending",
    }:
        sort = "latest"

    try:

        pagination = get_all_issues(
            page=page,
            limit=limit,
            sort=sort,
        )

        issues = [
            serialize_issue(issue)
            for issue in pagination.items
        ]

        return jsonify({
            "success": True,

            "issues": issues,

            "pagination": {
                "page": pagination.page,
                "pages": pagination.pages,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }), 200

    except Exception as error:

        print(
            "Community issues error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load community issues."
            ),
        }), 500


# ============================================================
# MY ISSUES
# ============================================================

@issue_bp.route(
    "/mine",
    methods=["GET"],
)
@jwt_required()
def my_issues():

    try:

        user_id = int(
            get_jwt_identity()
        )

    except (
        TypeError,
        ValueError,
    ):

        return jsonify({
            "success": False,
            "message": (
                "Invalid user identity."
            ),
        }), 401

    page = request.args.get(
        "page",
        default=1,
        type=int,
    )

    limit = request.args.get(
        "limit",
        default=50,
        type=int,
    )

    sort = request.args.get(
        "sort",
        default="latest",
        type=str,
    )

    # --------------------------------------------------------
    # VALIDATE PAGINATION
    # --------------------------------------------------------

    if page < 1:
        page = 1

    if limit < 1:
        limit = 1

    if limit > 100:
        limit = 100

    # --------------------------------------------------------
    # VALIDATE SORT
    # --------------------------------------------------------

    if sort not in {
        "latest",
        "oldest",
        "trending",
    }:

        sort = "latest"

    try:

        query = Issue.query.filter(
            Issue.user_id == user_id
        )

        # ----------------------------------------------------
        # HIDE DELETED
        # ----------------------------------------------------

        if hasattr(
            Issue,
            "is_deleted",
        ):

            query = query.filter(
                Issue.is_deleted.is_(False)
            )

        # ----------------------------------------------------
        # SORT
        # ----------------------------------------------------

        if sort == "oldest":

            query = query.order_by(
                Issue.created_at.asc()
            )

        elif sort == "trending":

            query = query.order_by(
                Issue.trending_score.desc()
            )

        else:

            query = query.order_by(
                Issue.created_at.desc()
            )

        # ----------------------------------------------------
        # PAGINATION
        # ----------------------------------------------------

        pagination = query.paginate(
            page=page,
            per_page=limit,
            error_out=False,
        )

        issues = [
            serialize_issue(issue)
            for issue in pagination.items
        ]

        return jsonify({

            "success": True,

            "issues": issues,

            "pagination": {
                "page": pagination.page,
                "pages": pagination.pages,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },

        }), 200

    except Exception as error:

        print(
            "My issues error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load your issues."
            ),
        }), 500


# ============================================================
# ALL ISSUES
# ============================================================

@issue_bp.route(
    "",
    methods=["GET"],
)
@jwt_required()
def get_issues():

    page = request.args.get(
        "page",
        default=1,
        type=int,
    )

    limit = request.args.get(
        "limit",
        default=50,
        type=int,
    )

    sort = request.args.get(
        "sort",
        default="latest",
        type=str,
    )

    # --------------------------------------------------------
    # VALIDATE PAGINATION
    # --------------------------------------------------------

    if page < 1:
        page = 1

    if limit < 1:
        limit = 1

    if limit > 100:
        limit = 100

    # --------------------------------------------------------
    # VALIDATE SORT
    # --------------------------------------------------------

    if sort not in {
        "latest",
        "oldest",
        "trending",
    }:

        sort = "latest"

    try:

        pagination = get_all_issues(
            page=page,
            limit=limit,
            sort=sort,
        )

        issues = [
            serialize_issue(issue)
            for issue in pagination.items
        ]

        return jsonify({

            "success": True,

            "issues": issues,

            "pagination": {
                "page": pagination.page,
                "pages": pagination.pages,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },

        }), 200

    except Exception as error:

        print(
            "Get issues error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load issues."
            ),
        }), 500


# ============================================================
# SEARCH
# ============================================================

@issue_bp.route(
    "/search",
    methods=["GET"],
)
@jwt_required()
def search():

    search_text = request.args.get(
        "search"
    )

    company = request.args.get(
        "company"
    )

    category = request.args.get(
        "category"
    )

    status = request.args.get(
        "status"
    )

    severity = request.args.get(
        "severity"
    )

    try:

        results = search_issues(
            search=search_text,
            company=company,
            category=category,
            status=status,
            severity=severity,
        )

        return jsonify({

            "success": True,

            "issues": [
                serialize_issue(issue)
                for issue in results
            ],

        }), 200

    except Exception as error:

        print(
            "Search issues error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to search issues."
            ),
        }), 500


# ============================================================
# GET SINGLE ISSUE
# ============================================================

@issue_bp.route(
    "/<int:issue_id>",
    methods=["GET"],
)
@jwt_required()
def get_single_issue(
    issue_id,
):

    try:

        issue = get_issue_by_id(
            issue_id
        )

        if not issue:

            return jsonify({
                "success": False,
                "message": "Issue not found.",
            }), 404

        serialized = serialize_issue(
            issue
        )

        return jsonify({

            "success": True,

            "issue": serialized,

            "data": serialized,

        }), 200

    except Exception as error:

        print(
            "Get issue error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load issue."
            ),
        }), 500


# ============================================================
# UPDATE ISSUE
# ============================================================

@issue_bp.route(
    "/<int:issue_id>",
    methods=["PUT"],
)
@jwt_required()
def edit_issue(
    issue_id,
):

    try:

        user_id = int(
            get_jwt_identity()
        )

    except (
        TypeError,
        ValueError,
    ):

        return jsonify({
            "success": False,
            "message": (
                "Invalid user identity."
            ),
        }), 401

    data = request.get_json(
        silent=True
    ) or {}

    try:

        result = update_issue(
            issue_id=issue_id,
            user_id=user_id,
            data=data,
        )

        if result.get(
            "issue"
        ):

            result["issue"] = (
                serialize_issue(
                    result["issue"]
                )
            )

        return jsonify(
            result
        ), result.get(
            "status_code",
            200,
        )

    except Exception as error:

        print(
            "Update issue error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to update issue."
            ),
        }), 500


# ============================================================
# DELETE ISSUE
# ============================================================

@issue_bp.route(
    "/<int:issue_id>",
    methods=["DELETE"],
)
@jwt_required()
def remove_issue(
    issue_id,
):

    try:

        user_id = int(
            get_jwt_identity()
        )

    except (
        TypeError,
        ValueError,
    ):

        return jsonify({
            "success": False,
            "message": (
                "Invalid user identity."
            ),
        }), 401

    try:

        result = delete_issue(
            issue_id=issue_id,
            user_id=user_id,
        )

        return jsonify(
            result
        ), result.get(
            "status_code",
            200,
        )

    except Exception as error:

        print(
            "Delete issue error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to delete issue."
            ),
        }), 500


# ============================================================
# UPDATE STATUS
# ============================================================

@issue_bp.route(
    "/<int:issue_id>/status",
    methods=["PATCH"],
)
@jwt_required()
def change_status(
    issue_id,
):

    try:

        user_id = int(
            get_jwt_identity()
        )

    except (
        TypeError,
        ValueError,
    ):

        return jsonify({
            "success": False,
            "message": (
                "Invalid user identity."
            ),
        }), 401

    data = request.get_json(
        silent=True
    ) or {}

    status = data.get(
        "status"
    )

    resolution_note = data.get(
        "resolution_note"
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not status:

        return jsonify({
            "success": False,
            "message": (
                "status is required."
            ),
        }), 400

    try:

        result = update_issue_status(
            issue_id=issue_id,
            user_id=user_id,
            status=status,
            resolution_note=resolution_note,
        )

        if result.get(
            "issue"
        ):

            result["issue"] = (
                serialize_issue(
                    result["issue"]
                )
            )

        return jsonify(
            result
        ), result.get(
            "status_code",
            200,
        )

    except Exception as error:

        print(
            "Status update error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to update issue status."
            ),
        }), 500