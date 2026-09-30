"""add company author to comments

Revision ID: 9fe34bafef57
Revises: 5f6dfebeaf5b
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "9fe34bafef57"
down_revision = "5f6dfebeaf5b"
branch_labels = None
depends_on = None


def upgrade():

    # Existing consumer comments remain valid.
    op.alter_column(
        "comments",
        "user_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

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