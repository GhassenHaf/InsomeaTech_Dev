-- =============================================================================
-- STEP 3: Create tables, indexes, and triggers
-- All trigger functions are now available (from step 2)
-- All tables exist in schema insomea_tech (from step 1)
-- =============================================================================

SET search_path TO insomea_tech, public;

-- ============= DISTIS TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.distis (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	email_support varchar(255) NULL,
	phone varchar(50) NULL,
	partner_link text NULL,
	status varchar(20) DEFAULT 'Active'::character varying NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT distis_pkey PRIMARY KEY (id),
	CONSTRAINT distis_status_check CHECK (((status)::text = ANY (ARRAY[('Active'::character varying)::text, ('Inactive'::character varying)::text])))
);

CREATE TRIGGER update_distis_updated_at BEFORE UPDATE ON insomea_tech.distis 
FOR EACH ROW EXECUTE FUNCTION insomea_tech.update_updated_at_column();

-- ============= PRODUCTS TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.products (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	sku varchar(100) NOT NULL,
	description text NULL,
	billing_cycle varchar(20) NULL,
	term varchar(20) NULL,
	category varchar(100) NULL,
	list_price numeric(10, 2) NULL,
	segment varchar(100) NULL,
	status varchar(20) DEFAULT 'Active'::character varying NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT products_pkey PRIMARY KEY (id),
	CONSTRAINT products_status_check CHECK (((status)::text = ANY (ARRAY[('Active'::character varying)::text, ('Discontinued'::character varying)::text])))
);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON insomea_tech.products 
FOR EACH ROW EXECUTE FUNCTION insomea_tech.update_updated_at_column();

-- ============= USERS TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.users (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	email varchar(255) NOT NULL UNIQUE,
	name varchar(255),
	role varchar(50) DEFAULT 'user',
	status varchar(20) DEFAULT 'Active',
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON insomea_tech.users 
FOR EACH ROW EXECUTE FUNCTION insomea_tech.update_updated_at_column();

-- ============= CUSTOMERS TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.customers (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	customer_name varchar(255) NOT NULL,
	email varchar(255),
	phone varchar(50),
	contact_name varchar(255),
	status varchar(20) DEFAULT 'Active',
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON insomea_tech.customers 
FOR EACH ROW EXECUTE FUNCTION insomea_tech.update_updated_at_column();

-- ============= CUSTOMER_PRODUCTS TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.customer_products (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	customer_id uuid NOT NULL,
	product_id uuid NOT NULL,
	quantity int DEFAULT 1,
	status varchar(20) DEFAULT 'Active',
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT customer_products_pkey PRIMARY KEY (id),
	CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES insomea_tech.customers(id) ON DELETE CASCADE,
	CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES insomea_tech.products(id) ON DELETE CASCADE
);

CREATE TRIGGER update_customer_products_updated_at BEFORE UPDATE ON insomea_tech.customer_products 
FOR EACH ROW EXECUTE FUNCTION insomea_tech.update_updated_at_column();

-- ============= ORDERS TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.orders (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	order_number varchar(50) NOT NULL UNIQUE,
	customer_id uuid NOT NULL,
	user_id uuid,
	total_amount numeric(12, 2),
	status varchar(20) DEFAULT 'Pending',
	notes text,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT orders_pkey PRIMARY KEY (id),
	CONSTRAINT fk_customer_order FOREIGN KEY (customer_id) REFERENCES insomea_tech.customers(id) ON DELETE RESTRICT,
	CONSTRAINT fk_user_order FOREIGN KEY (user_id) REFERENCES insomea_tech.users(id) ON DELETE SET NULL
);

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON insomea_tech.orders 
FOR EACH ROW EXECUTE FUNCTION insomea_tech.update_updated_at_column();

-- ============= ORDER_LINES TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.order_lines (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	order_id uuid NOT NULL,
	product_id uuid NOT NULL,
	quantity int NOT NULL,
	unit_price numeric(10, 2),
	line_total numeric(12, 2),
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT order_lines_pkey PRIMARY KEY (id),
	CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES insomea_tech.orders(id) ON DELETE CASCADE,
	CONSTRAINT fk_product_line FOREIGN KEY (product_id) REFERENCES insomea_tech.products(id) ON DELETE RESTRICT
);

CREATE TRIGGER update_order_lines_updated_at BEFORE UPDATE ON insomea_tech.order_lines 
FOR EACH ROW EXECUTE FUNCTION insomea_tech.update_updated_at_column();

-- ============= ORDER_HISTORY TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.order_history (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	order_id uuid NOT NULL,
	status varchar(20),
	notes text,
	created_by uuid,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT order_history_pkey PRIMARY KEY (id),
	CONSTRAINT fk_order_history FOREIGN KEY (order_id) REFERENCES insomea_tech.orders(id) ON DELETE CASCADE
);

-- ============= ZOHO_INVOICES TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.zoho_invoices (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	order_id uuid NOT NULL,
	zoho_invoice_id varchar(100),
	status varchar(20) DEFAULT 'Draft',
	amount numeric(12, 2),
	last_modified_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT zoho_invoices_pkey PRIMARY KEY (id),
	CONSTRAINT fk_order_invoice FOREIGN KEY (order_id) REFERENCES insomea_tech.orders(id) ON DELETE CASCADE
);

CREATE TRIGGER update_zoho_invoices_modified_at BEFORE UPDATE ON insomea_tech.zoho_invoices 
FOR EACH ROW EXECUTE FUNCTION insomea_tech.update_last_modified_date_column();

-- ============= AUDIT_LOGS TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.audit_logs (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid,
	action varchar(100) NOT NULL,
	entity_type varchar(100),
	entity_id uuid,
	old_values jsonb,
	new_values jsonb,
	ip_address varchar(45),
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- ============= SYSTEM_SETTINGS TABLE =============
CREATE TABLE IF NOT EXISTS insomea_tech.system_settings (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	setting_key varchar(255) NOT NULL UNIQUE,
	setting_value text,
	data_type varchar(50),
	description text,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT system_settings_pkey PRIMARY KEY (id)
);

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON insomea_tech.system_settings 
FOR EACH ROW EXECUTE FUNCTION insomea_tech.update_updated_at_column();

-- ============= INDEXES =============
CREATE INDEX IF NOT EXISTS idx_distis_status ON insomea_tech.distis(status);
CREATE INDEX IF NOT EXISTS idx_distis_created_at ON insomea_tech.distis(created_at);

CREATE INDEX IF NOT EXISTS idx_products_status ON insomea_tech.products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON insomea_tech.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON insomea_tech.products(category);

CREATE INDEX IF NOT EXISTS idx_users_email ON insomea_tech.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON insomea_tech.users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON insomea_tech.users(role);

CREATE INDEX IF NOT EXISTS idx_customers_status ON insomea_tech.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON insomea_tech.customers(email);

CREATE INDEX IF NOT EXISTS idx_customer_products_customer_id ON insomea_tech.customer_products(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_products_product_id ON insomea_tech.customer_products(product_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON insomea_tech.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON insomea_tech.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON insomea_tech.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON insomea_tech.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON insomea_tech.orders(order_number);

CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON insomea_tech.order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_product_id ON insomea_tech.order_lines(product_id);

CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON insomea_tech.order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_status ON insomea_tech.order_history(status);

CREATE INDEX IF NOT EXISTS idx_zoho_invoices_order_id ON insomea_tech.zoho_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_zoho_invoices_status ON insomea_tech.zoho_invoices(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON insomea_tech.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON insomea_tech.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON insomea_tech.audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON insomea_tech.system_settings(setting_key);

RESET search_path;
