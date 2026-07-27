from app.extensions import db
from app.models.company import Company



def register_company(name, email, password):

    if Company.query.filter_by(email=email).first():
        return None

    company = Company(
        name=name,
        email=email
    )

    company.set_password(password)

    db.session.add(company)
    db.session.commit()

    return company


def authenticate_company(email, password):

    company = Company.query.filter_by(
        email=email
    ).first()

    if not company:
        return None

    if not company.check_password(password):
        return None

    return company

from app.models.issue import Issue

def get_company_dashboard(company):

    total = Issue.query.filter_by(
        company=company.name
    ).count()

    open_count = Issue.query.filter_by(
        company=company.name,
        status="Open"
    ).count()

    in_progress = Issue.query.filter_by(
        company=company.name,
        status="In Progress"
    ).count()

    resolved = Issue.query.filter_by(
        company=company.name,
        status="Resolved"
    ).count()

    return {
        "company": {
            "id": company.id,
            "name": company.name,
            "email": company.email
        },
        "statistics": {
            "total_complaints": total,
            "open": open_count,
            "in_progress": in_progress,
            "resolved": resolved
        }
    }
