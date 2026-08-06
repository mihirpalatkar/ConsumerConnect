from app.extensions import db
from app.models.issue import Issue
from app.services.admin_log_service import AdminLogService


def get_all_issues():
    issues = (
        Issue.query
        .order_by(Issue.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "count": len(issues),
        "issues": [
            {
                "id": issue.id,
                "title": issue.title,
                "company": issue.company,
                "category": issue.category,
                "severity": issue.severity,
                "status": issue.status,
                "created_at": issue.created_at,
                "is_deleted": issue.is_deleted
            }
            for issue in issues
        ]
    }


def get_issue_by_id(issue_id):

    issue = db.session.get(Issue, issue_id)

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found"
        }

    return {
        "success": True,
        "issue": {
            "id": issue.id,
            "title": issue.title,
            "description": issue.description,
            "company": issue.company,
            "category": issue.category,
            "severity": issue.severity,
            "status": issue.status,
            "image_url": issue.image_url,
            "created_at": issue.created_at,
            "resolved_at": issue.resolved_at,
            "is_deleted": issue.is_deleted
        }
    }


def update_issue_status(issue_id, status):

    issue = db.session.get(Issue, issue_id)

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found"
        }

    valid_statuses = [
        "Open",
        "In Progress",
        "Resolved",
        "Closed"
    ]

    if status not in valid_statuses:
        return {
            "success": False,
            "status_code": 400,
            "message": "Invalid status"
        }

    issue.status = status

    AdminLogService.log_action(
        action="Updated Issue Status",
        target_type="Issue",
        target_id=issue.id,
        details=f"Changed status to '{status}' for issue '{issue.title}'"
    )

    db.session.commit()

    return {
        "success": True,
        "message": "Issue status updated successfully"
    }


def restore_issue(issue_id):

    issue = db.session.get(Issue, issue_id)

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found"
        }

    if not issue.is_deleted:
        return {
            "success": False,
            "status_code": 400,
            "message": "Issue is already active"
        }

    issue.is_deleted = False

    AdminLogService.log_action(
        action="Restored Issue",
        target_type="Issue",
        target_id=issue.id,
        details=f"Restored issue '{issue.title}'"
    )

    db.session.commit()

    return {
        "success": True,
        "message": "Issue restored successfully"
    }


def delete_issue(issue_id):

    issue = db.session.get(Issue, issue_id)

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found"
        }

    if issue.is_deleted:
        return {
            "success": False,
            "status_code": 400,
            "message": "Issue already deleted"
        }

    issue.is_deleted = True

    AdminLogService.log_action(
        action="Deleted Issue",
        target_type="Issue",
        target_id=issue.id,
        details=f"Deleted issue '{issue.title}'"
    )

    db.session.commit()

    return {
        "success": True,
        "message": "Issue deleted successfully"
    }