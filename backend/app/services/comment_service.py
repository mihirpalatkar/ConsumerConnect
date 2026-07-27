from app.extensions import db
from app.models.comment import Comment
from app.models.issue import Issue
from app.utils.trending import calculate_trending_score
from app.services.notification_service import create_notification

def create_comment(content, issue_id, user_id):

    issue = Issue.query.get(issue_id)

    if not issue:
        return None

    comment = Comment(
        content=content,
        issue_id=issue_id,
        user_id=user_id
    )

    db.session.add(comment)
    db.session.flush()

    issue.trending_score = calculate_trending_score(issue)

    db.session.commit()

    if issue.user_id != user_id:
        create_notification(
            user_id=issue.user_id,
            issue_id=issue.id,
            notification_type="COMMENT",
            message=f"Someone commented on your issue '{issue.title}'."
        )

    return comment

def get_comments(issue_id):
    return Comment.query.filter_by(issue_id=issue_id).all()


def delete_comment(comment_id, user_id):
    comment = Comment.query.get(comment_id)

    if not comment:
        return {
            "success": False,
            "status_code": 404,
            "message": "Comment not found"
        }

    if comment.user_id != user_id:
        return {
            "success": False,
            "status_code": 403,
            "message": "You are not authorized to delete this comment"
        }

    issue = Issue.query.get(comment.issue_id)

    db.session.delete(comment)
    db.session.flush()

    issue.trending_score = calculate_trending_score(issue)

    db.session.commit()

    return {
        "success": True,
        "status_code": 200,
        "message": "Comment deleted successfully"
    }

def reply_to_comment(content, issue_id, user_id, parent_id):

    parent_comment = Comment.query.get(parent_id)

    if not parent_comment:
        return {
            "success": False,
            "status_code": 404,
            "message": "Parent comment not found"
        }

    issue = Issue.query.get(issue_id)

    reply = Comment(
        content=content,
        issue_id=issue_id,
        user_id=user_id,
        parent_id=parent_id
    )

    db.session.add(reply)
    db.session.flush()

    issue.trending_score = calculate_trending_score(issue)

    db.session.commit()

    if parent_comment.user_id != user_id:
        create_notification(
            user_id=parent_comment.user_id,
            issue_id=issue.id,
            notification_type="REPLY",
            message="Someone replied to your comment."
        )

    return {
        "success": True,
        "status_code": 201,
        "message": "Reply added successfully",
        "reply": reply
    }