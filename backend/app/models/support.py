from datetime import datetime

from app.extensions import db


class Support(db.Model):
    __tablename__ = "supports"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "issue_id", name="unique_support"),
    )
