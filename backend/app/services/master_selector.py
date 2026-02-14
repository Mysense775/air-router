"""
Smart Master Account Selector
Выбирает оптимальный мастер-аккаунт на основе приоритетной очереди
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from decimal import Decimal
from typing import Optional, Tuple, Dict, List
import logging

from app.models import MasterAccount, RequestLog

logger = logging.getLogger(__name__)

class NoAvailableAccountError(Exception):
    """Нет доступных мастер-аккаунтов"""
    pass

class MasterAccountSelector:
    """
    Smart selector для выбора оптимального мастер-аккаунта
    
    Стратегия:
    1. Сначала используем discounted аккаунты (высокая маржа)
    2. Когда они заканчиваются — переключаемся на regular (низкая маржа)
    3. Внутри одного типа используем round-robin (usage_weight)
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def select_account(
        self, 
        estimated_cost: Decimal = Decimal("0"),
        min_balance: Decimal = Decimal("1.0")
    ) -> Tuple[MasterAccount, Decimal]:
        """
        Выбирает лучший аккаунт и возвращает ценовой множитель для клиента
        
        Args:
            estimated_cost: Оценочная стоимость запроса
            min_balance: Минимальный запас баланса
            
        Returns:
            - MasterAccount: выбранный аккаунт
            - Decimal: множитель цены (0.8 для -20%, 1.05 для +5%)
            
        Raises:
            NoAvailableAccountError: если нет доступных аккаунтов
        """
        required_balance = estimated_cost + min_balance
        
        # 1. Ищем дисконтные аккаунты с достаточным балансом
        discounted = await self.db.execute(
            select(MasterAccount)
            .where(MasterAccount.account_type == "discounted")
            .where(MasterAccount.is_active == True)
            .where(MasterAccount.balance_usd > required_balance)
            .order_by(MasterAccount.usage_weight.asc())
            .order_by(MasterAccount.balance_usd.desc())
            .limit(1)
            .with_for_update()  # Блокировка для конкурентного доступа
        )
        account = discounted.scalar_one_or_none()
        
        if account:
            # Увеличиваем вес для round-robin
            account.usage_weight += 1
            await self.db.commit()
            
            # Коэффициент цены для клиента: -20% = 0.8
            price_multiplier = Decimal("0.8")
            logger.info(f"Selected DISCOUNTED account {account.name} (balance: {account.balance_usd}, multiplier: {price_multiplier})")
            return account, price_multiplier
        
        # 2. Если дисконтных нет — ищем обычные
        logger.warning("No discounted accounts available, switching to regular")
        
        regular = await self.db.execute(
            select(MasterAccount)
            .where(MasterAccount.account_type == "regular")
            .where(MasterAccount.is_active == True)
            .where(MasterAccount.balance_usd > required_balance)
            .order_by(MasterAccount.balance_usd.desc())
            .limit(1)
            .with_for_update()
        )
        account = regular.scalar_one_or_none()
        
        if account:
            # Коэффициент цены для клиента: +5% = 1.05
            price_multiplier = Decimal("1.05")
            logger.warning(f"Selected REGULAR account {account.name} (balance: {account.balance_usd}, multiplier: {price_multiplier}) - LOW MARGIN!")
            return account, price_multiplier
        
        # 3. Если вообще нет — ошибка
        logger.error(f"No available master accounts! Required: ${required_balance}")
        raise NoAvailableAccountError(
            f"No master accounts available with balance > ${required_balance}"
        )
    
    async def get_pool_stats(self) -> Dict:
        """
        Получает статистику по пулам аккаунтов
        
        Returns:
            Dict с информацией о discounted и regular пулах
        """
        # Статистика по дисконтным
        disc_stats = await self.db.execute(
            select(
                func.count(MasterAccount.id).label("count"),
                func.coalesce(func.sum(MasterAccount.balance_usd), 0).label("total_balance"),
                func.coalesce(func.avg(MasterAccount.balance_usd), 0).label("avg_balance")
            )
            .where(MasterAccount.account_type == "discounted")
            .where(MasterAccount.is_active == True)
        )
        disc = disc_stats.first()
        
        # Статистика по обычным
        reg_stats = await self.db.execute(
            select(
                func.count(MasterAccount.id).label("count"),
                func.coalesce(func.sum(MasterAccount.balance_usd), 0).label("total_balance"),
                func.coalesce(func.avg(MasterAccount.balance_usd), 0).label("avg_balance")
            )
            .where(MasterAccount.account_type == "regular")
            .where(MasterAccount.is_active == True)
        )
        reg = reg_stats.first()
        
        # Определяем текущую стратегию
        disc_balance = disc.total_balance if disc else 0
        reg_balance = reg.total_balance if reg else 0
        
        if disc_balance > 10:
            strategy = "discounted_first"
            strategy_name = "Приоритет дисконтных (маржа 166%)"
        elif reg_balance > 10:
            strategy = "regular_only"
            strategy_name = "Только обычные (маржа 5%)"
        else:
            strategy = "none"
            strategy_name = "Нет доступных аккаунтов!"
        
        return {
            "discounted": {
                "count": disc.count if disc else 0,
                "total_balance": float(disc_balance),
                "avg_balance": float(disc.avg_balance) if disc else 0,
                "status": "active" if disc_balance > 10 else ("low" if disc_balance > 0 else "empty")
            },
            "regular": {
                "count": reg.count if reg else 0,
                "total_balance": float(reg_balance),
                "avg_balance": float(reg.avg_balance) if reg else 0,
                "status": "active" if reg_balance > 10 else ("low" if reg_balance > 0 else "empty")
            },
            "strategy": strategy,
            "strategy_name": strategy_name,
            "total_available": float(disc_balance + reg_balance)
        }
    
    async def check_low_balance_alerts(self) -> List[Dict]:
        """
        Проверяет необходимость алертов о низком балансе
        
        Returns:
            Список алертов (если есть)
        """
        alerts = []
        
        # Проверка дисконтных ключей
        disc_low = await self.db.execute(
            select(MasterAccount)
            .where(MasterAccount.account_type == "discounted")
            .where(MasterAccount.is_active == True)
            .where(MasterAccount.balance_usd < 50)
            .where(MasterAccount.balance_usd > 0)
        )
        disc_accounts = disc_low.scalars().all()
        
        if disc_accounts:
            total_low = sum(a.balance_usd for a in disc_accounts)
            alerts.append({
                "level": "warning",
                "type": "discounted_low",
                "message": f"Дисконтные ключи заканчиваются: {len(disc_accounts)} аккаунтов, баланс ${total_low:.2f}",
                "recommendation": "Пополните для сохранения маржи 166%"
            })
        
        # Проверка полного отсутствия дисконтных
        disc_empty = await self.db.execute(
            select(func.count(MasterAccount.id))
            .where(MasterAccount.account_type == "discounted")
            .where(MasterAccount.is_active == True)
            .where(MasterAccount.balance_usd > 5)
        )
        disc_available = disc_empty.scalar()
        
        if disc_available == 0:
            # Проверяем есть ли вообще дисконтные с нулевым балансом
            disc_zero = await self.db.execute(
                select(func.count(MasterAccount.id))
                .where(MasterAccount.account_type == "discounted")
                .where(MasterAccount.is_active == True)
            )
            if disc_zero.scalar() > 0:
                alerts.append({
                    "level": "critical",
                    "type": "discounted_empty",
                    "message": "Дисконтные ключи закончились! Система перешла на обычные.",
                    "recommendation": "Срочно пополните дисконтные аккаунты!"
                })
        
        # Проверка обычных ключей (если они основные)
        if not disc_available:
            reg_low = await self.db.execute(
                select(func.count(MasterAccount.id))
                .where(MasterAccount.account_type == "regular")
                .where(MasterAccount.is_active == True)
                .where(MasterAccount.balance_usd > 5)
            )
            reg_available = reg_low.scalar()
            
            if reg_available == 0:
                alerts.append({
                    "level": "emergency",
                    "type": "all_empty",
                    "message": "ВСЕ мастер-аккаунты закончились! Сервис недоступен.",
                    "recommendation": "СРОЧНО пополните хотя бы один аккаунт!"
                })
        
        return alerts
    
    async def reset_usage_weights(self):
        """
        Сбрасывает веса usage_weight (можно вызывать раз в сутки)
        """
        await self.db.execute(
            update(MasterAccount)
            .values(usage_weight=0)
        )
        await self.db.commit()
        logger.info("Usage weights reset")


async def select_master_account(
    db: AsyncSession,
    estimated_cost: Decimal = Decimal("0")
) -> Tuple[MasterAccount, Decimal]:
    """
    Упрощённая функция для быстрого выбора аккаунта
    
    Example:
        account, price_multiplier = await select_master_account(db, Decimal("0.5"))
    """
    selector = MasterAccountSelector(db)
    return await selector.select_account(estimated_cost)
