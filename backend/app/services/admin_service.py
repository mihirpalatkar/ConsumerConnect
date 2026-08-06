from app.models.user import User
from app.models.issue import Issue


def get_all_users():
    """
    Return all registered users.
    """

    users = User.query.order_by(User.created_at.desc()).all()

    return {
        "success": True,
        "count": len(users),
        "users": [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at.strftime("%d-%m-%Y %H:%M"),
            }
            for user in users
        ],
    }


def get_all_issues():
    """
    Return all complaints.
    """

    issues = Issue.query.order_by(Issue.created_at.desc()).all()

    return {
        "success": True,
        "count": len(issues),
        "issues": [
            {
                "id": issue.id,
                "title": issue.title,
                "description": issue.description,
                "company": issue.company,
                "category": issue.category,
                "severity": issue.severity,
                "status": issue.status,
                "duplicate_score": issue.duplicate_score,
                "trending_score": issue.trending_score,
                "estimated_resolution_days": issue.estimated_resolution_days,
                "created_by": issue.user.name,
                "created_at": issue.created_at.strftime("%d-%m-%Y %H:%M"),
            }
            for issue in issues
        ],
    }
