"""Repair comments company author fields

Revision ID: 0e8369b77503
Revises: b232caa1e051
Create Date: 2026-09-20 14:56:01.060649

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0e8369b77503"
down_revision = "b232caa1e051"
branch_labels = None
depends_on = None


def upgrade():
    # Allow comments to be authored by either a consumer or a company.
    op.alter_column(
        "comments",
        "user_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # Add the company author reference.
    op.add_column(
        "comments",
        sa.Column(
            "company_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_comments_company_id_companies",
        "comments",
        "companies",
        ["company_id"],
        ["id"],
    )


def downgrade():
    # Do not silently discard company-authored comments.
    bind = op.get_bind()

    null_company_user_count = bind.execute(
        sa.text(
            """
            SELECT COUNT(*)
            FROM comments
            WHERE company_id IS NOT NULL
              AND user_id IS NULL
            """
        )
    ).scalar()

    if null_company_user_count:
        raise RuntimeError(
            "Cannot downgrade: comments contain company-authored "
            "rows with no user_id."
        )

    op.drop_constraint(
        "fk_comments_company_id_companies",
        "comments",
        type_="foreignkey",
    )

    op.drop_column(
        "comments",
        "company_id",
    )

    op.alter_column(
        "comments",
        "user_id",
        existing_type=sa.Integer(),
        nullable=False,
    )