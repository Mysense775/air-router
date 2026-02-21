import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton

from config.settings import settings
from api.client import api_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Bot and Dispatcher
bot = Bot(token=settings.BOT_TOKEN)
storage = RedisStorage.from_url(settings.REDIS_URL) if settings.REDIS_URL else None
dp = Dispatcher(storage=storage)

# States
class SupportStates(StatesGroup):
    waiting_api_key = State()
    waiting_category = State()
    waiting_description = State()
    waiting_screenshots = State()
    confirm_ticket = State()

class ReplyStates(StatesGroup):
    waiting_reply = State()

# Keyboards
main_menu_kb = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="🆕 Создать заявку")],
        [KeyboardButton(text="📋 Мои заявки")],
        [KeyboardButton(text="💰 Баланс")],
        [KeyboardButton(text="📊 История запросов")],
    ],
    resize_keyboard=True
)

category_kb = InlineKeyboardMarkup(inline_keyboard=[
    [
        InlineKeyboardButton(text="💰 Биллинг", callback_data="cat:billing"),
        InlineKeyboardButton(text="🔧 Техническая", callback_data="cat:technical"),
    ],
    [
        InlineKeyboardButton(text="🔑 API", callback_data="cat:api"),
        InlineKeyboardButton(text="❓ Другое", callback_data="cat:other"),
    ],
    [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")],
])

priority_kb = InlineKeyboardMarkup(inline_keyboard=[
    [
        InlineKeyboardButton(text="⚡ Критично", callback_data="prio:critical"),
        InlineKeyboardButton(text="🔴 Высокий", callback_data="prio:high"),
    ],
    [
        InlineKeyboardButton(text="🟡 Средний", callback_data="prio:medium"),
        InlineKeyboardButton(text="🟢 Низкий", callback_data="prio:low"),
    ],
])

# Instructions keyboard
how_to_get_key_kb = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="❓ Как получить API ключ", callback_data="howto:key")],
])

@dp.message(CommandStart())
async def cmd_start(message: types.Message, state: FSMContext):
    """Начало работы с ботом"""
    await state.clear()
    
    welcome_text = """
👋 Добро пожаловать в поддержку AI Router!

Я помогу вам:
• 🆕 Создать заявку в техподдержку
• 📋 Посмотреть статус ваших заявок
• 💰 Проверить баланс
• 📊 Увидеть историю API запросов

Для начала работы нужно авторизоваться.
"""
    
    await message.answer(welcome_text)
    
    # Show instructions with button
    instructions_text = """
🔑 *Как получить API ключ:*

1️⃣ Зайдите в личный кабинет: https://airouter.host
2️⃣ Перейдите в раздел "API Keys" 
3️⃣ Нажмите "Create Key"
4️⃣ Можете отметить "☑️ Support only" — тогда ключ будет только для поддержки, без доступа к API запросам
5️⃣ Скопируйте ключ (начинается с *air_...*)

📝 *Введите ваш API ключ:*
"""
    
    await message.answer(
        instructions_text,
        parse_mode="Markdown",
        reply_markup=how_to_get_key_kb
    )
    await state.set_state(SupportStates.waiting_api_key)

@dp.message(SupportStates.waiting_api_key)
async def process_api_key(message: types.Message, state: FSMContext):
    """Обработка API ключа"""
    api_key = message.text.strip()
    
    # Проверяем ключ
    result = await api_client.verify_api_key(api_key)
    
    if result.get("valid"):
        # Сохраняем данные пользователя
        await state.update_data(
            api_key=api_key,
            user_id=result.get("user_id"),
            email=result.get("email"),
            balance=result.get("balance")
        )
        
        await message.answer(
            f"✅ Авторизация успешна!\n\n"
            f"📧 Email: {result.get('email', 'N/A')}\n"
            f"💰 Баланс: ${result.get('balance', 0):.2f}\n\n"
            f"Выберите действие:",
            reply_markup=main_menu_kb
        )
        await state.set_state(None)
    else:
        error_msg = """
❌ *Неверный API ключ*

Возможные причины:
• Ключ введен с ошибкой
• Ключ был отозван
• Ключ имеет неправильный формат

*Проверьте:*
1. Ключ должен начинаться с *air_*
2. Длина ключа ~50 символов
3. Нет лишних пробелов

❓ Нажмите кнопку ниже для подробной инструкции
"""
        await message.answer(
            error_msg,
            parse_mode="Markdown",
            reply_markup=how_to_get_key_kb
        )

