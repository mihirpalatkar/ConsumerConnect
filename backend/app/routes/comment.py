from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.user import User

from app.services.comment_service import (
    create_comment,
    get_comments,
    delete_comment,
    reply_to_comment,
)

comment_bp = Blueprint(
    "comments",
    __name__,
    url_prefix="/api/comments",
)


def get_user_name(user_id):
    """
    Return the display name of the user who created
    the comment/reply.
    """

    if not user_id:
        return "User"

    user = db.session.get(
        User,
        int(user_id),
    )

    if not user:
        return f"User {user_id}"

    return (
        user.name
        or user.email
        or f"User {user.id}"
    )


def serialize_comment(comment):
    """
    Convert a Comment model into a JSON-safe object.
    """

    return {
        "id": comment.id,
        "content": comment.content,
        "issue_id": comment.issue_id,
        "user_id": comment.user_id,
        "user_name": get_user_name(
            comment.user_id
        ),
        "parent_id": comment.parent_id,
        "created_at": comment.created_at,
    }


# ============================================================
# CREATE COMMENT
# ============================================================

@comment_bp.route(
    "",
    methods=["POST"],
)
@jwt_required()
def create():
    data = request.get_json(
        silent=True
    ) or {}

    content = data.get(
        "content"
    )

    issue_id = data.get(
        "issue_id"
    )

    if (
        not content
        or not str(content).strip()
    ):
        return jsonify({
            "success": False,
            "message": "Comment content is required.",
        }), 400

    if issue_id is None:
        return jsonify({
            "success": False,
            "message": "issue_id is required.",
        }), 400

    try:
        comment = create_comment(
            content=str(
                content
            ).strip(),
            issue_id=int(
                issue_id
            ),
            user_id=int(
                get_jwt_identity()
            ),
        )

        if not comment:
            return jsonify({
                "success": False,
                "message": "Issue not found.",
            }), 404

        return jsonify({
            "success": True,
            "message": "Comment created successfully",
            "comment": serialize_comment(
                comment
            ),
            "comment_id": comment.id,
        }), 201

    except Exception as error:
        print(
            "Create comment error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": "Unable to create comment.",
        }), 500


# ============================================================
# GET COMMENTS + REPLIES
# ============================================================

@comment_bp.route(
    "/issue/<int:issue_id>",
    methods=["GET"],
)
@jwt_required()
def get_all(issue_id):
    try:
        comments = get_comments(
            issue_id
        )

        data = []

        for comment in comments:

            # Only return root comments here.
            # Replies are nested inside them.
            if comment.parent_id is not None:
                continue

            # Ignore soft-deleted comments.
            if getattr(
                comment,
                "is_deleted",
                False,
            ):
                continue

            serialized = serialize_comment(
                comment
            )

            replies = []

            for reply in comment.replies:

                # Ignore soft-deleted replies.
                if getattr(
                    reply,
                    "is_deleted",
                    False,
                ):
                    continue

                replies.append(
                    serialize_comment(
                        reply
                    )
                )

            serialized[
                "replies"
            ] = replies

            data.append(
                serialized
            )

        return jsonify({
            "success": True,
            "data": data,
            "comment_count": len(data),
        }), 200

    except Exception as error:
        print(
            "Get comments error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": "Unable to load comments.",
        }), 500


# ============================================================
# DELETE COMMENT / REPLY
# ============================================================

@comment_bp.route(
    "/<int:comment_id>",
    methods=["DELETE"],
)
@jwt_required()
def delete(comment_id):
    try:
        result = delete_comment(
            comment_id,
            int(
                get_jwt_identity()
            ),
        )

        return jsonify({
            "success": result[
                "success"
            ],
            "message": result[
                "message"
            ],
        }), result[
            "status_code"
        ]

    except Exception as error:
        print(
            "Delete comment error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": "Unable to delete this comment.",
        }), 500


# ============================================================
# CREATE REPLY
# ============================================================

@comment_bp.route(
    "/reply",
    methods=["POST"],
)
@jwt_required()
def reply():
    data = request.get_json(
        silent=True
    ) or {}

    content = data.get(
        "content"
    )

    issue_id = data.get(
        "issue_id"
    )

    parent_id = data.get(
        "parent_id"
    )

    if (
        not content
        or not str(content).strip()
    ):
        return jsonify({
            "success": False,
            "message": "Reply content is required.",
        }), 400

    if issue_id is None:
        return jsonify({
            "success": False,
            "message": "issue_id is required.",
        }), 400

    if parent_id is None:
        return jsonify({
            "success": False,
            "message": "parent_id is required.",
        }), 400

    try:
        result = reply_to_comment(
            content=str(
                content
            ).strip(),
            issue_id=int(
                issue_id
            ),
            user_id=int(
                get_jwt_identity()
            ),
            parent_id=int(
                parent_id
            ),
        )

        if not result[
            "success"
        ]:
            return jsonify({
                "success": False,
                "message": result[
                    "message"
                ],
            }), result[
                "status_code"
            ]

        reply_obj = result[
            "reply"
        ]

        return jsonify({
            "success": True,
            "message": result[
                "message"
            ],
            "reply": serialize_comment(
                reply_obj
            ),
            "reply_id": reply_obj.id,
        }), result[
            "status_code"
        ]

    except Exception as error:
        print(
            "Reply creation error:",
            error,
        )

        return jsonify({
            "success": False,
            "message": "Unable to create reply.",
        }), 500