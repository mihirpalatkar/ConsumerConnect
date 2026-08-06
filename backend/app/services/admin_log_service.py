from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.admin_log import AdminLog


class AdminLogService:

    @staticmethod
    def log_action(action, target_type, target_id, details=None):
        log = AdminLog(
            admin_id=get_jwt_identity(),
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details
        )

        db.session.add(log)