@dp.callback_query(F.data == "howto:key")
async def show_how_to_get_key(callback: types.CallbackQuery, state: FSMContext):
    """Показать подробную инструкцию по получению ключа"""
    detailed_instructions = """
📖 *Подробная инструкция по получению API ключа*

*Шаг 1:* Откройте личный кабинет
🔗 https://airouter.host

*Шаг 2:* Авторизуйтесь
Введите email и пароль от вашего аккаунта

*Шаг 3:* Перейдите в раздел API Keys
В боковом меню выберите "API Keys" или нажмите:
🔗 https://airouter.host/api-keys

*Шаг 4:* Создайте новый ключ
Нажмите кнопку "➕ Create Key"

*Шаг 5:* Настройте ключ (опционально)
• *Name:* дайте понятное название (например, "Support Bot")
• ☑️ *Support only:* если отметить — ключ будет работать только для бота поддержки, без доступа к API запросам (рекомендуется!)

*Шаг 6:* Скопируйте ключ
Нажмите на значок 📋 рядом с ключом

⚠️ *Важно:* ключ показывается только один раз! Если потеряете — придется создавать новый.

Готовы ввести ключ?
"""
    await callback.message.answer(
        detailed_instructions,
        parse_mode="Markdown"
    )
    await callback.answer("✅ Инструкция отправлена")

@dp.message(F.text == "🆕 Создать заявку")
async def create_ticket_start(message: types.Message, state: FSMContext):
    """Начало создания заявки"""
    data = await state.get_data()
    if not data.get("api_key"):
        await message.answer(
            "⚠️ Сначала нужно авторизоваться.\nОтправьте /start"
        )
        return
    
    await message.answer(
        "📂 Выберите категорию проблемы:",
        reply_markup=category_kb
    )
    await state.set_state(SupportStates.waiting_category)

@dp.callback_query(F.data.startswith("cat:"))
async def process_category(callback: types.CallbackQuery, state: FSMContext):
    """Обработка выбора категории"""
    category = callback.data.split(":")[1]
    
    category_names = {
        "billing": "💰 Биллинг",
        "technical": "🔧 Техническая",
        "api": "🔑 API",
        "other": "❓ Другое"
    }
    
    await state.update_data(category=category)
    await callback.message.edit_text(
        f"✅ Категория: {category_names.get(category)}\n\n"
        f"📝 Опишите вашу проблему подробно:\n"
        f"(что произошло, когда, какие ошибки)"
    )
    await state.set_state(SupportStates.waiting_description)
    await callback.answer()

@dp.message(SupportStates.waiting_description)
async def process_description(message: types.Message, state: FSMContext):
    """Обработка описания"""
    await state.update_data(
        description=message.text,
        screenshots=[]
    )
    
    await message.answer(
        "📸 Можете прикрепить скриншоты (до 5 штук)\n"
        "или отправьте /skip чтобы пропустить:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="⏭ Пропустить", callback_data="skip_screenshots")]
        ])
    )
    await state.set_state(SupportStates.waiting_screenshots)

@dp.callback_query(F.data == "skip_screenshots")
async def skip_screenshots(callback: types.CallbackQuery, state: FSMContext):
    """Пропуск скриншотов"""
    await confirm_ticket(callback.message, state)
    await callback.answer()

@dp.message(SupportStates.waiting_screenshots, F.photo)
async def collect_screenshots(message: types.Message, state: FSMContext):
    """Сбор скриншотов"""
    data = await state.get_data()
    screenshots = data.get("screenshots", [])
    
    if len(screenshots) >= 5:
        await message.answer("⚠️ Максимум 5 скриншотов. Отправьте /done чтобы продолжить.")
        return
    
    # Сохраняем file_id самого большого фото
    photo = message.photo[-1]
    screenshots.append(photo.file_id)
    await state.update_data(screenshots=screenshots)
    
    await message.answer(
        f"📸 Скриншот {len(screenshots)}/5 добавлен.\n"
        f"Отправьте еще или /done чтобы продолжить."
    )

@dp.message(Command("done"), SupportStates.waiting_screenshots)
async def finish_screenshots(message: types.Message, state: FSMContext):
    """Завершение сбора скриншотов"""
    await confirm_ticket(message, state)

async def confirm_ticket(message_or_callback, state: FSMContext):
    """Подтверждение создания заявки"""
    data = await state.get_data()
    
    category_names = {
        "billing": "💰 Биллинг",
        "technical": "🔧 Техническая",
        "api": "🔑 API",
        "other": "❓ Другое"
    }
    
    text = f"""
🆕 Подтвердите создание заявки:

📂 Категория: {category_names.get(data.get('category'), '❓ Другое')}
📝 Описание: {data.get('description')[:200]}{'...' if len(data.get('description', '')) > 200 else ''}
📸 Скриншотов: {len(data.get('screenshots', []))}

Все верно?
"""
    
    confirm_kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Отправить", callback_data="confirm_ticket"),
            InlineKeyboardButton(text="✏️ Изменить", callback_data="edit_ticket"),
        ],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_ticket")],
    ])
    
    if isinstance(message_or_callback, types.Message):
        await message_or_callback.answer(text, reply_markup=confirm_kb)
    else:
        await message_or_callback.edit_text(text, reply_markup=confirm_kb)
    
    await state.set_state(SupportStates.confirm_ticket)

