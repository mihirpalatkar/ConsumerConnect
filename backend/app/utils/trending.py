from datetime import datetime


def calculate_trending_score(issue):
    """
    Calculate the trending score for an issue.
    """

    support_count = len(issue.supports)
    comment_count = len(issue.comments)

    age_days = (datetime.utcnow() - issue.created_at).days

    score = support_count * 5 + comment_count * 3 - age_days * 0.5

    return max(score, 0)
