from datetime import datetime

from app.extensions import db


class AdminLog(db.Model):
    __tablename__ = "admin_logs"

    id = db.Column(db.Integer, primary_key=True)

    action = db.Column(db.String(100), nullable=False)

    target_type = db.Column(db.String(50), nullable=False)

    target_id = db.Column(db.Integer, nullable=False)

    details = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
