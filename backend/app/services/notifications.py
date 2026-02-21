"""
Telegram notifications service for admin alerts
"""
import logging
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = "8549699847:AAE_R4pJyqwDXHfudJPJktDmbWB4GFMhOts"
TELEGRAM_CHAT_ID = "-1003851342532"  # @airoutersupp group

async def send_telegram_message(message: str, parse_mode: str = "HTML") -> bool:
    """Send message to Telegram admin group"""
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": parse_mode,
                    "disable_web_page_preview": True
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                logger.info("Telegram notification sent successfully")
                return True
            else:
                logger.error(f"Failed to send Telegram message: {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Telegram notification error: {e}")
        return False

async def notify_new_user_registered(email: str, user_id: str, role: str = "client", referral_code: str = None):
    """Send notification when new user registers"""
    
    emoji = "👤" if role == "client" else "💼"
    role_text = "Клиент" if role == "client" else "Инвестор"
    
    message = f"""
{emoji} <b>Новая регистрация!</b>

📧 Email: <code>{email}</code>
🆔 ID: <code>{user_id}</code>
👤 Роль: {role_text}
🕐 Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    
    if referral_code:
        message += f"🔗 Реферальный код: <code>{referral_code}</code>\n"
    
    await send_telegram_message(message)

async def notify_balance_deposited(email: str, user_id: str, amount: float, currency: str = "USD", payment_method: str = "crypto"):
    """Send notification when user deposits balance"""
    
    method_emoji = {
        "crypto": "₿",
        "allin": "💳",
        "manual": "💵"
    }.get(payment_method, "💰")
    
    message = f"""
{method_emoji} <b>Пополнение баланса!</b>

📧 Пользователь: <code>{email}</code>
🆔 ID: <code>{user_id}</code>
💵 Сумма: <b>${amount:.2f}</b> {currency}
💳 Метод: {payment_method.upper()}
🕐 Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    
    await send_telegram_message(message)

async def notify_large_deposit(email: str, user_id: str, amount: float, currency: str = "USD"):
    """Send alert for large deposits (>$500)"""
    
    message = f"""
🚨 <b>КРУПНОЕ ПОПОЛНЕНИЕ!</b>

📧 Пользователь: <code>{email}</code>
🆔 ID: <code>{user_id}</code>
💵 Сумма: <b>${amount:.2f}</b> {currency} ⚠️
🕐 Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

❗️ Требуется проверка
"""
    
    await send_telegram_message(message)
