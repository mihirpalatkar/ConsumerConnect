from datetime import datetime

from app.extensions import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    issue_id = db.Column(
        db.Integer,
        db.ForeignKey("issues.id"),
        nullable=False
    )

    type = db.Column(
        db.String(50),
        nullable=False
    )

    message = db.Column(
        db.String(255),
        nullable=False
    )

    is_read = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    user = db.relationship(
        "User",
        backref="notifications"
    )

    issue = db.relationship(
        "Issue",
        backref="notifications"
    )