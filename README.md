# AI Router Platform

**OpenRouter Reseller API Platform** — платформа для перепродажи доступа к AI-моделям через OpenRouter API с биллингом и управлением клиентами.

## 🎯 Концепция

AI Router выступает посредником между клиентами и OpenRouter:
- Покупает доступ к OpenRouter со скидкой (через мастер-аккаунты)
- Перепродаёт клиентам с наценкой
- Зарабатывает на разнице (~50% маржа)

## 🏗️ Архитектура

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Клиент    │────▶│  AI Router   │────▶│ OpenRouter  │
│  (API Key)  │     │  (Платформа) │     │  (Upstream) │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  PostgreSQL │
                    │  (Логи,     │
                    │   балансы)  │
                    └─────────────┘
```

## 💰 Бизнес-модель

```
Цена OpenRouter:     $0.010 за 1K токенов (100%)
Наша цена (30%):     $0.003                          ← платим OpenRouter
Цена клиенту (80%):  $0.008                          ← списываем с клиента
Прибыль:             $0.005 (50% маржа)              ← наш заработок
```

## 🚀 Быстрый старт

### URL
- **Web UI:** https://airouter.host
- **API:** https://airouter.host/v1
- **Health:** https://airouter.host/health

### Тестовый доступ (авто-вход)
- Открываешь https://airouter.host — сразу Dashboard
- Авторизация отключена (TEST_MODE)
- Все действия от имени Administrator

### API Key для тестов
Создаёшь в разделе "API Keys" → "Create Key" → копируешь

### Тестовый запрос
```bash
curl -X POST https://airouter.host/v1/chat/completions \
  -H "Authorization: Bearer твой_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 📁 Структура проекта

```
ai-router-platform/
├── backend/                 # FastAPI приложение
│   ├── app/
│   │   ├── api/v1/         # API endpoints
│   │   │   ├── auth.py     # Авторизация (JWT)
│   │   │   ├── proxy.py    # Проксирование OpenRouter
│   │   │   ├── client.py   # Клиентские endpoints
│   │   │   └── admin.py    # Админ endpoints
│   │   ├── core/           # Конфигурация, security
│   │   ├── models/         # SQLAlchemy модели
│   │   ├── services/       # Бизнес-логика (billing)
│   │   └── db/             # Подключение к БД
│   └── requirements.txt
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/          # Страницы (Login, Dashboard, Admin)
│   │   ├── components/     # Layout, Sidebar, Header
│   │   ├── api/client.ts   # Axios клиент
│   │   └── store/          # Zustand store
│   └── package.json
└── docker-compose.yml      # Все сервисы
```

## 🔌 API Endpoints

### Публичные
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/v1/auth/register` | Регистрация |
| POST | `/v1/auth/login` | Вход (JWT) |
| POST | `/v1/auth/refresh` | Обновление токена |
| GET | `/v1/health` | Статус сервиса |

### Требуют авторизацию
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/v1/auth/me` | Инфо о пользователе |
| GET | `/v1/auth/api-keys` | Список API ключей |
| POST | `/v1/auth/api-keys` | Создать ключ |
| DELETE | `/v1/auth/api-keys/{id}` | Отозвать ключ |

### Клиентские
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/v1/client/balance` | Баланс |
| GET | `/v1/client/usage` | Статистика |
| GET | `/v1/client/usage/daily` | По дням |
| GET | `/v1/client/models/usage` | По моделям |
| GET | `/v1/client/recent-requests` | Логи запросов |

### Проксирование OpenRouter
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/v1/chat/completions` | Основной endpoint |
| GET | `/v1/models` | Список моделей |

