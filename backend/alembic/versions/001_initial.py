"""Initial migration

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255)),
        sa.Column('role', sa.String(20), nullable=False, server_default='client'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('email_verified', sa.Boolean, server_default='false'),
        sa.Column('email_verified_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role_status', 'users', ['role', 'status'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])

    # Create api_keys table
    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('key_hash', sa.String(255), unique=True, nullable=False),
        sa.Column('name', sa.String(100), server_default='Default'),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('last_used_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(timezone=True)),
    )
    op.create_index('idx_api_keys_user_id', 'api_keys', ['user_id'])
    op.create_index('idx_api_keys_key_hash', 'api_keys', ['key_hash'])
    op.create_index('idx_api_keys_active', 'api_keys', ['is_active'])

    # Create balances table
    op.create_table(
        'balances',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('balance_usd', sa.Numeric(12, 6), nullable=False, server_default='0.00'),
        sa.Column('lifetime_spent', sa.Numeric(12, 6), nullable=False, server_default='0.00'),
        sa.Column('lifetime_earned', sa.Numeric(12, 6), nullable=False, server_default='0.00'),
        sa.Column('last_deposit_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_balances_balance', 'balances', ['balance_usd'])

    # Create master_accounts table
    op.create_table(
        'master_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('api_key_encrypted', sa.Text, nullable=False),
        sa.Column('balance_usd', sa.Numeric(12, 6), nullable=False, server_default='0.00'),
        sa.Column('discount_percent', sa.Integer, nullable=False, server_default='70'),
        sa.Column('monthly_limit_usd', sa.Numeric(12, 2)),
        sa.Column('monthly_used_usd', sa.Numeric(12, 2), server_default='0.00'),
        sa.Column('current_month', sa.String(7), server_default=sa.text("TO_CHAR(CURRENT_DATE, 'YYYY-MM')")),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('priority', sa.Integer, server_default='0'),
        sa.Column('last_check_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_master_accounts_active', 'master_accounts', ['is_active'])
    op.create_index('idx_master_accounts_priority', 'master_accounts', ['priority'])

    # Create request_logs table
    op.create_table(
        'request_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('api_key_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('api_keys.id')),
        sa.Column('master_account_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('master_accounts.id')),
        sa.Column('model', sa.String(100), nullable=False),
        sa.Column('endpoint', sa.String(100), nullable=False),
        sa.Column('method', sa.String(10), server_default='POST'),
        sa.Column('prompt_tokens', sa.Integer, nullable=False, server_default='0'),
        sa.Column('completion_tokens', sa.Integer, nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer, nullable=False, server_default='0'),
        sa.Column('cost_to_us_usd', sa.Numeric(12, 6), nullable=False, server_default='0.00'),
        sa.Column('cost_to_client_usd', sa.Numeric(12, 6), nullable=False, server_default='0.00'),
        sa.Column('profit_usd', sa.Numeric(12, 6), nullable=False, server_default='0.00'),
        sa.Column('duration_ms', sa.Integer),
        sa.Column('status_code', sa.Integer),
        sa.Column('status', sa.String(20), nullable=False, server_default='success'),
        sa.Column('error_message', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_request_logs_user_id', 'request_logs', ['user_id'])
    op.create_index('idx_request_logs_created_at', 'request_logs', ['created_at'])
    op.create_index('idx_request_logs_model', 'request_logs', ['model'])
    op.create_index('idx_request_logs_status', 'request_logs', ['status'])
    op.create_index('idx_request_logs_user_created', 'request_logs', ['user_id', 'created_at'])
    op.create_index('idx_request_logs_model_created', 'request_logs', ['model', 'created_at'])

    # Create deposits table
    op.create_table(
        'deposits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount_usd', sa.Numeric(12, 6), nullable=False),
        sa.Column('amount_original', sa.Numeric(12, 6)),
        sa.Column('currency', sa.String(10), server_default='USD'),
        sa.Column('payment_method', sa.String(50), nullable=False),
        sa.Column('payment_provider', sa.String(50)),
        sa.Column('provider_transaction_id', sa.String(255)),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('metadata', postgresql.JSON, server_default='{}'),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_deposits_user_id', 'deposits', ['user_id'])
    op.create_index('idx_deposits_status', 'deposits', ['status'])
    op.create_index('idx_deposits_created_at', 'deposits', ['created_at'])

    # Create model_pricing table
    op.create_table(
        'model_pricing',
        sa.Column('id', sa.String(100), primary_key=True),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('display_name', sa.String(255)),
        sa.Column('prompt_price', sa.Numeric(12, 9), nullable=False),
        sa.Column('completion_price', sa.Numeric(12, 9), nullable=False),
        sa.Column('context_length', sa.Integer),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('fetched_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_model_pricing_provider', 'model_pricing', ['provider'])
    op.create_index('idx_model_pricing_active', 'model_pricing', ['is_active'])


def downgrade() -> None:
    op.drop_table('model_pricing')
    op.drop_table('deposits')
    op.drop_table('request_logs')
    op.drop_table('master_accounts')
    op.drop_table('balances')
    op.drop_table('api_keys')
    op.drop_table('users')
