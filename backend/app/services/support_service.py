from app.extensions import db

from app.models.support import Support
from app.models.issue import Issue

from app.utils.trending import (
    calculate_trending_score,
)

from app.services.notification_service import (
    create_notification,
)


# ============================================================
# CHECK WHETHER USER SUPPORTED ISSUE
# ============================================================

def has_user_supported(
    issue_id,
    user_id,
):
    support = (
        Support.query
        .filter_by(
            issue_id=issue_id,
            user_id=user_id,
        )
        .first()
    )

    return support is not None


# ============================================================
# GET SUPPORT COUNT
# ============================================================

def get_support_count(
    issue_id,
):
    return (
        Support.query
        .filter_by(
            issue_id=issue_id
        )
        .count()
    )


# ============================================================
# TOGGLE SUPPORT
# ============================================================

def toggle_support(
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

    existing_support = (
        Support.query
        .filter_by(
            issue_id=issue_id,
            user_id=user_id,
        )
        .first()
    )

    # --------------------------------------------------------
    # REMOVE SUPPORT
    # --------------------------------------------------------

    if existing_support:

        db.session.delete(
            existing_support
        )

        db.session.flush()

        issue.trending_score = (
            calculate_trending_score(
                issue
            )
        )

        db.session.commit()

        return {
            "success": True,
            "status_code": 200,
            "message": "Support removed",
        }

    # --------------------------------------------------------
    # ADD SUPPORT
    # --------------------------------------------------------

    support = Support(
        issue_id=issue_id,
        user_id=user_id,
    )

    db.session.add(
        support
    )

    db.session.flush()

    issue.trending_score = (
        calculate_trending_score(
            issue
        )
    )

    db.session.commit()

    # Do not notify the owner when they support
    # their own issue.
    if issue.user_id != user_id:

        create_notification(
            user_id=issue.user_id,
            issue_id=issue.id,
            notification_type="SUPPORT",
            message=(
                f"Someone supported your issue "
                f"'{issue.title}'."
            ),
        )

    return {
        "success": True,
        "status_code": 201,
        "message": "Issue supported",
    }