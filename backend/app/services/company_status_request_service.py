from datetime import datetime

from app.extensions import db
from app.models.company_status_request import (
    CompanyStatusRequest,
)
from app.models.company import Company
from app.models.issue import Issue
from app.models.user import User

from app.services.history_service import create_history
from app.services.notification_service import create_notification


VALID_STATUSES = [
    "Open",
    "In Progress",
    "Resolved",
    "Closed",
]

VALID_REQUEST_STATUSES = [
    "Pending",
    "Approved",
    "Rejected",
]


# ============================================================
# SERIALIZER
# ============================================================

def serialize_status_request(
    status_request,
):
    if status_request is None:
        return None

    issue = db.session.get(
        Issue,
        status_request.issue_id,
    )

    company = db.session.get(
        Company,
        status_request.company_id,
    )

    reviewer_name = None

    if status_request.reviewed_by:
        reviewer = db.session.get(
            User,
            status_request.reviewed_by,
        )

        if reviewer:
            reviewer_name = (
                reviewer.name
                or reviewer.email
                or f"User {reviewer.id}"
            )

    return {
        "id": status_request.id,

        "issue_id": status_request.issue_id,

        "company_id": status_request.company_id,

        "company_name": (
            company.name
            if company
            else None
        ),

        "issue_title": (
            issue.title
            if issue
            else None
        ),

        "current_status": (
            issue.status
            if issue
            else None
        ),

        "requested_status":
            status_request.requested_status,

        "resolution_note":
            status_request.resolution_note,

        "status":
            status_request.status,

        "created_at":
            status_request.created_at,

        "reviewed_at":
            status_request.reviewed_at,

        "reviewed_by":
            status_request.reviewed_by,

        "reviewer_name":
            reviewer_name,

        "review_note":
            status_request.review_note,
    }


# ============================================================
# COMPANY REQUEST STATUS CHANGE
# ============================================================

def create_status_request(
    company,
    issue_id,
    requested_status,
    resolution_note=None,
):
    requested_status = str(
        requested_status or ""
    ).strip()

    if requested_status not in VALID_STATUSES:
        return {
            "success": False,
            "status_code": 400,
            "message": "Invalid status.",
        }

    issue = (
        Issue.query
        .filter_by(
            id=issue_id,
            company=company.name,
        )
        .first()
    )

    if issue is None:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found.",
        }

    if issue.status == requested_status:
        return {
            "success": False,
            "status_code": 400,
            "message": (
                f"Issue is already '{requested_status}'."
            ),
        }

    existing_request = (
        CompanyStatusRequest.query
        .filter_by(
            issue_id=issue.id,
            company_id=company.id,
            status="Pending",
        )
        .first()
    )

    if existing_request:
        return {
            "success": False,
            "status_code": 409,
            "message": (
                "A status change request is already "
                "pending for this issue."
            ),
            "status_request":
                serialize_status_request(
                    existing_request
                ),
        }

    status_request = CompanyStatusRequest(
        issue_id=issue.id,
        company_id=company.id,
        requested_status=requested_status,
        resolution_note=(
            str(resolution_note).strip()
            if resolution_note
            else None
        ),
        status="Pending",
    )

    db.session.add(
        status_request
    )

    try:
        db.session.commit()

    except Exception as error:
        db.session.rollback()

        print(
            "Status request database error:",
            error,
        )

        return {
            "success": False,
            "status_code": 500,
            "message": (
                "Unable to create status request."
            ),
        }

    try:
        create_history(
            issue_id=issue.id,
            action="status_change_requested",
            performed_by=company.name,
            old_value=issue.status,
            new_value=requested_status,
            message=(
                f"{company.name} requested a status "
                f"change from '{issue.status}' "
                f"to '{requested_status}'."
            ),
        )
    except Exception as error:
        print(
            "Status request history error:",
            error,
        )

    return {
        "success": True,
        "status_code": 201,
        "message": (
            "Status change request submitted "
            "for admin approval."
        ),
        "issue": {
            "id": issue.id,
            "status": issue.status,
            "resolution_note":
                issue.resolution_note,
            "resolved_at":
                issue.resolved_at,
        },
        "status_request":
            serialize_status_request(
                status_request
            ),
    }


