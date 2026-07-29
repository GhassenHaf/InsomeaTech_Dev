#!/bin/bash
# =============================================================================
# Database Initialization Script
# This script starts the PostgreSQL container and initializes the database
# Execution order is automatically handled by numeric file prefixes:
#   01-schema.sql          → Creates insomea_tech schema
#   02-trigger-functions.sql → Creates trigger functions  
#   03-tables-and-indexes.sql → Creates tables, indexes, and triggers
#   04-seed-data.sql       → Loads mock/seed data
# =============================================================================

set -e  # Exit on any error

echo "=================================="
echo "InsomeaTech Database Initialization"
echo "=================================="
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    echo "ℹ️  Using 'docker compose' instead of 'docker-compose'"
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Build and start services
echo "🚀 Starting Docker services..."
$DOCKER_COMPOSE up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be healthy..."
sleep 2

# Check container health
for i in {1..30}; do
    if $DOCKER_COMPOSE exec -T postgres pg_isready -U dev_user -d insomea_db &> /dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start within 30 seconds"
        $DOCKER_COMPOSE logs postgres
        exit 1
    fi
    echo "   Attempt $i/30..."
    sleep 1
done

echo ""
echo "=================================="
echo "✅ Database Initialization Complete!"
echo "=================================="
echo ""
echo "📊 Database Details:"
echo "   Host: 127.0.0.1:5432"
echo "   Database: insomea_db"
echo "   User: dev_user"
echo "   Password: my_secure_password"
echo ""
echo "🔗 Connection String:"
echo "   postgresql://dev_user:my_secure_password@127.0.0.1:5432/insomea_db?sslmode=disable&search_path=insomea_tech,public"
echo ""
echo "🎯 pgAdmin UI (Database Management):"
echo "   URL: http://localhost:5050"
echo "   Email: admin@insomea.com"
echo "   Password: admin"
echo ""
echo "📋 Verify Database:"
$DOCKER_COMPOSE exec -T postgres psql -U dev_user -d insomea_db -c "
  SELECT 
    schemaname as schema,
    COUNT(*) as table_count
  FROM pg_tables 
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  GROUP BY schemaname;
"
echo ""
echo "📊 Table Record Counts:"
$DOCKER_COMPOSE exec -T postgres psql -U dev_user -d insomea_db -c "
  SELECT 
    (SELECT COUNT(*) FROM insomea_tech.distis) as distis_count,
    (SELECT COUNT(*) FROM insomea_tech.products) as products_count,
    (SELECT COUNT(*) FROM insomea_tech.users) as users_count,
    (SELECT COUNT(*) FROM insomea_tech.customers) as customers_count,
    (SELECT COUNT(*) FROM insomea_tech.orders) as orders_count,
    (SELECT COUNT(*) FROM insomea_tech.order_lines) as order_lines_count;
"
echo ""
echo "💡 Useful Commands:"
echo "   View logs:           $DOCKER_COMPOSE logs -f postgres"
echo "   Stop containers:     $DOCKER_COMPOSE down"
echo "   Stop & remove data:  $DOCKER_COMPOSE down --volumes"
echo "   Connect to DB:       psql -h 127.0.0.1 -U dev_user -d insomea_db"
echo ""
