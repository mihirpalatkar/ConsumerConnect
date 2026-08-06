from app.extensions import db
from app.models.company import Company
from app.models.issue import Issue
from datetime import datetime
from app.services.notification_service import create_notification
from app.services.history_service import create_history


def register_company(name, email, password):

    if Company.query.filter_by(email=email).first():
        return None

    company = Company(name=name, email=email)

    company.set_password(password)

    db.session.add(company)
    db.session.commit()

    return company


def authenticate_company(email, password):

    company = Company.query.filter_by(email=email).first()

    if not company:
        return {"success": False, "message": "Invalid email or password"}

    if company.is_blocked:
        return {
            "success": False,
            "status_code": 403,
            "message": "Your company account has been blocked. Please contact the administrator.",
        }

    if not company.check_password(password):
        return None

    return company


def get_company_dashboard(company):

    total = Issue.query.filter_by(company=company.name).count()

    open_count = Issue.query.filter_by(company=company.name, status="Open").count()

    in_progress = Issue.query.filter_by(
        company=company.name, status="In Progress"
    ).count()

    resolved = Issue.query.filter_by(company=company.name, status="Resolved").count()

    return {
        "company": {"id": company.id, "name": company.name, "email": company.email},
        "statistics": {
            "total_complaints": total,
            "open": open_count,
            "in_progress": in_progress,
            "resolved": resolved,
        },
    }


from app.models.issue import Issue


def get_company_issues(company):

    return (
        Issue.query.filter_by(company=company.name)
        .order_by(Issue.created_at.desc())
        .all()
    )


def get_company_issue(company, issue_id):
    return Issue.query.filter_by(id=issue_id, company=company.name).first()


from datetime import datetime


def update_company_issue_status(company, issue_id, status, resolution_note=None):
    issue = Issue.query.filter_by(id=issue_id, company=company.name).first()

    if not issue:
        return {"success": False, "status_code": 404, "message": "Issue not found"}

    valid_statuses = ["Open", "In Progress", "Resolved", "Closed"]

    if status not in valid_statuses:
        return {"success": False, "status_code": 400, "message": "Invalid status"}

    old_status = issue.status

    issue.status = status

    if status == "Resolved":
        issue.resolved_at = datetime.utcnow()
        issue.resolution_note = resolution_note

    db.session.commit()

    create_history(
        issue_id=issue.id,
        action="status_changed",
        performed_by=company.name,
        old_value=old_status,
        new_value=status,
        message=f"Complaint status changed from '{old_status}' to '{status}'.",
    )

    if status == "In Progress":

        create_notification(
            user_id=issue.user_id,
            issue_id=issue.id,
            notification_type="status_update",
            message=f"{company.name} has started working on your complaint.",
        )

    elif status == "Resolved":

        create_notification(
            user_id=issue.user_id,
            issue_id=issue.id,
            notification_type="resolved",
            message=f"{company.name} has resolved your complaint.",
        )

    elif status == "Closed":

        create_notification(
            user_id=issue.user_id,
            issue_id=issue.id,
            notification_type="closed",
            message=f"{company.name} has closed your complaint.",
        )

    return {
        "success": True,
        "status_code": 200,
        "message": "Issue updated successfully",
        "issue": issue,
    }
