from datetime import datetime

from app.extensions import db


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    content = db.Column(
        db.Text,
        nullable=False,
    )

    issue_id = db.Column(
        db.Integer,
        db.ForeignKey("issues.id"),
        nullable=False,
    )

    # Consumer author.
    # Nullable because a comment may be authored by a company.
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
    )

    # Company author.
    # Nullable because a comment may be authored by a consumer.
    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True,
    )

    parent_id = db.Column(
        db.Integer,
        db.ForeignKey("comments.id"),
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    is_deleted = db.Column(
        db.Boolean,
        default=False,
        nullable=False,
    )

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    # Parent comment -> child replies
    replies = db.relationship(
        "Comment",
        backref=db.backref(
            "parent",
            remote_side=[id],
        ),
        lazy=True,
        cascade="all, delete-orphan",
    )

    # Consumer author
    #
    # Explicitly paired with User.comments.
    user = db.relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="comments",
    )

    # Company author
    company = db.relationship(
        "Company",
        foreign_keys=[company_id],
        backref="comments",
    )