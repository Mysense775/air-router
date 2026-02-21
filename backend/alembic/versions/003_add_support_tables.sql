-- Миграция: Добавление таблиц для поддержки Telegram бота
-- Дата: 2026-02-21

-- Таблица заявок в поддержку
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    telegram_id BIGINT NOT NULL,
    telegram_username VARCHAR(100),
    
    category VARCHAR(50) DEFAULT 'other',
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    
    title VARCHAR(255),
    description TEXT,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    related_request_id UUID REFERENCES request_logs(id) ON DELETE SET NULL,
    
    screenshots JSONB DEFAULT '[]'::jsonb,
    assigned_to VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_telegram_id ON support_tickets(telegram_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Таблица комментариев к заявкам
CREATE TABLE IF NOT EXISTS support_ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_type VARCHAR(20) DEFAULT 'client',
    author_id VARCHAR(100),
    author_username VARCHAR(100),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_comments_ticket_id ON support_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_comments_created_at ON support_ticket_comments(created_at);

-- Таблица операторов поддержки
CREATE TABLE IF NOT EXISTS support_operators (
    telegram_id BIGINT PRIMARY KEY,
    username VARCHAR(100),
    name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    notify_on_priority TEXT[] DEFAULT ARRAY['high', 'critical'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица привязки Telegram к пользователям
CREATE TABLE IF NOT EXISTS telegram_bindings (
    telegram_id BIGINT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100),
    api_key_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_telegram_bindings_user_id ON telegram_bindings(user_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Вставка тестового оператора (замените на реальный Telegram ID)
-- INSERT INTO support_operators (telegram_id, username, name) 
-- VALUES (123456789, 'operator_username', 'Support Operator');
