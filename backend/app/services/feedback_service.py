from app.extensions import db
from app.models.feedback import Feedback
from app.models.issue import Issue
from app.services.history_service import create_history


def add_feedback(issue_id, user_id, rating, comment):

    issue = db.session.get(Issue, issue_id)

    if not issue:
        return {"success": False, "message": "Issue not found", "status_code": 404}

    if issue.user_id != user_id:

        return {
            "success": False,
            "message": "You can only rate your own complaint.",
            "status_code": 403,
        }

    if issue.status != "Resolved":
        return {
            "success": False,
            "message": "Feedback can only be given after the complaint is resolved.",
            "status_code": 400,
        }

    existing = Feedback.query.filter_by(issue_id=issue_id).first()

    if existing:
        return {
            "success": False,
            "message": "Feedback already submitted.",
            "status_code": 400,
        }

    feedback = Feedback(
        issue_id=issue_id, user_id=user_id, rating=rating, comment=comment
    )

    db.session.add(feedback)
    db.session.commit()

    create_history(
        issue_id=issue.id,
        action="feedback",
        performed_by="User",
        message=f"User rated the complaint {rating}/5.",
    )

    return {"success": True, "feedback": feedback, "status_code": 201}


def get_feedback(issue_id):

    return Feedback.query.filter_by(issue_id=issue_id).first()
