from datetime import datetime

from app.extensions import db
from app.models.company_response import CompanyResponse
from app.models.company import Company
from app.models.issue import Issue


# ============================================================
# SERIALIZE COMPANY RESPONSE
# ============================================================

def serialize_company_response(response):
    return {
        "id": response.id,
        "issue_id": response.issue_id,
        "company": response.company_name,
        "response": response.response,
        "created_at": (
            response.created_at.isoformat()
            if response.created_at
            else None
        ),
    }


# ============================================================
# CREATE COMPANY RESPONSE
# ============================================================

def create_company_response(
    company,
    issue_id,
    response,
):
    # --------------------------------------------------------
    # VALIDATE COMPANY
    # --------------------------------------------------------

    if company is None:
        return {
            "success": False,
            "status_code": 401,
            "message": "Company not found.",
        }

    # --------------------------------------------------------
    # VALIDATE RESPONSE TEXT
    # --------------------------------------------------------

    if not response or not str(response).strip():
        return {
            "success": False,
            "status_code": 400,
            "message": "Response is required.",
        }

    response = str(response).strip()

    # --------------------------------------------------------
    # VALIDATE ISSUE ID
    # --------------------------------------------------------

    try:
        issue_id = int(issue_id)
    except (TypeError, ValueError):
        return {
            "success": False,
            "status_code": 400,
            "message": "Invalid issue_id.",
        }

    # --------------------------------------------------------
    # FIND ISSUE
    # --------------------------------------------------------

    issue = (
        Issue.query
        .filter_by(
            id=issue_id,
            is_deleted=False,
        )
        .first()
    )

    if issue is None:
        return {
            "success": False,
            "status_code": 404,
            "message": "Issue not found.",
        }

    # --------------------------------------------------------
    # VERIFY COMPANY OWNS THE ISSUE
    # --------------------------------------------------------

    issue_company_id = getattr(
        issue,
        "company_id",
        None,
    )

    if issue_company_id is not None:
        if issue_company_id != company.id:
            return {
                "success": False,
                "status_code": 403,
                "message": (
                    "You are not authorized to respond "
                    "to this complaint."
                ),
            }

    else:
        issue_company_name = (
            str(
                getattr(
                    issue,
                    "company",
                    "",
                ) or ""
            )
            .strip()
            .lower()
        )

        current_company_name = (
            str(
                getattr(
                    company,
                    "name",
                    "",
                ) or ""
            )
            .strip()
            .lower()
        )

        if issue_company_name != current_company_name:
            return {
                "success": False,
                "status_code": 403,
                "message": (
                    "You are not authorized to respond "
                    "to this complaint."
                ),
            }

    # --------------------------------------------------------
    # CREATE RESPONSE
    # --------------------------------------------------------

    company_response = CompanyResponse(
        issue_id=issue.id,
        company_name=company.name,
        response=response,
        created_at=datetime.utcnow(),
    )

    try:
        db.session.add(company_response)
        db.session.commit()

    except Exception as error:
        db.session.rollback()

        print(
            "Create company response error:",
            error,
        )

        return {
            "success": False,
            "status_code": 500,
            "message": (
                "Unable to create company response."
            ),
        }

    # --------------------------------------------------------
    # SUCCESS
    # --------------------------------------------------------

    return {
        "success": True,
        "status_code": 201,
        "message": (
            "Company response created successfully."
        ),
        "response": serialize_company_response(
            company_response
        ),
    }


# ============================================================
# GET COMPANY RESPONSES
# ============================================================

def get_company_responses(issue_id):

    try:
        issue_id = int(issue_id)
    except (TypeError, ValueError):
        return []

    responses = (
        CompanyResponse.query
        .filter_by(
            issue_id=issue_id,
        )
        .order_by(
            CompanyResponse.created_at.asc()
        )
        .all()
    )

    return [
        serialize_company_response(
            response
        )
        for response in responses
    ]


# ============================================================
# COMPATIBILITY ALIASES
# ============================================================

def create_response(
    company,
    issue_id,
    response,
):
    return create_company_response(
        company=company,
        issue_id=issue_id,
        response=response,
    )


def get_responses(issue_id):
    return get_company_responses(
        issue_id
    )