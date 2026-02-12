.PHONY: up down build logs shell migrate test setup

# Docker Compose commands
up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

logs:
	docker-compose logs -f

# Database
migrate:
	cd backend && alembic upgrade head

migrate-create:
	@read -p "Migration message: " msg; \
	cd backend && alembic revision --autogenerate -m "$$msg"

# Backend
backend-shell:
	docker-compose exec backend /bin/sh

backend-logs:
	docker-compose logs -f backend

# Frontend
frontend-shell:
	docker-compose exec frontend /bin/sh

frontend-logs:
	docker-compose logs -f frontend

# Setup
setup:
	cp backend/.env.example backend/.env
	docker-compose up -d db redis
	sleep 5
	$(MAKE) migrate
	docker-compose up -d backend frontend

# Testing
test:
	cd backend && pytest

# Full reset (⚠️ Deletes all data!)
reset:
	docker-compose down -v
	docker-compose up -d

# Quick start
start: up migrate
	@echo "✅ App started!"
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@echo "Docs: http://localhost:8000/docs"
