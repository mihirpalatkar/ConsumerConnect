from datetime import datetime

from app.extensions import db


class Feedback(db.Model):
    __tablename__ = "feedback"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    issue_id = db.Column(
        db.Integer,
        db.ForeignKey("issues.id"),
        nullable=False,
        unique=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    rating = db.Column(
        db.Integer,
        nullable=False
    )

    comment = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    is_deleted = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    issue = db.relationship(
        "Issue",
        backref="feedback"
    )

    user = db.relationship(
        "User",
        backref="feedbacks"
    )