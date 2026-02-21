"""Add account_type_used to request_logs

Revision ID: 002_add_account_type
Revises: 001_initial
Create Date: 2026-02-20 20:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_add_account_type'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add account_type_used column to request_logs
    op.add_column(
        'request_logs',
        sa.Column('account_type_used', sa.String(20), nullable=True)
    )
    
    # Create index for account_type queries
    op.create_index(
        'idx_request_logs_account_type',
        'request_logs',
        ['account_type_used', 'created_at']
    )
    
    # Add openrouter_cost_usd column (was missing in initial migration)
    op.add_column(
        'request_logs',
        sa.Column('openrouter_cost_usd', sa.Numeric(12, 6), nullable=False, server_default='0.00')
    )


def downgrade() -> None:
    # Drop index first
    op.drop_index('idx_request_logs_account_type', table_name='request_logs')
    
    # Drop columns
    op.drop_column('request_logs', 'account_type_used')
    op.drop_column('request_logs', 'openrouter_cost_usd')
