from datetime import datetime

from sqlalchemy import or_

from app.extensions import db
from app.models.issue import Issue
from app.ai.duplicate_detector import find_duplicate
from app.ai.predictor import predict_complaint
from app.services.history_service import create_history
from app.utils.trending import calculate_trending_score


# ============================================================
# CREATE ISSUE
# ============================================================

def create_issue(
    title,
    description,
    company,
    category,
    user_id,
    image_url=None,
):
    """
    Create a new consumer issue.

    Also checks for duplicate complaints and uses AI
    prediction for category, severity, and resolution time.
    """

    title = (title or "").strip()
    description = (description or "").strip()
    company = (company or "").strip()

    if category:
        category = category.strip()

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not title:
        return {
            "success": False,
            "status_code": 400,
            "message": "title is required.",
        }

    if not description:
        return {
            "success": False,
            "status_code": 400,
            "message": "description is required.",
        }

    if not company:
        return {
            "success": False,
            "status_code": 400,
            "message": "company is required.",
        }

    # --------------------------------------------------------
    # DUPLICATE CHECK
    # --------------------------------------------------------

    duplicate = find_duplicate(
        title,
        description,
    )

    if duplicate:
        duplicate_issue = duplicate.get("issue")
        duplicate_score = duplicate.get("score", 0)

        if duplicate_issue:
            return {
                "success": False,
                "duplicate_found": True,
                "message": "A similar issue already exists.",
                "duplicate_issue": {
                    "id": duplicate_issue.id,
                    "title": duplicate_issue.title,
                    "similarity": round(
                        float(duplicate_score or 0),
                        2,
                    ),
                },
                "status_code": 409,
            }

    # --------------------------------------------------------
    # AI PREDICTION
    # --------------------------------------------------------

    ai_result = predict_complaint(
        complaint=description,
        support_count=0,
        images_attached=1 if image_url else 0,
    )

    if not isinstance(ai_result, dict):
        ai_result = {}

    # --------------------------------------------------------
    # CATEGORY
    # --------------------------------------------------------

    if not category:
        category = (
            ai_result.get("sector")
            or "Other"
        )

    category = str(category).strip() or "Other"

    # --------------------------------------------------------
    # SEVERITY
    # --------------------------------------------------------

    severity = (
        ai_result.get("severity")
        or "Medium"
    )

    severity = (
        str(severity).strip()
        or "Medium"
    )

    # --------------------------------------------------------
    # RESOLUTION
    # --------------------------------------------------------

    resolution_days = ai_result.get(
        "resolution_days"
    )

    # --------------------------------------------------------
    # SPAM
    # --------------------------------------------------------

    spam = bool(
        ai_result.get(
            "spam",
            False,
        )
    )

    # --------------------------------------------------------
    # CREATE ISSUE
    # --------------------------------------------------------

    issue = Issue(
        title=title,
        description=description,
        company=company,
        category=category,
        severity=severity,
        estimated_resolution_days=resolution_days,
        user_id=user_id,
        image_url=image_url,
    )

    db.session.add(issue)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    # --------------------------------------------------------
    # INITIAL TRENDING SCORE
    # --------------------------------------------------------

    try:
        issue.trending_score = (
            calculate_trending_score(issue)
        )

        db.session.commit()

    except Exception:
        db.session.rollback()

    # --------------------------------------------------------
    # HISTORY
    # --------------------------------------------------------

    try:
        create_history(
            issue_id=issue.id,
            action="created",
            performed_by="User",
            message="Complaint created successfully.",
        )
    except Exception:
        db.session.rollback()

    return {
        "success": True,
        "status_code": 201,
        "message": "Issue created successfully.",
        "issue": issue,
        "ai": {
            "severity": severity,
            "category": category,
            "estimated_resolution_days": resolution_days,
            "spam": spam,
        },
    }


# ============================================================
# RECALCULATE TRENDING SCORES
# ============================================================

def refresh_trending_scores():
    """
    Recalculate the current trending score for every
    active issue.

    This prevents old stored scores from remaining stale
    as time passes.
    """

    issues = (
        Issue.query
        .filter_by(is_deleted=False)
        .all()
    )

    changed = False

    for issue in issues:
        new_score = calculate_trending_score(
            issue
        )

        current_score = (
            float(
                issue.trending_score or 0
            )
        )

        if abs(
            current_score - new_score
        ) > 0.001:
            issue.trending_score = new_score
            changed = True

    if changed:
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    return issues


# ============================================================
# GET ALL ISSUES
# ============================================================

def get_all_issues(
    page=1,
    limit=10,
    sort="latest",
):
    """
    Return active issues with pagination.

    For trending results, scores are recalculated first so
    ranking reflects the current age of each issue.
    """

    # --------------------------------------------------------
    # TRENDING
    # --------------------------------------------------------

    if sort == "trending":
        refresh_trending_scores()

    query = (
        Issue.query
        .filter_by(is_deleted=False)
    )

    # --------------------------------------------------------
    # SORT
    # --------------------------------------------------------

    if sort == "latest":
        query = query.order_by(
            Issue.created_at.desc()
        )

    elif sort == "oldest":
        query = query.order_by(
            Issue.created_at.asc()
        )

    elif sort == "trending":
        query = query.order_by(
            Issue.trending_score.desc(),
            Issue.created_at.desc(),
        )

    else:
        query = query.order_by(
            Issue.created_at.desc()
        )

    # --------------------------------------------------------
    # PAGINATION
    # --------------------------------------------------------

    return query.paginate(
        page=page,
        per_page=limit,
        error_out=False,
    )


