from app.extensions import db
from app.models.issue import Issue
from datetime import datetime
from app.ai.duplicate_detector import find_duplicate
from app.ai.category_classifier import classify_issue
from app.ai.predictor import predict_complaint
from app.services.history_service import create_history

def create_issue(
    title,
    description,
    company,
    category,
    user_id,
    image_url=None
):

    duplicate = find_duplicate(title, description)

    if duplicate:
        return {
            "success": False,
            "duplicate_found": True,
            "message": "A similar issue already exists.",
            "duplicate_issue": {
                "id": duplicate["issue"].id,
                "title": duplicate["issue"].title,
                "similarity": round(duplicate["score"], 2)
            },
            "status_code": 409
        }

    title = title.strip()
    description = description.strip()
    company = company.strip()

    ai_result = predict_complaint(
        complaint=description,
        support_count=0,
        images_attached=1 if image_url else 0
    )

    if not category:
        category = ai_result["sector"].strip()

    severity = ai_result["severity"].strip()
    resolution_days = ai_result["resolution_days"]
    spam = ai_result["spam"]

    issue = Issue(
        title=title,
        description=description,
        company=company,
        category=category,
        severity=severity,
        estimated_resolution_days=resolution_days,
        user_id=user_id,
        image_url=image_url
    )

    db.session.add(issue)
    db.session.commit()
    create_history(
        issue_id=issue.id,
        action="created",
        performed_by="User",
        message="Complaint created successfully."
    )

    return {
        "issue": issue,
        "ai": {
            "severity": severity,
            "category": category,
            "estimated_resolution_days": resolution_days,
            "spam": spam
        }
    }
def get_all_issues(page=1, limit=10, sort="latest"):

    query = Issue.query.filter_by(is_deleted=False).filter_by(is_deleted=False)

    if sort == "latest":
        query = query.order_by(Issue.created_at.desc())

    elif sort == "oldest":
        query = query.order_by(Issue.created_at.asc())

    elif sort == "trending":
        query = query.order_by(Issue.trending_score.desc())
    issues = query.paginate(
        page=page,
        per_page=limit,
        error_out=False
    )

    return issues


def get_issue_by_id(issue_id):
    return Issue.query.filter_by(
    id=issue_id,
    is_deleted=False
).first()


def update_issue(issue_id, user_id, data):
    issue = db.session.get(Issue, issue_id)

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found"
        }

    if issue.user_id != user_id:
        return {
            "success": False,
            "status_code": 403,
            "message": "You are not authorized to update this issue"
        }

    if "title" in data:
        issue.title = data["title"]

    if "description" in data:
        issue.description = data["description"]

    if "company" in data:
        issue.company = data["company"]

    if "category" in data:
        issue.category = data["category"]

    if "status" in data:
        issue.status = data["status"]

    if "severity" in data:
        issue.severity = data["severity"]

    db.session.commit()

    create_history(
        issue_id=issue.id,
        action="updated",
        performed_by="User",
        message="Complaint details were updated."
    )

    return {
        "success": True,
        "status_code": 200,
        "message": "Issue updated successfully",
        "issue": issue
    }


def delete_issue(issue_id, user_id):
    issue = db.session.get(Issue, issue_id)

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found"
        }

    if issue.user_id != user_id:
        return {
            "success": False,
            "status_code": 403,
            "message": "You are not authorized to delete this issue"
        }

    issue.is_deleted = True
    db.session.commit()

    create_history(
        issue_id=issue.id,
        action="deleted",
        performed_by="User",
        message="Complaint was deleted."
    )

    return {
        "success": True,
        "status_code": 200,
        "message": "Issue deleted successfully"
    }
def search_issues(search=None, company=None, category=None, status=None, severity=None):

    query = Issue.query.filter_by(is_deleted=False).filter_by(is_deleted=False)

    if search:
        query = query.filter(
            Issue.title.ilike(f"%{search}%")
        )

    if company:
        query = query.filter(
            Issue.company.ilike(f"%{company}%")
        )

    if category:
        query = query.filter(
            Issue.category.ilike(f"%{category}%")
        )

    if status:
        query = query.filter(
            Issue.status == status
        )

    if severity:
        query = query.filter(
            Issue.severity == severity
        )

    return query.all()
def update_issue_status(issue_id, user_id, status, resolution_note=None):

    issue = db.session.get(Issue, issue_id)

    if not issue:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found"
        }

    if issue.user_id != user_id:
        return {
            "success": False,
            "status_code": 403,
            "message": "You are not authorized to update this issue"
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

    if status == "Resolved":
        issue.resolved_at = datetime.utcnow()
        issue.resolution_note = resolution_note

    elif status == "Open":
        issue.resolved_at = None
        issue.resolution_note = None

    db.session.commit()

    return {
        "success": True,
        "status_code": 200,
        "message": "Issue status updated successfully",
        "issue": issue
    }