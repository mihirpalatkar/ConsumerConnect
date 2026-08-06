"""Fix moderation columns

Revision ID: a9086fd4b310
Revises: 5f6dfebeaf5b
Create Date: 2026-07-29 14:03:34.338925
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a9086fd4b310"
down_revision = "5f6dfebeaf5b"
branch_labels = None
depends_on = None


def upgrade():
    # Comments
    with op.batch_alter_table("comments", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            )
        )
        batch_op.drop_column("is_blocked")

    # Feedback
    with op.batch_alter_table("feedback", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            )
        )
        batch_op.drop_column("is_blocked")

    # Issues
    with op.batch_alter_table("issues", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            )
        )
        batch_op.drop_column("is_blocked")


def downgrade():
    # Issues
    with op.batch_alter_table("issues", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_blocked",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            )
        )
        batch_op.drop_column("is_deleted")

    # Feedback
    with op.batch_alter_table("feedback", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_blocked",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            )
        )
        batch_op.drop_column("is_deleted")

    # Comments
    with op.batch_alter_table("comments", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_blocked",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            )
        )
        batch_op.drop_column("is_deleted")
