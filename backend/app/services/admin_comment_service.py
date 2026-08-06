from app.extensions import db
from app.models.comment import Comment
from app.services.admin_log_service import AdminLogService


class AdminCommentService:

    @staticmethod
    def get_all_comments():
        return Comment.query.order_by(Comment.created_at.desc()).all()

    @staticmethod
    def get_comment(comment_id):
        return db.session.get(Comment, comment_id)

    @staticmethod
    def delete_comment(comment):
        comment.is_deleted = True

        AdminLogService.log_action(
            action="Deleted Comment",
            target_type="Comment",
            target_id=comment.id,
            details=f"Deleted comment #{comment.id}",
        )

        db.session.commit()

    @staticmethod
    def restore_comment(comment):
        comment.is_deleted = False

        AdminLogService.log_action(
            action="Restored Comment",
            target_type="Comment",
            target_id=comment.id,
            details=f"Restored comment #{comment.id}",
        )

        db.session.commit()
