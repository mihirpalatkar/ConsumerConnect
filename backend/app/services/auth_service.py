from app.extensions import db
from app.models.user import User
from app.utils.security import hash_password


def register_user(name, email, password):

    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        return {
            "success": False,
            "message": "Email already registered"
        }

    hashed_password = hash_password(password)

    user = User(
        name=name,
        email=email,
        password_hash=hashed_password
    )

    db.session.add(user)
    db.session.commit()

    return {
        "success": True,
        "message": "User registered successfully"
    }