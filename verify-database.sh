#!/bin/bash
# =============================================================================
# Database Verification Script
# Checks if the PostgreSQL database is properly initialized
# =============================================================================

set -e

echo "=================================="
echo "Database Verification Checklist"
echo "=================================="
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# 1. Check container status
echo "1️⃣  Checking PostgreSQL container status..."
if $DOCKER_COMPOSE ps postgres | grep -q "Up"; then
    echo "   ✅ PostgreSQL container is running"
else
    echo "   ❌ PostgreSQL container is not running"
    exit 1
fi
echo ""

# 2. Check schema exists
echo "2️⃣  Checking if insomea_tech schema exists..."
SCHEMA_CHECK=$($DOCKER_COMPOSE exec -T postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='insomea_tech';" 2>/dev/null || echo "0")
if [ "$SCHEMA_CHECK" -gt 0 ]; then
    echo "   ✅ Schema 'insomea_tech' exists"
else
    echo "   ❌ Schema 'insomea_tech' does NOT exist"
    exit 1
fi
echo ""

# 3. Check trigger functions exist
echo "3️⃣  Checking if trigger functions exist..."
FUNC_COUNT=$($DOCKER_COMPOSE exec -T postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='insomea_tech' AND routine_type='FUNCTION';" 2>/dev/null || echo "0")
if [ "$FUNC_COUNT" -ge 2 ]; then
    echo "   ✅ Found $FUNC_COUNT trigger functions"
else
    echo "   ❌ Expected 2+ trigger functions, found $FUNC_COUNT"
    exit 1
fi
echo ""

# 4. Check tables exist
echo "4️⃣  Checking if tables exist..."
TABLE_COUNT=$($DOCKER_COMPOSE exec -T postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='insomea_tech' AND table_type='BASE TABLE';" 2>/dev/null || echo "0")
EXPECTED_TABLES=11
if [ "$TABLE_COUNT" -eq "$EXPECTED_TABLES" ]; then
    echo "   ✅ Found $TABLE_COUNT tables (expected $EXPECTED_TABLES)"
else
    echo "   ⚠️  Found $TABLE_COUNT tables (expected $EXPECTED_TABLES)"
fi
echo ""

# 5. Check indexes exist
echo "5️⃣  Checking if indexes exist..."
INDEX_COUNT=$($DOCKER_COMPOSE exec -T postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema='insomea_tech';" 2>/dev/null || echo "0")
if [ "$INDEX_COUNT" -gt 0 ]; then
    echo "   ✅ Found $INDEX_COUNT indexes"
else
    echo "   ⚠️  No indexes found"
fi
echo ""

# 6. Check seed data
echo "6️⃣  Checking seed data..."
echo "   Table Record Counts:"

RECORD_COUNTS=$($DOCKER_COMPOSE exec -T postgres psql -U dev_user -d insomea_db -c "
  SELECT 
    (SELECT COUNT(*) FROM insomea_tech.distis) as distis,
    (SELECT COUNT(*) FROM insomea_tech.products) as products,
    (SELECT COUNT(*) FROM insomea_tech.users) as users,
    (SELECT COUNT(*) FROM insomea_tech.customers) as customers,
    (SELECT COUNT(*) FROM insomea_tech.customer_products) as customer_products,
    (SELECT COUNT(*) FROM insomea_tech.orders) as orders,
    (SELECT COUNT(*) FROM insomea_tech.order_lines) as order_lines,
    (SELECT COUNT(*) FROM insomea_tech.zoho_invoices) as zoho_invoices,
    (SELECT COUNT(*) FROM insomea_tech.system_settings) as system_settings
  FORMAT CSV;" 2>/dev/null)

IFS=',' read -r distis products users customers customer_products orders order_lines zoho_invoices system_settings <<< "$RECORD_COUNTS"

echo "      • Distis: $distis"
echo "      • Products: $products"
echo "      • Users: $users"
echo "      • Customers: $customers"
echo "      • Customer Products: $customer_products"
echo "      • Orders: $orders"
echo "      • Order Lines: $order_lines"
echo "      • Zoho Invoices: $zoho_invoices"
echo "      • System Settings: $system_settings"

TOTAL_RECORDS=$((distis + products + users + customers + customer_products + orders + order_lines + zoho_invoices + system_settings))
if [ "$TOTAL_RECORDS" -gt 0 ]; then
    echo "   ✅ Seed data loaded ($TOTAL_RECORDS total records)"
else
    echo "   ⚠️  No seed data found"
fi
echo ""

# 7. List all tables
echo "7️⃣  Tables in insomea_tech schema:"
$DOCKER_COMPOSE exec -T postgres psql -U dev_user -d insomea_db -c "\dt insomea_tech.*" 2>/dev/null || echo "   ❌ Could not list tables"
echo ""

# 8. Summary
echo "=================================="
echo "✅ Database Verification Complete!"
echo "=================================="
echo ""
echo "📝 To access the database:"
echo "   psql -h 127.0.0.1 -U dev_user -d insomea_db"
echo ""
echo "🌐 pgAdmin UI:"
echo "   http://localhost:5050"
echo "   Email: admin@insomea.com"
echo "   Password: admin"
echo ""
