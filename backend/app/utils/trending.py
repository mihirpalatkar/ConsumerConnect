from datetime import datetime


def calculate_trending_score(issue):
    """
    Calculate the current trending score.

    Formula:

        Supports * 5
        + Comments * 3
        - Age in days * 0.5

    The score is never negative.
    """

    supports = getattr(
        issue,
        "supports",
        [],
    ) or []

    comments = getattr(
        issue,
        "comments",
        [],
    ) or []

    support_count = len(
        supports
    )

    comment_count = sum(
        1
        for comment in comments
        if not getattr(
            comment,
            "is_deleted",
            False,
        )
    )

    created_at = getattr(
        issue,
        "created_at",
        None,
    )

    if created_at is None:
        age_days = 0
    else:
        age_seconds = max(
            (
                datetime.utcnow()
                - created_at
            ).total_seconds(),
            0,
        )

        age_days = (
            age_seconds / 86400
        )

    score = (
        support_count * 5
        + comment_count * 3
        - age_days * 0.5
    )

    return round(
        max(score, 0),
        2,
    )