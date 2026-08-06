from datetime import datetime

from sqlalchemy import func, extract

from app.extensions import db
from app.models.user import User
from app.models.company import Company
from app.models.issue import Issue


class AdminDashboardService:

    @staticmethod
    def get_overview():
        return {
            "total_users": User.query.count(),
            "blocked_users": User.query.filter_by(
                is_blocked=True
            ).count(),

            "total_companies": Company.query.count(),
            "blocked_companies": Company.query.filter_by(
                is_blocked=True
            ).count(),

            "total_issues": Issue.query.count(),
            "deleted_issues": Issue.query.filter_by(
                is_deleted=True
            ).count(),

            "open_issues": Issue.query.filter_by(
                status="Open",
                is_deleted=False
            ).count(),

            "in_progress_issues": Issue.query.filter_by(
                status="In Progress",
                is_deleted=False
            ).count(),

            "resolved_issues": Issue.query.filter_by(
                status="Resolved",
                is_deleted=False
            ).count()
        }

    @staticmethod
    def get_user_statistics():
        current_month = datetime.utcnow().month
        current_year = datetime.utcnow().year

        return {
            "total_users": User.query.count(),

            "active_users": User.query.filter_by(
                is_blocked=False
            ).count(),

            "blocked_users": User.query.filter_by(
                is_blocked=True
            ).count(),

            "new_users_this_month": User.query.filter(
                User.created_at >= datetime(current_year, current_month, 1)
            ).count()
        }

    @staticmethod
    def get_company_statistics():
        current_month = datetime.utcnow().month
        current_year = datetime.utcnow().year

        return {
            "total_companies": Company.query.count(),

            "active_companies": Company.query.filter_by(
                is_blocked=False
            ).count(),

            "blocked_companies": Company.query.filter_by(
                is_blocked=True
            ).count(),

            "new_companies_this_month": Company.query.filter(
                Company.created_at >= datetime(current_year, current_month, 1)
            ).count()
        }

    @staticmethod
    def get_category_distribution():
        categories = (
            db.session.query(
                Issue.category,
                func.count(Issue.id)
            )
            .filter(Issue.is_deleted == False)
            .group_by(Issue.category)
            .all()
        )

        return [
            {
                "category": category,
                "count": count
            }
            for category, count in categories
        ]

    @staticmethod
    def get_severity_distribution():
        severities = (
            db.session.query(
                Issue.severity,
                func.count(Issue.id)
            )
            .filter(Issue.is_deleted == False)
            .group_by(Issue.severity)
            .all()
        )

        return [
            {
                "severity": severity,
                "count": count
            }
            for severity, count in severities
        ]

    @staticmethod
    def get_monthly_trends():
        trends = (
            db.session.query(
                extract("month", Issue.created_at).label("month"),
                func.count(Issue.id).label("count")
            )
            .filter(Issue.is_deleted == False)
            .group_by(extract("month", Issue.created_at))
            .order_by(extract("month", Issue.created_at))
            .all()
        )

        return [
            {
                "month": int(month),
                "count": count
            }
            for month, count in trends
        ]

    @staticmethod
    def get_top_companies():
        companies = (
            db.session.query(
                Issue.company,
                func.count(Issue.id)
            )
            .filter(Issue.is_deleted == False)
            .group_by(Issue.company)
            .order_by(func.count(Issue.id).desc())
            .limit(5)
            .all()
        )


        return [
            {
                "company": company,
                "complaints": count
            }
            for company, count in companies
        ]