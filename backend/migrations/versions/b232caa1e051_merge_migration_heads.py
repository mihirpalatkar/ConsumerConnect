"""Merge migration heads

Revision ID: b232caa1e051
Revises: 9fe34bafef57, afdc153e8a39
Create Date: 2026-09-20 14:45:47.212347

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b232caa1e051'
down_revision = ('9fe34bafef57', 'afdc153e8a39')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
