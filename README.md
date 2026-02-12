# AI Router Platform

OpenRouter Reseller Platform - прокси-сервис для AI моделей с биллингом.

## Бизнес-модель

- Закупка у OpenRouter: 30% от цены
- Продажа клиентам: 80% от цены  
- Маржа: 50% (62.5% ROI)

## Структура проекта

```
ai-router-platform/
├── backend/          # FastAPI backend
├── frontend/         # React frontend
└── docker-compose.yml
```

## Быстрый старт

```bash
# 1. Запуск
make up

# 2. Миграции
cd backend && alembic upgrade head

# 3. Создать admin
make create-admin

# 4. Открыть http://localhost:3000
```

## Документация

- API Docs: http://localhost:8000/docs
- Admin Panel: http://localhost:3000/admin
- Метрики: http://localhost:9090

## Технологии

- **Backend**: FastAPI, PostgreSQL, Redis
- **Frontend**: React, Tailwind, shadcn/ui
- **Deploy**: Docker, Nginx
