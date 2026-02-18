import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Numeric, ForeignKey, Text, Integer, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    role = Column(String(20), nullable=False, default="client")
    status = Column(String(20), nullable=False, default="active")
    email_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime(timezone=True))
    force_password_change = Column(Boolean, default=False)  # True for admin-created users
    
    # Referral system fields
    referrer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    referral_code = Column(String(20), unique=True, nullable=True)
    referral_bonus_claimed = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    balance = relationship("Balance", back_populates="user", uselist=False)
    request_logs = relationship("RequestLog", back_populates="user")
    deposits = relationship("Deposit", back_populates="user")
    investor_accounts = relationship("InvestorAccount", back_populates="user", cascade="all, delete-orphan")
    
    # Referral relationships
    referrer = relationship("User", remote_side=[id], backref="referrals")


class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), default="Default")
    allowed_model = Column(String(100), nullable=True)  # Если NULL - любая модель
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    request_logs = relationship("RequestLog", back_populates="api_key")


class Balance(Base):
    __tablename__ = "balances"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    balance_usd = Column(Numeric(12, 6), nullable=False, default=0.00)
    lifetime_spent = Column(Numeric(12, 6), nullable=False, default=0.00)
    lifetime_earned = Column(Numeric(12, 6), nullable=False, default=0.00)
    lifetime_savings = Column(Numeric(12, 6), nullable=False, default=0.00)  # Экономия vs OpenRouter
    last_deposit_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="balance")


class MasterAccount(Base):
    __tablename__ = "master_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    api_key_encrypted = Column(Text, nullable=False)
    balance_usd = Column(Numeric(12, 6), nullable=False, default=0.00)
    
    # Тип аккаунта: discounted (со скидкой) или regular (обычный)
    account_type = Column(String(20), nullable=False, default="discounted")
    # discounted: покупаем со скидкой 70%, продаем со скидкой 20%
    # regular: покупаем без скидки, продаем с наценкой 5%
    
    # Наценка для клиента в процентах
    # Для discounted: -20 (продаем дешевле номинала)
    # Для regular: +5 (продаем дороже номинала)
    markup_percent = Column(Integer, nullable=False, default=-20)
    
    # База стоимости: сколько мы реально платим OpenRouter
    # discounted: 0.3 (30% от номинала)
    # regular: 1.0 (100% от номинала)
    cost_basis = Column(Numeric(4, 2), nullable=False, default=0.30)
    
    # Приоритет использования (0 = высший, 1 = резерв)
    priority = Column(Integer, default=0)
    
    # Вес для round-robin внутри одного типа
    usage_weight = Column(Integer, default=0)
    
    # Legacy поле (deprecated, используем markup_percent)
    discount_percent = Column(Integer, nullable=False, default=70)
    
    monthly_limit_usd = Column(Numeric(12, 2))
    monthly_used_usd = Column(Numeric(12, 2), default=0.00)
    current_month = Column(String(7), default=lambda: datetime.utcnow().strftime("%Y-%m"))
    is_active = Column(Boolean, default=True)
    last_check_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    request_logs = relationship("RequestLog", back_populates="master_account")


class RequestLog(Base):
    __tablename__ = "request_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"))
    master_account_id = Column(UUID(as_uuid=True), ForeignKey("master_accounts.id"))
    
    model = Column(String(100), nullable=False, index=True)
    endpoint = Column(String(100), nullable=False)
    method = Column(String(10), default="POST")
    
    prompt_tokens = Column(Integer, nullable=False, default=0)
    completion_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    
    cost_to_us_usd = Column(Numeric(12, 6), nullable=False, default=0.00)
    cost_to_client_usd = Column(Numeric(12, 6), nullable=False, default=0.00)
    openrouter_cost_usd = Column(Numeric(12, 6), nullable=False, default=0.00)  # Цена напрямую у OpenRouter
    profit_usd = Column(Numeric(12, 6), nullable=False, default=0.00)
    
    # Тип использованного мастер-аккаунта (для аналитики)
    account_type_used = Column(String(20))  # discounted или regular
    
    duration_ms = Column(Integer)
    status_code = Column(Integer)
    status = Column(String(20), nullable=False, default="success", index=True)
    error_message = Column(Text)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="request_logs")
    api_key = relationship("ApiKey", back_populates="request_logs")
    master_account = relationship("MasterAccount", back_populates="request_logs")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_request_logs_user_created', 'user_id', 'created_at'),
        Index('idx_request_logs_model_created', 'model', 'created_at'),
    )


class Deposit(Base):
    __tablename__ = "deposits"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount_usd = Column(Numeric(12, 6), nullable=False)
    amount_original = Column(Numeric(12, 6))
    currency = Column(String(10), default="USD")
    payment_method = Column(String(50), nullable=False)
    payment_provider = Column(String(50))
    provider_transaction_id = Column(String(255))
    status = Column(String(20), nullable=False, default="pending", index=True)
    metadata_ = Column("metadata", JSON, default={})
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="deposits")


