from sqlalchemy import func
from sqlalchemy import extract

from app.extensions import db
from app.models.issue import Issue


def get_dashboard_overview():

    total_issues = Issue.query.count()

    open_issues = Issue.query.filter_by(status="Open").count()

    in_progress_issues = Issue.query.filter_by(status="In Progress").count()

    resolved_issues = Issue.query.filter_by(status="Resolved").count()

    closed_issues = Issue.query.filter_by(status="Closed").count()

    high_severity = Issue.query.filter_by(severity="High").count()

    critical_severity = Issue.query.filter_by(severity="Critical").count()

    average_resolution = db.session.query(
        func.avg(Issue.estimated_resolution_days)
    ).scalar()

    top_company = (
        db.session.query(Issue.company, func.count(Issue.id))
        .group_by(Issue.company)
        .order_by(func.count(Issue.id).desc())
        .first()
    )

    top_category = (
        db.session.query(Issue.category, func.count(Issue.id))
        .group_by(Issue.category)
        .order_by(func.count(Issue.id).desc())
        .first()
    )

    return {
        "total_issues": total_issues,
        "open_issues": open_issues,
        "in_progress_issues": in_progress_issues,
        "resolved_issues": resolved_issues,
        "closed_issues": closed_issues,
        "high_severity": high_severity,
        "critical_severity": critical_severity,
        "average_resolution_days": (
            round(average_resolution, 2) if average_resolution else 0
        ),
        "top_company": top_company[0] if top_company else None,
        "top_category": top_category[0] if top_category else None,
    }


def get_category_distribution():

    results = (
        db.session.query(Issue.category, func.count(Issue.id))
        .group_by(Issue.category)
        .order_by(func.count(Issue.id).desc())
        .all()
    )

    return [{"category": category, "count": count} for category, count in results]


def get_severity_distribution():

    results = (
        db.session.query(Issue.severity, func.count(Issue.id))
        .group_by(Issue.severity)
        .order_by(func.count(Issue.id).desc())
        .all()
    )

    return [{"severity": severity, "count": count} for severity, count in results]


def get_status_distribution():

    results = (
        db.session.query(Issue.status, func.count(Issue.id))
        .group_by(Issue.status)
        .order_by(func.count(Issue.id).desc())
        .all()
    )

    return [{"status": status, "count": count} for status, count in results]


def get_monthly_trends():

    results = (
        db.session.query(
            extract("year", Issue.created_at).label("year"),
            extract("month", Issue.created_at).label("month"),
            func.count(Issue.id).label("count"),
        )
        .group_by(extract("year", Issue.created_at), extract("month", Issue.created_at))
        .order_by(extract("year", Issue.created_at), extract("month", Issue.created_at))
        .all()
    )

    return [
        {"year": int(year), "month": int(month), "count": count}
        for year, month, count in results
    ]


def get_top_companies(limit=5):

    company = func.replace(func.replace(func.trim(Issue.company), "\r", ""), "\n", "")

    results = (
        db.session.query(
            company.label("company"), func.count(Issue.id).label("complaints")
        )
        .group_by(company)
        .order_by(func.count(Issue.id).desc())
        .limit(limit)
        .all()
    )

    return [
        {"company": company if company else "Unknown", "complaints": complaints}
        for company, complaints in results
    ]


def get_resolution_statistics():

    total_complaints = db.session.query(func.count(Issue.id)).scalar()

    resolved_complaints = (
        db.session.query(func.count(Issue.id))
        .filter(Issue.status == "Resolved")
        .scalar()
    )

    open_complaints = (
        db.session.query(func.count(Issue.id))
        .filter(Issue.status != "Resolved")
        .scalar()
    )

    average_predicted_resolution_days = db.session.query(
        func.avg(Issue.estimated_resolution_days)
    ).scalar()

    resolution_rate = (
        (resolved_complaints / total_complaints) * 100 if total_complaints > 0 else 0
    )

    return {
        "total_complaints": total_complaints,
        "resolved_complaints": resolved_complaints,
        "open_complaints": open_complaints,
        "resolution_rate": round(resolution_rate, 2),
        "average_predicted_resolution_days": float(
            round(average_predicted_resolution_days or 0, 2)
        ),
    }
