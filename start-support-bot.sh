#!/bin/bash
# Quick start script for AI Router Support Bot

echo "🚀 Starting AI Router Support Bot..."

# Check if network exists
if ! docker network ls | grep -q "ai-router-platform_default"; then
    echo "⚠️  Main AI Router platform not running. Starting it first..."
    cd "$(dirname "$0")"
    docker compose up -d
fi

# Start support bot
echo "🤖 Starting support bot..."
docker compose -f docker-compose.support-bot.yml up -d --build

echo "✅ Support bot started!"
echo ""
echo "📋 Next steps:"
echo "1. Create a support group in Telegram"
echo "2. Add the bot (@ai_router_support_bot) to the group as admin"
echo "3. Get group ID and set SUPPORT_GROUP_ID in .env"
echo "4. Restart bot: docker compose -f docker-compose.support-bot.yml restart"
echo ""
echo "📖 Logs: docker logs -f airouter-support-bot"
