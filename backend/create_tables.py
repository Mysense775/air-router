#!/usr/bin/env python3
"""Create database tables manually"""
import asyncio
import asyncpg

async def create_tables():
    conn = await asyncpg.connect('postgresql://postgres:postgres@db:5432/ai_router')
    
    # Create users table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            role VARCHAR(20) NOT NULL DEFAULT 'client',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            email_verified BOOLEAN DEFAULT false,
            email_verified_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create indexes for users
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)")
    
    # Create api_keys table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            key_hash VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(100) DEFAULT 'Default',
            is_active BOOLEAN DEFAULT true,
            last_used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMPTZ
        )
    """)
    
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)")
    
    # Create balances table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS balances (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            balance_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.00,
            lifetime_spent NUMERIC(12, 6) NOT NULL DEFAULT 0.00,
            lifetime_earned NUMERIC(12, 6) NOT NULL DEFAULT 0.00,
            last_deposit_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_balances_balance ON balances(balance_usd)")
    
    # Create master_accounts table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS master_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL,
            api_key_encrypted TEXT NOT NULL,
            balance_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.00,
            discount_percent INTEGER NOT NULL DEFAULT 70,
            monthly_limit_usd NUMERIC(12, 2),
            monthly_used_usd NUMERIC(12, 2) DEFAULT 0.00,
            current_month VARCHAR(7) DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
            is_active BOOLEAN DEFAULT true,
            priority INTEGER DEFAULT 0,
            last_check_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_master_accounts_active ON master_accounts(is_active)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_master_accounts_priority ON master_accounts(priority)")
    
    # Create request_logs table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS request_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            api_key_id UUID REFERENCES api_keys(id),
            master_account_id UUID REFERENCES master_accounts(id),
            model VARCHAR(100) NOT NULL,
            endpoint VARCHAR(100) NOT NULL,
            method VARCHAR(10) DEFAULT 'POST',
            prompt_tokens INTEGER NOT NULL DEFAULT 0,
            completion_tokens INTEGER NOT NULL DEFAULT 0,
            total_tokens INTEGER NOT NULL DEFAULT 0,
            cost_to_us_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.00,
            cost_to_client_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.00,
            profit_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.00,
            duration_ms INTEGER,
            status_code INTEGER,
            status VARCHAR(20) NOT NULL DEFAULT 'success',
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_request_logs_model ON request_logs(model)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_request_logs_user_created ON request_logs(user_id, created_at)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_request_logs_model_created ON request_logs(model, created_at)")
    
    # Create deposits table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS deposits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            amount_usd NUMERIC(12, 6) NOT NULL,
            amount_original NUMERIC(12, 6),
            currency VARCHAR(10) DEFAULT 'USD',
            payment_method VARCHAR(50) NOT NULL,
            payment_provider VARCHAR(50),
            provider_transaction_id VARCHAR(255),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            metadata JSONB DEFAULT '{}',
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at)")
    
    # Create model_pricing table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS model_pricing (
            id VARCHAR(100) PRIMARY KEY,
            provider VARCHAR(50) NOT NULL,
            display_name VARCHAR(255),
            prompt_price NUMERIC(12, 9) NOT NULL,
            completion_price NUMERIC(12, 9) NOT NULL,
            context_length INTEGER,
            is_active BOOLEAN DEFAULT true,
            fetched_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_model_pricing_provider ON model_pricing(provider)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_model_pricing_active ON model_pricing(is_active)")
    
    # Create alembic_version table to mark migration as applied
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS alembic_version (
            version_num VARCHAR(32) NOT NULL PRIMARY KEY
        )
    """)
    
    await conn.execute("""
        INSERT INTO alembic_version (version_num) 
        VALUES ('001_initial')
        ON CONFLICT (version_num) DO NOTHING
    """)
    
    await conn.close()
    print("Tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
