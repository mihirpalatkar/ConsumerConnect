from app.extensions import db
from app.models.user import User
from app.services.admin_log_service import AdminLogService


def get_all_users():
    users = User.query.order_by(User.created_at.desc()).all()

    data = []

    for user in users:
        data.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "is_blocked": user.is_blocked,
                "created_at": user.created_at,
            }
        )

    return {"success": True, "count": len(data), "users": data}


def get_user_by_id(user_id):
    user = db.session.get(User, user_id)

    if not user:
        return {"success": False, "status_code": 404, "message": "User not found"}

    return {
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_blocked": user.is_blocked,
            "created_at": user.created_at,
        },
    }


def block_user(user_id):
    user = db.session.get(User, user_id)

    if not user:
        return {"success": False, "status_code": 404, "message": "User not found"}

    if user.role.lower() == "admin":
        return {
            "success": False,
            "status_code": 400,
            "message": "Admin account cannot be blocked",
        }

    if user.is_blocked:
        return {
            "success": False,
            "status_code": 400,
            "message": "User is already blocked",
        }

    user.is_blocked = True

    AdminLogService.log_action(
        action="Blocked User",
        target_type="User",
        target_id=user.id,
        details=f"Blocked user '{user.name}' ({user.email})",
    )

    db.session.commit()

    return {"success": True, "message": "User blocked successfully"}


def unblock_user(user_id):
    user = db.session.get(User, user_id)

    if not user:
        return {"success": False, "status_code": 404, "message": "User not found"}

    if not user.is_blocked:
        return {
            "success": False,
            "status_code": 400,
            "message": "User is already active",
        }

    user.is_blocked = False

    AdminLogService.log_action(
        action="Unblocked User",
        target_type="User",
        target_id=user.id,
        details=f"Unblocked user '{user.name}' ({user.email})",
    )

    db.session.commit()

    return {"success": True, "message": "User unblocked successfully"}
