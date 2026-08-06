from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.feedback_service import (
    add_feedback,
    get_feedback
)

feedback_bp = Blueprint(
    "feedback",
    __name__,
    url_prefix="/api/issues"
)


@feedback_bp.route("/<int:issue_id>/feedback", methods=["POST"])
@jwt_required()
def submit_feedback(issue_id):

    user_id = int(get_jwt_identity())

    data = request.get_json()

    result = add_feedback(
        issue_id=issue_id,
        user_id=user_id,
        rating=data.get("rating"),
        comment=data.get("comment")
    )

    if not result["success"]:
        return {
            "success": False,
            "message": result["message"]
        }, result["status_code"]

    return {
        "success": True,
        "message": "Feedback submitted successfully."
    }, 201


@feedback_bp.route("/<int:issue_id>/feedback", methods=["GET"])
@jwt_required()
def view_feedback(issue_id):

    feedback = get_feedback(issue_id)

    if not feedback:
        return {
            "success": False,
            "message": "No feedback found."
        }, 404

    return {
        "success": True,
        "feedback": {
            "rating": feedback.rating,
            "comment": feedback.comment,
            "created_at": feedback.created_at
        }
    }, 200