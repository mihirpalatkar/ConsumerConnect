from datetime import datetime

from app.extensions import db


class CompanyStatusRequest(db.Model):

    __tablename__ = "company_status_requests"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    issue_id = db.Column(
        db.Integer,
        db.ForeignKey("issues.id"),
        nullable=False,
        index=True,
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    requested_status = db.Column(
        db.String(50),
        nullable=False,
    )

    resolution_note = db.Column(
        db.Text,
        nullable=True,
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="Pending",
        index=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    reviewed_at = db.Column(
        db.DateTime,
        nullable=True,
    )

    reviewed_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
    )

    review_note = db.Column(
        db.Text,
        nullable=True,
    )