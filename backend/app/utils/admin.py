from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):

        claims = get_jwt()

        if claims.get("role") != "Admin":
            return jsonify({
                "success": False,
                "message": "Admin access required"
            }), 403

        return fn(*args, **kwargs)

    return wrapper