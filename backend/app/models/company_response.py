from datetime import datetime
from app.extensions import db


class CompanyResponse(db.Model):
    __tablename__ = "company_responses"

    id = db.Column(db.Integer, primary_key=True)

    issue_id = db.Column(db.Integer, db.ForeignKey("issues.id"), nullable=False)

    company_name = db.Column(db.String(150), nullable=False)

    response = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    issue = db.relationship("Issue", backref="company_responses")
