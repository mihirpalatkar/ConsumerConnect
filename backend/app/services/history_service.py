from app.extensions import db
from app.models.issue_history import IssueHistory


def create_history(
    issue_id,
    action,
    performed_by,
    message,
    old_value=None,
    new_value=None
):

    history = IssueHistory(
        issue_id=issue_id,
        action=action,
        performed_by=performed_by,
        old_value=old_value,
        new_value=new_value,
        message=message
    )

    db.session.add(history)
    db.session.commit()

    return history


def get_issue_history(issue_id):

    return IssueHistory.query.filter_by(
        issue_id=issue_id
    ).order_by(
        IssueHistory.created_at.asc()
    ).all()