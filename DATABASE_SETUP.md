# InsomeaTech Database Initialization Guide

## Overview

This setup automates PostgreSQL database initialization with proper dependency ordering:

1. **01-schema.sql** - Creates the `insomea_tech` schema
2. **02-trigger-functions.sql** - Creates trigger functions
3. **03-tables-and-indexes.sql** - Creates all tables, indexes, and triggers
4. **04-seed-data.sql** - Populates mock/test data

The numeric prefix ensures Docker processes these files in the correct order automatically.

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Navigate to project root
cd stage_insomea

# Start the database
docker-compose up -d

# Verify it's running
docker-compose ps
```

### Option 2: Using Initialization Scripts

**Linux/macOS:**
```bash
cd stage_insomea
bash init-database.sh
```

**Windows (PowerShell):**
```powershell
cd stage_insomea
.\init-database.bat
```

## Connection Details

- **Host:** 127.0.0.1:5432
- **Database:** insomea_db
- **User:** dev_user
- **Password:** my_secure_password
- **Schema:** insomea_tech

### Connection String

```
postgresql://dev_user:my_secure_password@127.0.0.1:5432/insomea_db?sslmode=disable&search_path=insomea_tech,public
```

### Node.js Connection (from .env)

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=insomea_db
DB_USER=dev_user
DB_PASSWORD=my_secure_password
DB_SCHEMA=insomea_tech
```

## Database Management

### pgAdmin Web UI
- **URL:** http://localhost:5050
- **Email:** admin@insomea.com
- **Password:** admin

### Command Line Access

```bash
# Connect to the database
psql -h 127.0.0.1 -U dev_user -d insomea_db

# List all tables in insomea_tech schema
\dt insomea_tech.*

# View table structure
\d insomea_tech.orders

# Verify data was loaded
SELECT COUNT(*) FROM insomea_tech.orders;
```

### Docker Commands

```bash
# View logs
docker-compose logs -f postgres

# Execute SQL query
docker-compose exec postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM insomea_tech.orders;"

# Backup database
docker-compose exec postgres pg_dump -U dev_user insomea_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U dev_user insomea_db < backup.sql

# Stop containers
docker-compose down

# Stop and remove all data
docker-compose down --volumes
```

## Troubleshooting

### Issue: "connection refused"

**Solution:** Wait for PostgreSQL to fully initialize
```bash
# Check if container is running
docker-compose ps

# View logs to see initialization progress
docker-compose logs postgres
```

### Issue: "schema does not exist"

**Solution:** Ensure schema creation completed
```bash
# Verify schema exists
docker-compose exec postgres psql -U dev_user -d insomea_db -c "\dn"

# Check trigger functions
docker-compose exec postgres psql -U dev_user -d insomea_db -c "SELECT * FROM information_schema.routines WHERE routine_schema='insomea_tech';"
```

### Issue: "function does not exist" when accessing tables

**Solution:** Verify functions created before tables
```bash
# Check all functions
docker-compose exec postgres psql -U dev_user -d insomea_db -c "\df insomea_tech.*"

# Check table triggers
docker-compose exec postgres psql -U dev_user -d insomea_db -c "SELECT * FROM information_schema.triggers WHERE trigger_schema='insomea_tech';"
```

### Issue: Foreign key or constraint errors

**Solution:** The correct execution order prevents this. Reset and reinitialize:
```bash
# Stop and remove everything
docker-compose down --volumes

# Start fresh
docker-compose up -d

# Wait 15 seconds for initialization to complete
sleep 15

# Verify data
docker-compose exec postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM insomea_tech.orders;"
```

## Database Structure

### Schema: `insomea_tech`

#### Tables Created
- `distis` - Distributors
- `products` - Products/Services  
- `users` - System users
- `customers` - Customer accounts
- `customer_products` - Customer-product relationships
- `orders` - Sales orders
- `order_lines` - Order line items
- `order_history` - Order status history
- `zoho_invoices` - Zoho invoice tracking
- `audit_logs` - Audit trail
- `system_settings` - Configuration settings

#### Trigger Functions
- `update_updated_at_column()` - Updates `updated_at` on record modification
- `update_last_modified_date_column()` - Updates `last_modified_date` on record modification

#### Indexes
All tables have appropriate indexes on:
- Primary keys
- Foreign keys
- Status/state columns
- Frequently queried fields (email, SKU, order_number, etc.)
- Timestamp columns for sorting

## Seed Data

The initialization includes mock data for testing:
- 3 distributors
- 5 products
- 4 users (admin, sales, support, finance)
- 4 customers
- 4 orders with line items
- Associated data (order history, invoices)

## Performance Tuning

The Docker container is configured with:
- Max connections: 200
- Shared buffers: 256MB
- UTF-8 encoding
- en_US.UTF-8 locale

Adjust in `docker-compose.yml` if needed.

## Security Notes

⚠️ **Development Only** - The current credentials are for local development.

For production:
1. Use strong passwords
2. Set `sslmode=require`
3. Use environment variables instead of hardcoded passwords
4. Restrict database access to application networks
5. Enable audit logging (`audit_logs` table is ready)
6. Set up regular backups

## Integration with Node.js Application

The Node.js backend is already configured to connect. Ensure:

```javascript
// From src/config/database.js
const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Set search_path to access insomea_tech schema
const pool = new Pool({
  connectionString,
  statement_timeout: 30000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});
```

## Next Steps

1. ✅ Database is initialized and populated
2. ✅ All tables and indexes are created
3. ✅ Trigger functions are ready
4. ✅ Seed data is loaded
5. → Start the Node.js backend: `npm start`
6. → Start the Angular frontend: `npm start`

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
