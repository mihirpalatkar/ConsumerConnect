from datetime import datetime

from app.extensions import db


class Issue(db.Model):
    __tablename__ = "issues"

    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.String(200), nullable=False)

    description = db.Column(db.Text, nullable=False)

    company = db.Column(db.String(150), nullable=False)

    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)

    category = db.Column(db.String(100), nullable=False)

    status = db.Column(db.String(30), default="Open", nullable=False)

    severity = db.Column(db.String(30), default="Medium", nullable=False)

    estimated_resolution_days = db.Column(db.Integer, nullable=True)

    image_url = db.Column(db.String(255), nullable=True)

    duplicate_score = db.Column(db.Float, default=0.0)

    trending_score = db.Column(db.Float, default=0.0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    resolved_at = db.Column(db.DateTime, nullable=True)

    resolution_note = db.Column(db.Text, nullable=True)

    is_deleted = db.Column(db.Boolean, default=False, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # ---------------- Relationships ----------------

    comments = db.relationship(
        "Comment", backref="issue", lazy=True, cascade="all, delete-orphan"
    )

    supports = db.relationship(
        "Support", backref="issue", lazy=True, cascade="all, delete-orphan"
    )
