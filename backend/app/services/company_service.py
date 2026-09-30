from app.extensions import db
from app.models.company import Company
from app.models.issue import Issue

from app.services.company_status_request_service import (
    create_status_request,
    get_company_status_requests,
)


# ============================================================
# COMPANY REGISTRATION
# ============================================================

def register_company(name, email, password):

    if Company.query.filter_by(
        email=email
    ).first():
        return None

    company = Company(
        name=name,
        email=email,
    )

    company.set_password(
        password
    )

    db.session.add(
        company
    )

    db.session.commit()

    return company


# ============================================================
# COMPANY AUTHENTICATION
# ============================================================

def authenticate_company(
    email,
    password,
):

    company = (
        Company.query
        .filter_by(email=email)
        .first()
    )

    if not company:
        return {
            "success": False,
            "message": (
                "Invalid email or password"
            ),
        }

    if company.is_blocked:

        return {
            "success": False,
            "status_code": 403,
            "message": (
                "Your company account has been blocked. "
                "Please contact the administrator."
            ),
        }

    if not company.check_password(
        password
    ):
        return None

    return company


# ============================================================
# COMPANY DASHBOARD
# ============================================================

def get_company_dashboard(
    company,
):

    total = (
        Issue.query
        .filter_by(
            company=company.name
        )
        .count()
    )

    open_count = (
        Issue.query
        .filter_by(
            company=company.name,
            status="Open",
        )
        .count()
    )

    in_progress = (
        Issue.query
        .filter_by(
            company=company.name,
            status="In Progress",
        )
        .count()
    )

    resolved = (
        Issue.query
        .filter_by(
            company=company.name,
            status="Resolved",
        )
        .count()
    )

    return {
        "company": {
            "id": company.id,
            "name": company.name,
            "email": company.email,
        },

        "statistics": {
            "total_complaints": total,
            "open": open_count,
            "in_progress": in_progress,
            "resolved": resolved,
        },
    }


# ============================================================
# GET COMPANY ISSUES
# ============================================================

def get_company_issues(
    company,
):

    return (
        Issue.query
        .filter_by(
            company=company.name
        )
        .order_by(
            Issue.created_at.desc()
        )
        .all()
    )


# ============================================================
# GET SINGLE COMPANY ISSUE
# ============================================================

def get_company_issue(
    company,
    issue_id,
):

    return (
        Issue.query
        .filter_by(
            id=issue_id,
            company=company.name,
        )
        .first()
    )


# ============================================================
# COMPANY STATUS REQUEST
# ============================================================

def update_company_issue_status(
    company,
    issue_id,
    status,
    resolution_note=None,
):
    """
    This function no longer changes the issue status
    immediately.

    It creates a pending request for admin approval.
    """

    return create_status_request(
        company=company,
        issue_id=issue_id,
        requested_status=status,
        resolution_note=resolution_note,
    )


# ============================================================
# GET COMPANY STATUS REQUESTS
# ============================================================

def get_company_status_request_list(
    company,
):
    return get_company_status_requests(
        company
    )