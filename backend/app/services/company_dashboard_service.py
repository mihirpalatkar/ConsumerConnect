from app.models.issue import Issue


def get_company_issues(company_name):

    return Issue.query.filter_by(
        company=company_name
    ).order_by(
        Issue.created_at.desc()
    ).all()