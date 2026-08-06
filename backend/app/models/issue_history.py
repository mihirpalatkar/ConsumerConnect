from datetime import datetime

from app.extensions import db


class IssueHistory(db.Model):
    __tablename__ = "issue_history"

    id = db.Column(db.Integer, primary_key=True)

    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), nullable=False)

    action = db.Column(db.String(50), nullable=False)

    performed_by = db.Column(db.String(100), nullable=False)

    old_value = db.Column(db.String(100))

    new_value = db.Column(db.String(100))

    message = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    issue = db.relationship("Issue", backref="history")
