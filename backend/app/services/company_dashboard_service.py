from app.models.issue import Issue
from sqlalchemy import func
from sqlalchemy import func
from sqlalchemy import extract

from app.extensions import db
from app.models.feedback import Feedback
from app.models.issue import Issue


def get_company_issues(company_name):

    return (
        Issue.query.filter_by(company=company_name)
        .order_by(Issue.created_at.desc())
        .all()
    )


def get_company_analytics(company_name):

    total = Issue.query.filter_by(company=company_name).count()

    open_count = Issue.query.filter_by(company=company_name, status="Open").count()

    in_progress = Issue.query.filter_by(
        company=company_name, status="In Progress"
    ).count()

    resolved = Issue.query.filter_by(company=company_name, status="Resolved").count()

    resolution_rate = (resolved / total) * 100 if total > 0 else 0

    average_rating = (
        db.session.query(func.avg(Feedback.rating))
        .join(Issue, Feedback.issue_id == Issue.id)
        .filter(Issue.company == company_name)
        .scalar()
    )

    total_reviews = (
        db.session.query(func.count(Feedback.id))
        .join(Issue, Feedback.issue_id == Issue.id)
        .filter(Issue.company == company_name)
        .scalar()
    )

    return {
        "company": company_name,
        "total_complaints": total,
        "open_complaints": open_count,
        "in_progress_complaints": in_progress,
        "resolved_complaints": resolved,
        "resolution_rate": round(resolution_rate, 2),
        "average_rating": round(average_rating or 0, 2),
        "total_reviews": total_reviews,
    }


def get_rating_distribution(company_name):

    ratings = (
        db.session.query(Feedback.rating, func.count(Feedback.id))
        .join(Issue, Feedback.issue_id == Issue.id)
        .filter(Issue.company == company_name)
        .group_by(Feedback.rating)
        .all()
    )

    distribution = {"5_star": 0, "4_star": 0, "3_star": 0, "2_star": 0, "1_star": 0}

    total_reviews = 0
    total_rating = 0

    for rating, count in ratings:
        distribution[f"{rating}_star"] = count
        total_reviews += count
        total_rating += rating * count

    average = total_rating / total_reviews if total_reviews else 0

    return {
        "average_rating": round(average, 2),
        "total_reviews": total_reviews,
        "ratings": distribution,
    }


def get_company_category_distribution(company_name):

    results = (
        db.session.query(Issue.category, func.count(Issue.id))
        .filter(Issue.company == company_name)
        .group_by(Issue.category)
        .order_by(func.count(Issue.id).desc())
        .all()
    )

    total = sum(count for _, count in results)

    return [
        {
            "category": category,
            "count": count,
            "percentage": round((count / total) * 100, 2) if total else 0,
        }
        for category, count in results
    ]


def get_company_monthly_trends(company_name):

    results = (
        db.session.query(
            extract("year", Issue.created_at).label("year"),
            extract("month", Issue.created_at).label("month"),
            func.count(Issue.id),
        )
        .filter(Issue.company == company_name)
        .group_by(extract("year", Issue.created_at), extract("month", Issue.created_at))
        .order_by(extract("year", Issue.created_at), extract("month", Issue.created_at))
        .all()
    )

    return [
        {"year": int(year), "month": int(month), "count": count}
        for year, month, count in results
    ]
