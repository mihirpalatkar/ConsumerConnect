from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models.user import User
from app.utils.security import hash_password, verify_password


def register_user(name, email, password):
    """
    Register a new user.
    """

    # Check if email already exists
    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        return {
            "success": False,
            "message": "Email already registered"
        }

    # Hash the password
    hashed_password = hash_password(password)

    # Create new user
    user = User(
        name=name,
        email=email,
        password_hash=hashed_password
    )

    # Save user to database
    db.session.add(user)
    db.session.commit()

    return {
        "success": True,
        "message": "User registered successfully"
    }


def login_user(email, password):
    """
    Authenticate a user and return a JWT token.
    """

    # Find user by email
    user = User.query.filter_by(email=email).first()
    if not user:
        return {
            "success": False,
            "message": "Invalid email or password"
        }

    # Check if user exists
    if not user:
        return {
            "success": False,
            "message": "Invalid email or password"
        }
    if user.is_blocked:
        return {
            "success": False,
            "status_code": 403,
            "message": "Your account has been blocked. Please contact the administrator."
        }

    # Verify password
    if not verify_password(user.password_hash, password):
        return {
            "success": False,
            "message": "Invalid email or password"
        }

    # Generate JWT token
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role
        }
    )

    return {
        "success": True,
        "message": "Login successful",
        "access_token": access_token
    }