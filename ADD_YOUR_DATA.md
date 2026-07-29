# Adding Your Own Seed Data to InsomeaTech Database

## Current Status ✅

Your database is initialized with:
- ✅ Schema `insomea_tech` created
- ✅ All 11 tables created and ready
- ✅ Trigger functions ready
- ✅ 25 indexes ready
- ✅ **All tables are EMPTY** (no generic seed data)

## How to Add Your Own Data

### Option 1: Edit the Placeholder SQL File (EASIEST)

1. **Open** `InsomeaTech_Dev_Backend/init-db/04-seed-data.sql`

2. **Replace the placeholder with your INSERT statements:**
   ```sql
   SET search_path TO insomea_tech, public;
   
   -- Your INSERT statements go here
   INSERT INTO insomea_tech.distis (id, "name", email_support, phone, status) 
   VALUES (gen_random_uuid(), 'Your Company', 'support@example.com', '555-0000', 'Active');
   
   INSERT INTO insomea_tech.products (id, "name", sku, description, billing_cycle, category, list_price, status) 
   VALUES (gen_random_uuid(), 'Product Name', 'SKU-001', 'Description', 'Annual', 'Category', 99.99, 'Active');
   
   -- Add more INSERT statements for customers, orders, etc.
   
   RESET search_path;
   ```

3. **Restart the database:**
   ```bash
   cd c:\Users\ghass\OneDrive\Desktop\stage_insomea
   docker-compose down --volumes
   docker-compose up -d
   sleep 15
   ```

4. **Verify your data loaded:**
   ```bash
   docker-compose exec postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM insomea_tech.distis;"
   ```

---

### Option 2: Create a Separate Seed File

If you have a separate seed file, create it as `05-your-data.sql`:

1. **Create new file:** `InsomeaTech_Dev_Backend/init-db/05-your-data.sql`

2. **Add your SQL:** (Docker will auto-execute it after `04-seed-data.sql`)
   ```sql
   SET search_path TO insomea_tech, public;
   
   -- Your complete seed data here
   INSERT INTO insomea_tech.distis (...) VALUES (...);
   INSERT INTO insomea_tech.products (...) VALUES (...);
   
   RESET search_path;
   ```

3. **Update docker-compose.yml** to mount the new file:
   ```yaml
   volumes:
     - ./InsomeaTech_Dev_Backend/init-db/01-schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
     - ./InsomeaTech_Dev_Backend/init-db/02-trigger-functions.sql:/docker-entrypoint-initdb.d/02-trigger-functions.sql
     - ./InsomeaTech_Dev_Backend/init-db/03-tables-and-indexes.sql:/docker-entrypoint-initdb.d/03-tables-and-indexes.sql
     - ./InsomeaTech_Dev_Backend/init-db/04-seed-data.sql:/docker-entrypoint-initdb.d/04-seed-data.sql
     - ./InsomeaTech_Dev_Backend/init-db/05-your-data.sql:/docker-entrypoint-initdb.d/05-your-data.sql
     - postgres_data:/var/lib/postgresql/data
   ```

4. **Restart database:**
   ```bash
   docker-compose down --volumes
   docker-compose up -d
   sleep 15
   ```

---

### Option 3: Load Data After Database is Running

If you want to load data without restarting:

```bash
# Create your SQL file
cat > your_seed_data.sql << 'EOF'
SET search_path TO insomea_tech, public;

INSERT INTO insomea_tech.distis (id, "name", email_support, phone, status) 
VALUES (gen_random_uuid(), 'Your Company', 'support@example.com', '555-0000', 'Active');

RESET search_path;
EOF

# Execute it
docker-compose exec -T postgres psql -U dev_user -d insomea_db < your_seed_data.sql

# Verify
docker-compose exec postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM insomea_tech.distis;"
```

---

## Required INSERT Statement Formats

### Table: distis
```sql
INSERT INTO insomea_tech.distis (id, "name", email_support, phone, status)
VALUES (gen_random_uuid(), 'Company Name', 'email@example.com', '555-0000', 'Active');
```

### Table: products
```sql
INSERT INTO insomea_tech.products (id, "name", sku, description, billing_cycle, category, list_price, status)
VALUES (gen_random_uuid(), 'Product Name', 'SKU-001', 'Description', 'Annual', 'Category', 99.99, 'Active');
```

