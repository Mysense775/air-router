from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, 
    BigInteger, Boolean, JSON, ARRAY, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid
import enum

Base = declarative_base()

class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketCategory(str, enum.Enum):
    BILLING = "billing"
    TECHNICAL = "technical"
    API = "api"
    OTHER = "other"

class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    telegram_id = Column(BigInteger, nullable=False)
    telegram_username = Column(String(100))
    
    category = Column(SQLEnum(TicketCategory), default=TicketCategory.OTHER)
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN)
    
    title = Column(String(255))
    description = Column(Text)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=True)
    related_request_id = Column(UUID(as_uuid=True), ForeignKey("request_logs.id"), nullable=True)
    
    screenshots = Column(JSON, default=list)
    assigned_to = Column(String(100))  # Telegram username оператора
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    # Relationships
    comments = relationship("SupportTicketComment", back_populates="ticket", cascade="all, delete-orphan")

class SupportTicketComment(Base):
    __tablename__ = "support_ticket_comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id"), nullable=False)
    author_type = Column(String(20), default="client")  # client, support, system
    author_id = Column(String(100))  # Telegram ID или user_id
    author_username = Column(String(100))
    message = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    ticket = relationship("SupportTicket", back_populates="comments")

class SupportOperator(Base):
    __tablename__ = "support_operators"
    
    telegram_id = Column(BigInteger, primary_key=True)
    username = Column(String(100))
    name = Column(String(100))
    is_active = Column(Boolean, default=True)
    notify_on_priority = Column(ARRAY(String), default=["high", "critical"])
    created_at = Column(DateTime, default=datetime.utcnow)

class TelegramBinding(Base):
    __tablename__ = "telegram_bindings"
    
    telegram_id = Column(BigInteger, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    username = Column(String(100))
    api_key_hash = Column(String(64))  # Для быстрой проверки
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime)
