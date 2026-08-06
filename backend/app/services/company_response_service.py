from app.extensions import db
from app.models.company_response import CompanyResponse
from app.models.issue import Issue
from app.services.history_service import create_history


def add_response(company_name, issue_id, response):

    issue = db.session.get(Issue, issue_id)

    if not issue:
        return {"success": False, "message": "Issue not found", "status_code": 404}

    if issue.company != company_name:
        return {
            "success": False,
            "message": "You cannot respond to another company's issue",
            "status_code": 403,
        }

    company_response = CompanyResponse(
        issue_id=issue_id, company_name=company_name, response=response
    )

    db.session.add(company_response)
    db.session.commit()

    create_history(
        issue_id=issue.id,
        action="company_response",
        performed_by=company_name,
        message=f"{company_name} posted an official response.",
    )

    return {"success": True, "response": company_response, "status_code": 201}


def get_responses(issue_id):

    return (
        CompanyResponse.query.filter_by(issue_id=issue_id)
        .order_by(CompanyResponse.created_at.desc())
        .all()
    )
