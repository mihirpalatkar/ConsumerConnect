from app.extensions import db
from app.models.company import Company
from app.services.admin_log_service import AdminLogService


def get_all_companies():
    companies = Company.query.order_by(Company.created_at.desc()).all()

    data = []

    for company in companies:
        data.append(
            {
                "id": company.id,
                "name": company.name,
                "email": company.email,
                "is_blocked": company.is_blocked,
                "created_at": company.created_at,
            }
        )

    return {"success": True, "count": len(data), "companies": data}


def get_company_by_id(company_id):
    company = db.session.get(Company, company_id)

    if not company:
        return {"success": False, "status_code": 404, "message": "Company not found"}

    return {
        "success": True,
        "company": {
            "id": company.id,
            "name": company.name,
            "email": company.email,
            "is_blocked": company.is_blocked,
            "created_at": company.created_at,
        },
    }


def block_company(company_id):
    company = db.session.get(Company, company_id)

    if not company:
        return {"success": False, "status_code": 404, "message": "Company not found"}

    if company.is_blocked:
        return {
            "success": False,
            "status_code": 400,
            "message": "Company is already blocked",
        }

    company.is_blocked = True

    AdminLogService.log_action(
        action="Blocked Company",
        target_type="Company",
        target_id=company.id,
        details=f"Blocked company '{company.name}' ({company.email})",
    )

    db.session.commit()

    return {"success": True, "message": "Company blocked successfully"}


def unblock_company(company_id):
    company = db.session.get(Company, company_id)

    if not company:
        return {"success": False, "status_code": 404, "message": "Company not found"}

    if not company.is_blocked:
        return {
            "success": False,
            "status_code": 400,
            "message": "Company is already active",
        }

    company.is_blocked = False

    AdminLogService.log_action(
        action="Unblocked Company",
        target_type="Company",
        target_id=company.id,
        details=f"Unblocked company '{company.name}' ({company.email})",
    )

    db.session.commit()

    return {"success": True, "message": "Company unblocked successfully"}