@dp.callback_query(F.data == "confirm_ticket", SupportStates.confirm_ticket)
async def submit_ticket(callback: types.CallbackQuery, state: FSMContext):
    """Отправка заявки"""
    data = await state.get_data()
    
    # TODO: Сохранить в БД и отправить в группу поддержки
    
    await callback.message.edit_text(
        "✅ Заявка успешно создана!\n\n"
        "📋 Номер заявки: #TMP1234\n"
        "📧 Ответ придет в этот чат.\n\n"
        "Среднее время ответа: 2 часа"
    )
    
    # Отправляем уведомление в группу поддержки
    if settings.SUPPORT_GROUP_ID:
        await notify_support_group(data)
    
    await state.set_state(None)
    await callback.answer()

async def notify_support_group(data: dict):
    """Уведомление в группу поддержки"""
    category_names = {
        "billing": "💰 Биллинг",
        "technical": "🔧 Техническая",
        "api": "🔑 API",
        "other": "❓ Другое"
    }
    
    text = f"""
🆕 Новая заявка в поддержку

👤 Клиент: {data.get('email', 'N/A')}
📂 Категория: {category_names.get(data.get('category'), '❓ Другое')}
💰 Баланс: ${data.get('balance', 0):.2f}

📝 {data.get('description', 'Нет описания')[:300]}
"""
    
    try:
        await bot.send_message(
            chat_id=settings.SUPPORT_GROUP_ID,
            text=text,
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="✏️ Ответить", callback_data=f"reply:{data.get('user_id')}")]
            ])
        )
    except Exception as e:
        logger.error(f"Failed to notify support group: {e}")

@dp.message(F.text == "📋 Мои заявки")
async def list_tickets(message: types.Message, state: FSMContext):
    """Список заявок"""
    # TODO: Получить из БД
    await message.answer(
        "📋 Ваши заявки:\n\n"
        "#1234 - 🔧 Техническая - ✅ Решена\n"
        "#1235 - 💰 Биллинг - 🟡 В работе\n\n"
        "Для деталей отправьте /ticket_1234",
        reply_markup=main_menu_kb
    )

@dp.message(F.text == "💰 Баланс")
async def check_balance(message: types.Message, state: FSMContext):
    """Проверка баланса"""
    data = await state.get_data()
    api_key = data.get("api_key")
    
    if not api_key:
        await message.answer("⚠️ Сначала авторизуйтесь: /start")
        return
    
    user_info = await api_client.get_user_info(api_key)
    
    if user_info:
        await message.answer(
            f"💰 Ваш баланс:\n\n"
            f"Текущий: ${user_info.get('balance_usd', 0):.4f}\n"
            f"Всего потрачено: ${user_info.get('lifetime_spent', 0):.4f}\n"
            f"Экономия: ${user_info.get('lifetime_savings', 0):.4f}\n\n"
            f"Пополнить: https://airouter.host/deposit",
            reply_markup=main_menu_kb
        )
    else:
        await message.answer("❌ Не удалось получить данные. Попробуйте позже.")

@dp.message(F.text == "📊 История запросов")
async def request_history(message: types.Message, state: FSMContext):
    """История API запросов"""
    data = await state.get_data()
    api_key = data.get("api_key")
    
    if not api_key:
        await message.answer("⚠️ Сначала авторизуйтесь: /start")
        return
    
    requests = await api_client.get_recent_requests(api_key, limit=5)
    
    if requests:
        text = "📊 Последние 5 запросов:\n\n"
        for req in requests[:5]:
            text += (
                f"• {req.get('model', 'N/A')}\n"
                f"  Токенов: {req.get('total_tokens', 0)} | "
                f"Стоимость: ${req.get('cost_usd', 0):.6f}\n\n"
            )
        text += "Полная история: https://airouter.host/history"
    else:
        text = "📭 Нет недавних запросов"
    
    await message.answer(text, reply_markup=main_menu_kb)

@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    """Помощь"""
    help_text = """
🤖 Команды бота поддержки:

/start - Начало работы / авторизация
/new_ticket - Создать заявку
/tickets - Мои заявки
/balance - Проверить баланс
/history - История запросов
/help - Эта помощь

Если бот не отвечает, пишите: support@airouter.host
"""
    await message.answer(help_text)

async def main():
    """Запуск бота"""
    logger.info("Starting AI Router Support Bot...")
    
    try:
        await dp.start_polling(bot)
    finally:
        await api_client.close()
        await bot.session.close()

if __name__ == "__main__":
    asyncio.run(main())
