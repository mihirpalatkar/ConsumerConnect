from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.comment import Comment
from app.services.admin_comment_service import AdminCommentService
from app.utils.admin import admin_required
from app.services.admin_log_service import AdminLogService

admin_comment_bp = Blueprint(
    "admin_comment",
    __name__,
    url_prefix="/api/admin/comments"
)


@admin_comment_bp.route("", methods=["GET"])
@jwt_required()
@admin_required
def get_all_comments():
    comments = AdminCommentService.get_all_comments()

    return jsonify({
        "success": True,
        "data": [
            {
                "id": comment.id,
                "content": comment.content,
                "issue_id": comment.issue_id,
                "user_id": comment.user_id,
                "is_deleted": comment.is_deleted,
                "created_at": comment.created_at
            }
            for comment in comments
        ]
    }), 200


@admin_comment_bp.route("/<int:comment_id>", methods=["GET"])
@jwt_required()
@admin_required
def get_comment(comment_id):
    comment = AdminCommentService.get_comment(comment_id)

    if not comment:
        return jsonify({
            "success": False,
            "message": "Comment not found."
        }), 404

    return jsonify({
        "success": True,
        "data": {
            "id": comment.id,
            "content": comment.content,
            "issue_id": comment.issue_id,
            "user_id": comment.user_id,
            "is_deleted": comment.is_deleted,
            "created_at": comment.created_at
        }
    }), 200


@admin_comment_bp.route("/<int:comment_id>/delete", methods=["PATCH"])
@jwt_required()
@admin_required
def delete_comment(comment_id):
    comment = Comment.query.get(comment_id)

    if not comment:
        return jsonify({
            "success": False,
            "message": "Comment not found."
        }), 404

    if comment.is_deleted:
        return jsonify({
            "success": False,
            "message": "Comment already deleted."
        }), 400

    AdminCommentService.delete_comment(comment)


    return jsonify({
        "success": True,
        "message": "Comment deleted successfully."
    }), 200


@admin_comment_bp.route("/<int:comment_id>/restore", methods=["PATCH"])
@jwt_required()
@admin_required
def restore_comment(comment_id):
    comment = Comment.query.get(comment_id)

    if not comment:
        return jsonify({
            "success": False,
            "message": "Comment not found."
        }), 404

    if not comment.is_deleted:
        return jsonify({
            "success": False,
            "message": "Comment is already active."
        }), 400

    AdminCommentService.restore_comment(comment)


    return jsonify({
        "success": True,
        "message": "Comment restored successfully."
    }), 200