# ============================================================
# GET SINGLE ISSUE
# ============================================================

def get_issue_by_id(issue_id):
    return (
        Issue.query
        .filter_by(
            id=issue_id,
            is_deleted=False,
        )
        .first()
    )


# ============================================================
# UPDATE ISSUE
# ============================================================

def update_issue(
    issue_id,
    user_id,
    data,
):
    issue = db.session.get(
        Issue,
        issue_id,
    )

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found",
        }

    if issue.user_id != user_id:
        return {
            "success": False,
            "status_code": 403,
            "message": (
                "You are not authorized "
                "to update this issue"
            ),
        }

    # --------------------------------------------------------
    # UPDATE FIELDS
    # --------------------------------------------------------

    if "title" in data:
        value = data.get("title")

        if isinstance(value, str):
            value = value.strip()

        if value:
            issue.title = value

    if "description" in data:
        value = data.get("description")

        if isinstance(value, str):
            value = value.strip()

        if value:
            issue.description = value

    if "company" in data:
        value = data.get("company")

        if isinstance(value, str):
            value = value.strip()

        if value:
            issue.company = value

    if "category" in data:
        value = data.get("category")

        if isinstance(value, str):
            value = value.strip()

        if value:
            issue.category = value

    if "status" in data:
        issue.status = data["status"]

    if "severity" in data:
        issue.severity = data["severity"]

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    try:
        issue.trending_score = (
            calculate_trending_score(issue)
        )

        db.session.commit()

    except Exception:
        db.session.rollback()
        raise

    # --------------------------------------------------------
    # HISTORY
    # --------------------------------------------------------

    try:
        create_history(
            issue_id=issue.id,
            action="updated",
            performed_by="User",
            message="Complaint details were updated.",
        )
    except Exception:
        db.session.rollback()

    return {
        "success": True,
        "status_code": 200,
        "message": "Issue updated successfully",
        "issue": issue,
    }


# ============================================================
# DELETE ISSUE
# ============================================================

def delete_issue(
    issue_id,
    user_id,
):
    issue = db.session.get(
        Issue,
        issue_id,
    )

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found",
        }

    if issue.user_id != user_id:
        return {
            "success": False,
            "status_code": 403,
            "message": (
                "You are not authorized "
                "to delete this issue"
            ),
        }

    issue.is_deleted = True

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    try:
        create_history(
            issue_id=issue.id,
            action="deleted",
            performed_by="User",
            message="Complaint was deleted.",
        )
    except Exception:
        db.session.rollback()

    return {
        "success": True,
        "status_code": 200,
        "message": "Issue deleted successfully",
    }


# ============================================================
# SEARCH ISSUES
# ============================================================

def search_issues(
    search=None,
    company=None,
    category=None,
    status=None,
    severity=None,
):
    """
    Search active issues by text and optional filters.
    """

    query = (
        Issue.query
        .filter_by(is_deleted=False)
    )

    # --------------------------------------------------------
    # GENERAL SEARCH
    # --------------------------------------------------------

    if search:
        search = search.strip()

        if search:
            pattern = f"%{search}%"

            query = query.filter(
                or_(
                    Issue.title.ilike(pattern),
                    Issue.description.ilike(pattern),
                    Issue.company.ilike(pattern),
                    Issue.category.ilike(pattern),
                )
            )

    # --------------------------------------------------------
    # COMPANY
    # --------------------------------------------------------

    if company:
        query = query.filter(
            Issue.company.ilike(
                f"%{company.strip()}%"
            )
        )

    # --------------------------------------------------------
    # CATEGORY
    # --------------------------------------------------------

    if category:
        query = query.filter(
            Issue.category.ilike(
                f"%{category.strip()}%"
            )
        )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status:
        query = query.filter(
            Issue.status == status
        )

    # --------------------------------------------------------
    # SEVERITY
    # --------------------------------------------------------

    if severity:
        query = query.filter(
            Issue.severity == severity
        )

    # --------------------------------------------------------
    # SORT
    # --------------------------------------------------------

    query = query.order_by(
        Issue.created_at.desc()
    )

    return query.all()


# ============================================================
# UPDATE ISSUE STATUS
# ============================================================

def update_issue_status(
    issue_id,
    user_id,
    status,
    resolution_note=None,
):
    issue = db.session.get(
        Issue,
        issue_id,
    )

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found",
        }

    if issue.user_id != user_id:
        return {
            "success": False,
            "status_code": 403,
            "message": (
                "You are not authorized "
                "to update this issue"
            ),
        }

    # --------------------------------------------------------
    # VALID STATUSES
    # --------------------------------------------------------

    valid_statuses = [
        "Open",
        "In Progress",
        "Resolved",
        "Closed",
    ]

    if status not in valid_statuses:
        return {
            "success": False,
            "status_code": 400,
            "message": "Invalid status",
        }

    issue.status = status

    # --------------------------------------------------------
    # RESOLUTION
    # --------------------------------------------------------

    if status == "Resolved":
        issue.resolved_at = datetime.utcnow()
        issue.resolution_note = resolution_note

    elif status == "Open":
        issue.resolved_at = None
        issue.resolution_note = None

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    try:
        issue.trending_score = (
            calculate_trending_score(issue)
        )

        db.session.commit()

    except Exception:
        db.session.rollback()
        raise

    return {
        "success": True,
        "status_code": 200,
        "message": "Issue status updated successfully",
        "issue": issue,
    }