### Админские (role=admin)
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/v1/admin/stats` | Статистика платформы |
| GET | `/v1/admin/clients` | Список пользователей |
| GET | `/v1/admin/master-accounts` | Мастер-аккаунты |
| GET | `/v1/admin/logs` | Логи запросов |

## 💾 База данных

### Таблицы

**users**
- id, email, password_hash, name, role (admin/client), status

**api_keys**
- id, user_id, key_hash (SHA256), name, is_active, last_used_at

**balances**
- user_id, balance_usd, lifetime_spent, lifetime_earned

**request_logs**
- user_id, api_key_id, model, tokens, cost_to_client_usd, profit_usd

**master_accounts**
- api_key_encrypted, balance_usd, discount_percent (обычно 70%)

**model_pricing**
- id, provider, prompt_price, completion_price, is_active

## 🔐 Аутентификация

### JWT Flow
1. POST `/v1/auth/login` → получаешь access_token + refresh_token
2. Используешь access_token в заголовке: `Authorization: Bearer {token}`
3. Access token действует 15 минут
4. Refresh token действует 7 дней

### Роли
- **client** — Dashboard, API Keys, Usage, баланс
- **admin** — + Admin Panel (статистика, клиенты, настройки)

## ⚙️ Конфигурация

### Переменные окружения (backend/.env)
```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/ai_router

# Redis
REDIS_URL=redis://redis:6379/0

# OpenRouter
OPENROUTER_MASTER_KEYS=sk-or-v1-xxx,sk-or-v1-yyy
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Security
SECRET_KEY=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# Email (опционально)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payments (опционально)
STRIPE_SECRET_KEY=sk_xxx
YOOKASSA_SHOP_ID=xxx
YOOKASSA_SECRET_KEY=xxx
```

## 🐳 Docker

### Запуск
```bash
cd ai-router-platform
docker-compose up -d
```

### Сервисы
| Сервис | Порт | Описание |
|--------|------|----------|
| backend | 8000 | FastAPI приложение |
| frontend | 3000 | Nginx (статика) |
| db | 5433 | PostgreSQL |
| redis | 6379 | Redis |
| prometheus | 9090 | Метрики |
| grafana | 3100 | Дашборды |

### Логи
```bash
# Backend
docker logs -f ai-router-platform-backend-1

# Все сервисы
docker-compose logs -f
```

## 🔧 Управление

### Перезапуск
```bash
# Backend
docker restart ai-router-platform-backend-1

# Все сервисы
docker-compose restart
```

### Обновление кода
```bash
cd ai-router-platform/frontend
npm run build
cp -r dist/* /var/www/airouter/
```

### Бэкап базы
```bash
docker exec ai-router-platform-db-1 pg_dump -U postgres ai_router > backup.sql
```

### Восстановление
```bash
docker exec -i ai-router-platform-db-1 psql -U postgres -d ai_router < backup.sql
```

## 📝 Порты (не менять!)

| Проект | Сервис | Хост порт | Контейнер |
|--------|--------|-----------|-----------|
| **AI Router** | PostgreSQL | 5433 | 5432 |
| **AI Router** | Redis | 6379 | 6379 |
| **AI Router** | Backend | 8000 | 8000 |
| **AI Router** | Frontend | 3000 | 80 |
| **AI Router** | Prometheus | 9090 | 9090 |
| **AI Router** | Grafana | 3100 | 3000 |
| **GPU Pool** | PostgreSQL | 5432 | 5432 |
| **GPU Pool** | Redis | 6380 | 6379 |
| **GPU Pool** | Backend | 8002 | 8000 |
| **GPU Pool** | Frontend | 3001 | 3000 |

## ⚠️ Ограничения текущей версии

1. **Нет пополнения баланса** — нужно вручную через SQL
2. **Нет авто-обновления цен моделей**
3. **Нет email-уведомлений**
4. **Нет rate limiting на уровне пользователя**
5. **TEST_MODE = True** — авторизация отключена (только для тестов!)

## 🛠️ Технологии

- **Backend:** Python 3.12, FastAPI, SQLAlchemy (async), Pydantic
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand
- **Database:** PostgreSQL 15, Redis 7
- **Infra:** Docker, Nginx, Let's Encrypt SSL
- **Monitoring:** Prometheus, Grafana

## 📞 Поддержка

Email: support@ai-router.com  
URL: https://airouter.host

---

**Версия:** 1.0.0  
**Дата сборки:** 2026-02-13  
**Статус:** Тестовый режим (авторизация отключена)
