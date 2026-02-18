"""
Referral System Service
Handles referral codes, tracking, and earnings
"""
import random
import string
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal
import logging

from app.models import User, ReferralClick, InvestorReferralEarning, RequestLog

logger = logging.getLogger(__name__)


class ReferralService:
    """Service for managing referral system"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def generate_code(self, length: int = 8) -> str:
        """Generate unique referral code"""
        prefix = "ARO"
        chars = string.ascii_uppercase + string.digits
        suffix = ''.join(random.choices(chars, k=length - 3))
        return f"{prefix}{suffix}"
    
    async def get_or_create_code(self, user_id: str) -> str:
        """Get existing or create new referral code for user"""
        # Check if user already has a code
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if user and user.referral_code:
            return user.referral_code
        
        # Generate new unique code
        max_attempts = 10
        for attempt in range(max_attempts):
            code = self.generate_code()
            
            # Check uniqueness
            result = await self.db.execute(
                select(User).where(User.referral_code == code)
            )
            if not result.scalar_one_or_none():
                # Save to user
                user.referral_code = code
                await self.db.commit()
                logger.info(f"Created referral code {code} for user {user_id}")
                return code
        
        raise Exception("Failed to generate unique referral code")
    
    async def get_referral_url(self, user_id: str, base_url: str = "https://airouter.host") -> str:
        """Get full referral URL for user"""
        code = await self.get_or_create_code(user_id)
        return f"{base_url}/register?ref={code}"
    
    async def track_click(self, code: str, ip_address: Optional[str] = None):
        """Track click on referral link"""
        click = ReferralClick(
            referral_code=code,
            clicked_by_ip=ip_address
        )
        self.db.add(click)
        await self.db.commit()
        logger.info(f"Tracked referral click: {code} from {ip_address}")
    
    async def process_referral_registration(
        self, 
        code: str, 
        new_user_id: str,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Process registration via referral link
        Returns: True if successful, False if code invalid
        """
        # Find referrer by code
        result = await self.db.execute(
            select(User).where(User.referral_code == code)
        )
        referrer = result.scalar_one_or_none()
        
        if not referrer:
            logger.warning(f"Invalid referral code: {code}")
            return False
        
        # Can't refer yourself
        if str(referrer.id) == new_user_id:
            logger.warning("Self-referral attempt blocked")
            return False
        
        # Update new user with referrer
        result = await self.db.execute(
            select(User).where(User.id == new_user_id)
        )
        new_user = result.scalar_one_or_none()
        
        if new_user:
            new_user.referrer_id = referrer.id
            
            # Mark click as converted
            result = await self.db.execute(
                select(ReferralClick).where(
                    ReferralClick.referral_code == code,
                    ReferralClick.converted == False
                ).order_by(ReferralClick.clicked_at.desc())
            )
            click = result.scalar_one_or_none()
            if click:
                click.converted = True
                click.converted_user_id = new_user_id
            
            await self.db.commit()
            logger.info(f"Referral registered: {new_user_id} referred by {referrer.id}")
            return True
        
        return False
    
    async def calculate_referral_earnings(
        self, 
        investor_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> dict:
        """Calculate total earnings from referrals"""
        
        query = select(
            func.count(InvestorReferralEarning.id).label('count'),
            func.coalesce(func.sum(InvestorReferralEarning.amount_usd), Decimal('0')).label('total')
        ).where(InvestorReferralEarning.investor_id == investor_id)
        
        if start_date:
            query = query.where(InvestorReferralEarning.created_at >= start_date)
        if end_date:
            query = query.where(InvestorReferralEarning.created_at <= end_date)
        
        result = await self.db.execute(query)
        row = result.one()
        
        return {
            'referral_count': row.count,
            'total_earnings': float(row.total),
            'period': 'all time' if not start_date else f"{start_date} to {end_date}"
        }
    
    async def get_referral_stats(self, investor_id: str) -> dict:
        """Get full referral statistics for investor dashboard"""
        
        # Get referral code
        result = await self.db.execute(
            select(User.referral_code).where(User.id == investor_id)
        )
        code = result.scalar()
        
        if not code:
            code = await self.get_or_create_code(investor_id)
        
        # Total clicks
        result = await self.db.execute(
            select(func.count(ReferralClick.id)).where(
                ReferralClick.referral_code == code
            )
        )
        total_clicks = result.scalar() or 0
        
        # Converted referrals (registered)
        result = await self.db.execute(
            select(func.count(ReferralClick.id)).where(
                ReferralClick.referral_code == code,
                ReferralClick.converted == True
            )
        )
        converted = result.scalar() or 0
        
        # Earnings
        earnings = await self.calculate_referral_earnings(investor_id)
        
        # Active referrals (who used investor's key)
        result = await self.db.execute(
            select(
                User.email,
                func.count(RequestLog.id).label('requests'),
                func.coalesce(func.sum(RequestLog.cost_to_us_usd), Decimal('0')).label('spent')
            )
            .join(RequestLog, RequestLog.user_id == User.id)
            .where(
                User.referrer_id == investor_id,
                RequestLog.account_type_used == 'investor'
            )
            .group_by(User.id, User.email)
        )
        active_referrals = [
            {
                'email': row.email,
                'requests': row.requests,
                'spent': float(row.spent)
            }
            for row in result.all()
        ]
        
        return {
            'referral_code': code,
            'referral_url': f"https://airouter.host/register?ref={code}",
            'total_clicks': total_clicks,
            'registered_referrals': converted,
            'active_referrals': len(active_referrals),
            'total_earnings_usd': earnings['total_earnings'],
            'referral_details': active_referrals
        }
    
    async def record_referral_earning(
        self,
        investor_id: str,
        referral_id: str,
        request_log_id: str,
        amount_usd: Decimal,
        turnover_usd: Decimal
    ):
        """Record referral earning when referral uses investor's key"""
        earning = InvestorReferralEarning(
            investor_id=investor_id,
            referral_id=referral_id,
            request_log_id=request_log_id,
            amount_usd=amount_usd,
            turnover_usd=turnover_usd
        )
        self.db.add(earning)
        await self.db.commit()
        logger.info(f"Recorded referral earning: ${amount_usd} for investor {investor_id}")
