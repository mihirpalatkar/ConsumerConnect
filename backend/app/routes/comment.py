from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.comment_service import (
    create_comment,
    get_comments,
    delete_comment,
    reply_to_comment,
)

comment_bp = Blueprint("comments", __name__, url_prefix="/api/comments")


@comment_bp.route("", methods=["POST"])
@jwt_required()
def create():

    data = request.get_json()

    comment = create_comment(
        content=data.get("content"),
        issue_id=data.get("issue_id"),
        user_id=int(get_jwt_identity()),
    )

    return (
        jsonify(
            {
                "success": True,
                "message": "Comment created successfully",
                "comment_id": comment.id,
            }
        ),
        201,
    )


@comment_bp.route("/issue/<int:issue_id>", methods=["GET"])
@jwt_required()
def get_all(issue_id):

    comments = get_comments(issue_id)

    data = []

    for comment in comments:

        if comment.parent_id is not None:
            continue

        replies = []

        for reply in comment.replies:
            replies.append(
                {"id": reply.id, "content": reply.content, "user_id": reply.user_id}
            )

        data.append(
            {
                "id": comment.id,
                "content": comment.content,
                "user_id": comment.user_id,
                "replies": replies,
            }
        )

    return jsonify({"success": True, "data": data}), 200


@comment_bp.route("/<int:comment_id>", methods=["DELETE"])
@jwt_required()
def delete(comment_id):

    result = delete_comment(comment_id, int(get_jwt_identity()))

    return (
        jsonify({"success": result["success"], "message": result["message"]}),
        result["status_code"],
    )


@comment_bp.route("/reply", methods=["POST"])
@jwt_required()
def reply():

    data = request.get_json()

    result = reply_to_comment(
        content=data.get("content"),
        issue_id=data.get("issue_id"),
        user_id=int(get_jwt_identity()),
        parent_id=data.get("parent_id"),
    )

    if not result["success"]:
        return (
            jsonify({"success": False, "message": result["message"]}),
            result["status_code"],
        )

    return (
        jsonify(
            {
                "success": True,
                "message": result["message"],
                "reply_id": result["reply"].id,
            }
        ),
        result["status_code"],
    )