# ============================================================
# COMPANY REQUESTS
# ============================================================

def get_company_status_requests(
    company,
):
    requests = (
        CompanyStatusRequest.query
        .filter_by(
            company_id=company.id
        )
        .order_by(
            CompanyStatusRequest.created_at.desc()
        )
        .all()
    )

    return [
        serialize_status_request(
            item
        )
        for item in requests
    ]


# ============================================================
# ADMIN — PENDING REQUESTS
# ============================================================

def get_pending_status_requests():
    requests = (
        CompanyStatusRequest.query
        .filter_by(
            status="Pending"
        )
        .order_by(
            CompanyStatusRequest.created_at.asc()
        )
        .all()
    )

    return [
        serialize_status_request(
            item
        )
        for item in requests
    ]


# ============================================================
# ADMIN — GET ONE REQUEST
# ============================================================

def get_status_request(
    request_id,
):
    status_request = db.session.get(
        CompanyStatusRequest,
        request_id,
    )

    if status_request is None:
        return None

    return serialize_status_request(
        status_request
    )


# ============================================================
# ADMIN — APPROVE
# ============================================================

def approve_status_request(
    request_id,
    admin_user_id,
    review_note=None,
):
    status_request = db.session.get(
        CompanyStatusRequest,
        request_id,
    )

    if status_request is None:
        return {
            "success": False,
            "status_code": 404,
            "message": "Status request not found.",
        }

    if status_request.status != "Pending":
        return {
            "success": False,
            "status_code": 409,
            "message": (
                "This status request has already "
                "been reviewed."
            ),
        }

    issue = db.session.get(
        Issue,
        status_request.issue_id,
    )

    company = db.session.get(
        Company,
        status_request.company_id,
    )

    if issue is None:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found.",
        }

    if company is None:
        return {
            "success": False,
            "status_code": 404,
            "message": "Company not found.",
        }

    requested_status = (
        status_request.requested_status
    )

    old_status = issue.status

    if requested_status not in VALID_STATUSES:
        return {
            "success": False,
            "status_code": 400,
            "message": "Invalid requested status.",
        }

    # --------------------------------------------------------
    # APPLY STATUS
    # --------------------------------------------------------

    issue.status = requested_status

    if requested_status == "Resolved":

        issue.resolved_at = (
            datetime.utcnow()
        )

        issue.resolution_note = (
            status_request.resolution_note
        )

    elif requested_status == "Open":

        issue.resolved_at = None
        issue.resolution_note = None

    else:

        issue.resolved_at = None
        issue.resolution_note = None

    # --------------------------------------------------------
    # UPDATE REQUEST
    # --------------------------------------------------------

    status_request.status = "Approved"

    status_request.reviewed_at = (
        datetime.utcnow()
    )

    status_request.reviewed_by = (
        admin_user_id
    )

    status_request.review_note = (
        str(review_note).strip()
        if review_note
        else None
    )

    try:
        db.session.commit()

    except Exception as error:
        db.session.rollback()

        print(
            "Approve status request error:",
            error,
        )

        return {
            "success": False,
            "status_code": 500,
            "message": (
                "Unable to approve status request."
            ),
        }

    # --------------------------------------------------------
    # HISTORY
    # --------------------------------------------------------

    try:
        create_history(
            issue_id=issue.id,
            action="status_change_approved",
            performed_by=(
                f"Admin {admin_user_id}"
            ),
            old_value=old_status,
            new_value=requested_status,
            message=(
                f"Admin approved {company.name}'s "
                f"status change request. "
                f"Status changed from '{old_status}' "
                f"to '{requested_status}'."
            ),
        )
    except Exception as error:
        print(
            "Approval history error:",
            error,
        )

    # --------------------------------------------------------
    # CONSUMER NOTIFICATION
    # --------------------------------------------------------

    try:
        if issue.user_id:

            if requested_status == "In Progress":

                create_notification(
                    user_id=issue.user_id,
                    issue_id=issue.id,
                    notification_type="status_update",
                    message=(
                        f"{company.name} has started "
                        f"working on your complaint."
                    ),
                )

            elif requested_status == "Resolved":

                create_notification(
                    user_id=issue.user_id,
                    issue_id=issue.id,
                    notification_type="resolved",
                    message=(
                        f"{company.name} has resolved "
                        f"your complaint."
                    ),
                )

            elif requested_status == "Closed":

                create_notification(
                    user_id=issue.user_id,
                    issue_id=issue.id,
                    notification_type="closed",
                    message=(
                        f"{company.name} has closed "
                        f"your complaint."
                    ),
                )

            elif requested_status == "Open":

                create_notification(
                    user_id=issue.user_id,
                    issue_id=issue.id,
                    notification_type="status_update",
                    message=(
                        f"{company.name} has changed "
                        f"your complaint status back "
                        f"to Open."
                    ),
                )

    except Exception as error:
        print(
            "Consumer notification error:",
            error,
        )

    return {
        "success": True,
        "status_code": 200,
        "message": (
            "Status change request approved."
        ),
        "issue": {
            "id": issue.id,
            "status": issue.status,
            "resolution_note":
                issue.resolution_note,
            "resolved_at":
                issue.resolved_at,
        },
        "status_request":
            serialize_status_request(
                status_request
            ),
    }