### Table: users
```sql
INSERT INTO insomea_tech.users (id, email, first_name, last_name, role, status)
VALUES (gen_random_uuid(), 'user@example.com', 'First', 'Last', 'user', 'Active');
```

### Table: customers
```sql
INSERT INTO insomea_tech.customers (id, customer_name, email, phone, contact_name, status)
VALUES (gen_random_uuid(), 'Customer Name', 'contact@example.com', '555-0000', 'Contact Person', 'Active');
```

### Table: orders
```sql
INSERT INTO insomea_tech.orders (id, order_number, customer_id, user_id, total_amount, status, notes)
VALUES (gen_random_uuid(), 'ORD-001', customer_id_uuid, user_id_uuid, 999.99, 'Pending', 'Order notes');
```

### Table: order_lines
```sql
INSERT INTO insomea_tech.order_lines (id, order_id, product_id, quantity, unit_price, line_total)
VALUES (gen_random_uuid(), order_id_uuid, product_id_uuid, 1, 99.99, 99.99);
```

### Other Tables (full structure)
```sql
INSERT INTO insomea_tech.customer_products (id, customer_id, product_id, quantity, status)
VALUES (gen_random_uuid(), customer_id_uuid, product_id_uuid, 1, 'Active');

INSERT INTO insomea_tech.order_history (id, order_id, status, notes, created_by)
VALUES (gen_random_uuid(), order_id_uuid, 'Pending', 'Status changed', user_id_uuid);

INSERT INTO insomea_tech.zoho_invoices (id, order_id, zoho_invoice_id, status, amount)
VALUES (gen_random_uuid(), order_id_uuid, 'ZI-001', 'Draft', 999.99);

INSERT INTO insomea_tech.system_settings (id, setting_key, setting_value, data_type, description)
VALUES (gen_random_uuid(), 'setting_name', 'value', 'string', 'Description');

INSERT INTO insomea_tech.audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
VALUES (gen_random_uuid(), user_id_uuid, 'CREATE', 'orders', order_id_uuid, NULL, jsonb_build_object('status', 'Pending'), '127.0.0.1');
```

---

## Database Connection Details

- **Host:** 127.0.0.1:5432
- **Database:** insomea_db
- **User:** dev_user
- **Password:** my_secure_password
- **Schema:** insomea_tech

---

## Quick Verification Commands

```bash
# Check if database is running
docker-compose ps

# Connect to database
docker-compose exec postgres psql -U dev_user -d insomea_db

# View all tables in schema
docker-compose exec postgres psql -U dev_user -d insomea_db -c "\dt insomea_tech.*"

# Check row counts
docker-compose exec postgres psql -U dev_user -d insomea_db -c "
  SELECT 
    (SELECT COUNT(*) FROM insomea_tech.distis) as distis,
    (SELECT COUNT(*) FROM insomea_tech.products) as products,
    (SELECT COUNT(*) FROM insomea_tech.users) as users,
    (SELECT COUNT(*) FROM insomea_tech.customers) as customers,
    (SELECT COUNT(*) FROM insomea_tech.orders) as orders;
"

# pgAdmin Web UI: http://localhost:5050
# Email: admin@insomea.com
# Password: admin
```

---

## What's Ready for Your Data

✅ **All 11 tables created and indexed:**
- distis
- products
- users
- customers
- customer_products
- orders
- order_lines
- order_history
- zoho_invoices
- audit_logs
- system_settings

✅ **All constraints and relationships set up:**
- Foreign keys configured
- Check constraints on status fields
- Unique constraints where needed

✅ **Automatic timestamps:**
- `created_at` - auto-set on insert
- `updated_at` - auto-updated on modify
- `last_modified_date` - auto-updated on modify (for zoho_invoices)

✅ **Performance optimized:**
- 25 indexes on key fields
- Search paths configured
- UTF-8 encoding ready

---

## Next Steps

1. ✅ Database schema created
2. ✅ Tables ready to receive data
3. → **ADD YOUR DATA** using one of the options above
4. → Start backend: `npm start` (from InsomeaTech_Dev_Backend)
5. → Start frontend: `npm start` (from InsomeaTech_Dev_Frontend)

**The database is now ready for YOU to fill it with YOUR data!**
