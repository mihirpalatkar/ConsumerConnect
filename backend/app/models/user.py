from datetime import datetime

from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    role = db.Column(
        db.String(20),
        default="User",
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # One User -> Many Issues
    issues = db.relationship(
        "Issue",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )
    comments = db.relationship(
        "Comment",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )
    supports = db.relationship(
    "Support",
    backref="user",
    lazy=True,
    cascade="all, delete-orphan"
)