# ============================================================
# ADMIN — REJECT
# ============================================================

def reject_status_request(
    request_id,
    admin_user_id,
    review_note=None,
):
    status_request = db.session.get(
        CompanyStatusRequest,
        request_id,
    )

    if status_request is None:
        return {
            "success": False,
            "status_code": 404,
            "message": "Status request not found.",
        }

    if status_request.status != "Pending":
        return {
            "success": False,
            "status_code": 409,
            "message": (
                "This status request has already "
                "been reviewed."
            ),
        }

    issue = db.session.get(
        Issue,
        status_request.issue_id,
    )

    company = db.session.get(
        Company,
        status_request.company_id,
    )

    if issue is None:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found.",
        }

    if company is None:
        return {
            "success": False,
            "status_code": 404,
            "message": "Company not found.",
        }

    status_request.status = "Rejected"

    status_request.reviewed_at = (
        datetime.utcnow()
    )

    status_request.reviewed_by = (
        admin_user_id
    )

    status_request.review_note = (
        str(review_note).strip()
        if review_note
        else None
    )

    try:
        db.session.commit()

    except Exception as error:
        db.session.rollback()

        print(
            "Reject status request error:",
            error,
        )

        return {
            "success": False,
            "status_code": 500,
            "message": (
                "Unable to reject status request."
            ),
        }

    try:
        create_history(
            issue_id=issue.id,
            action="status_change_rejected",
            performed_by=(
                f"Admin {admin_user_id}"
            ),
            old_value=issue.status,
            new_value=(
                status_request.requested_status
            ),
            message=(
                f"Admin rejected {company.name}'s "
                f"request to change the complaint "
                f"status from '{issue.status}' to "
                f"'{status_request.requested_status}'."
            ),
        )
    except Exception as error:
        print(
            "Rejection history error:",
            error,
        )

    if issue.user_id:

        try:
            create_notification(
                user_id=issue.user_id,
                issue_id=issue.id,
                notification_type="status_request_rejected",
                message=(
                    f"{company.name}'s requested status "
                    f"change was rejected by an administrator."
                ),
            )
        except Exception as error:
            print(
                "Rejection notification error:",
                error,
            )

    return {
        "success": True,
        "status_code": 200,
        "message": (
            "Status change request rejected."
        ),
        "issue": {
            "id": issue.id,
            "status": issue.status,
        },
        "status_request":
            serialize_status_request(
                status_request
            ),
    }