class ModelPricing(Base):
    __tablename__ = "model_pricing"
    
    id = Column(String(100), primary_key=True)
    provider = Column(String(50), nullable=False, index=True)
    display_name = Column(String(255))
    prompt_price = Column(Numeric(12, 9), nullable=False)
    completion_price = Column(Numeric(12, 9), nullable=False)
    context_length = Column(Integer)
    is_active = Column(Boolean, default=True, index=True)
    fetched_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class InvestorAccount(Base):
    """Инвесторские аккаунты (ключи от инвесторов)"""
    __tablename__ = "investor_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # Название ключа (например "Investor #1")
    api_key_encrypted = Column(Text, nullable=False)  # Зашифрованный ключ OpenRouter
    openrouter_account_id = Column(String(255))  # ID аккаунта в OpenRouter
    
    # Балансы
    initial_balance = Column(Numeric(12, 2), nullable=False)  # Начальный баланс ($100 минимум)
    current_balance = Column(Numeric(12, 2), nullable=False, default=0.00)  # Текущий (синхронизация)
    min_threshold = Column(Numeric(12, 2), default=50.00)  # Минимум для переключения (default $50)
    
    # Комиссия
    commission_rate = Column(Numeric(5, 2), default=1.00)  # Процент инвестору (default 1%)
    
    # Статистика
    total_earned = Column(Numeric(12, 2), default=0.00)  # Сколько заработал инвестор
    total_spent = Column(Numeric(12, 2), default=0.00)  # Сколько потрачено с ключа
    
    # Статус
    status = Column(String(20), default="active")  # active, paused, revoked
    
    # Даты
    last_sync_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    revoked_at = Column(DateTime(timezone=True))  # Когда инвестор забрал ключ
    
    # Relationships
    user = relationship("User", back_populates="investor_accounts")
    payouts = relationship("InvestorPayout", back_populates="investor_account", cascade="all, delete-orphan")
    request_logs = relationship("InvestorRequestLog", back_populates="investor_account")


class InvestorPayout(Base):
    """Выплаты инвесторам"""
    __tablename__ = "investor_payouts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investor_account_id = Column(UUID(as_uuid=True), ForeignKey("investor_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    amount_spent = Column(Numeric(12, 2), nullable=False, default=0.00)  # Оборот за период
    commission_amount = Column(Numeric(12, 2), nullable=False, default=0.00)  # Сумма комиссии
    
    # Статус выплаты
    status = Column(String(20), default="pending")  # pending, paid, cancelled
    paid_at = Column(DateTime(timezone=True))
    transaction_id = Column(String(255))  # ID транзакции выплаты
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    investor_account = relationship("InvestorAccount", back_populates="payouts")


class InvestorRequestLog(Base):
    """Лог запросов через инвесторские ключи"""
    __tablename__ = "investor_request_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investor_account_id = Column(UUID(as_uuid=True), ForeignKey("investor_accounts.id"), nullable=False, index=True)
    
    model = Column(String(100), nullable=False, index=True)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    cost_usd = Column(Numeric(12, 6), default=0.00)  # Сколько списалось с ключа
    commission_usd = Column(Numeric(12, 6), default=0.00)  # Комиссия инвестору (1%)
    
    status = Column(String(20), default="success", index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    
    # Relationships
    investor_account = relationship("InvestorAccount", back_populates="request_logs")

    __table_args__ = (
        Index('idx_investor_logs_account_created', 'investor_account_id', 'created_at'),
        Index('idx_investor_logs_model_created', 'model', 'created_at'),
    )


class ReferralClick(Base):
    """Tracks clicks on referral links"""
    __tablename__ = "referral_clicks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referral_code = Column(String(20), nullable=False, index=True)
    clicked_by_ip = Column(String(45))
    clicked_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    converted = Column(Boolean, default=False)
    converted_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class InvestorReferralEarning(Base):
    """Tracks earnings from referrals using investor's key"""
    __tablename__ = "investor_referral_earnings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    referral_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    request_log_id = Column(UUID(as_uuid=True), ForeignKey("request_logs.id", ondelete="SET NULL"), nullable=True)
    amount_usd = Column(Numeric(12, 6), nullable=False, default=0)
    turnover_usd = Column(Numeric(12, 6), nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    status = Column(String(20), default="pending")  # pending, paid
    paid_at = Column(DateTime(timezone=True))

    # Relationships
    investor = relationship("User", foreign_keys=[investor_id], backref="referral_earnings")
    referral = relationship("User", foreign_keys=[referral_id])
