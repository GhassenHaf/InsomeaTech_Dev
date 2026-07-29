const db = require('./database');

class Customer {
    static async findAll(filters = {}) {
        let query = `
            SELECT 
                c.id, c.company_name, c.tenant_id, c.onmicrosoft_domain, c.email, c.phone, 
                c.contact_person, c.status, c.created_date, c.created_by, c.source, c.updated_at,
                c.sales_person_id, c.country,
                u.name as sales_person_name
            FROM insomea_tech.customers c
            LEFT JOIN insomea_tech.users u ON c.sales_person_id = u.id
        `;
        const params = [];
        let paramIndex = 1;
        let whereClause = '';

        if (filters.status) {
            whereClause += ` WHERE c.status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.search) {
            const searchCondition = ` WHERE c.company_name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex + 1}`;
            whereClause = whereClause ? whereClause + ` OR ${searchCondition.replace('WHERE', '')}` : searchCondition;
            params.push(`%${filters.search}%`, `%${filters.search}%`);
            paramIndex += 2;
        }

        query += whereClause + ` ORDER BY c.created_date DESC`;
        
        const result = await db.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await db.query(`
            SELECT 
                c.id, c.company_name, c.tenant_id, c.onmicrosoft_domain, c.email, c.phone, 
                c.contact_person, c.status, c.created_date, c.created_by, c.source, c.updated_at,
                c.sales_person_id, c.country,
                u.name as sales_person_name
            FROM insomea_tech.customers c
            LEFT JOIN insomea_tech.users u ON c.sales_person_id = u.id
            WHERE c.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findByTenantId(tenantId) {
        const result = await db.query(`
            SELECT 
                c.id, c.company_name, c.tenant_id, c.onmicrosoft_domain, c.email, c.phone, 
                c.contact_person, c.status, c.created_date, c.created_by, c.source, c.updated_at,
                c.sales_person_id, c.country,
                u.name as sales_person_name
            FROM insomea_tech.customers c
            LEFT JOIN insomea_tech.users u ON c.sales_person_id = u.id
            WHERE c.tenant_id = $1
        `, [tenantId]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await db.query(`
            SELECT 
                c.id, c.company_name, c.tenant_id, c.onmicrosoft_domain, c.email, c.phone, 
                c.contact_person, c.status, c.created_date, c.created_by, c.source, c.updated_at,
                c.sales_person_id, c.country,
                u.name as sales_person_name
            FROM insomea_tech.customers c
            LEFT JOIN insomea_tech.users u ON c.sales_person_id = u.id
            WHERE c.email = $1
        `, [email]);
        return result.rows[0];
    }

    static async findByEmailCaseInsensitive(email) {
        const result = await db.query(`
            SELECT 
                c.id, c.company_name, c.tenant_id, c.onmicrosoft_domain, c.email, c.phone, 
                c.contact_person, c.status, c.created_date, c.created_by, c.source, c.updated_at,
                c.sales_person_id, c.country,
                u.name as sales_person_name
            FROM insomea_tech.customers c
            LEFT JOIN insomea_tech.users u ON c.sales_person_id = u.id
            WHERE LOWER(c.email) = LOWER($1)
        `, [email]);
        return result.rows[0];
    }

    static async create(customerData) {
        const { 
            company_name, 
            tenant_id, 
            onmicrosoft_domain,
            email, 
            phone, 
            contact_person, 
            status = 'Active', 
            created_by, 
            source = 'Manual',
            sales_person_id,
            country
        } = customerData;

        const result = await db.query(`
            INSERT INTO insomea_tech.customers (
                company_name, tenant_id, onmicrosoft_domain, email, phone, 
                contact_person, status, created_by, source, sales_person_id, country
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, company_name, tenant_id, onmicrosoft_domain, email, phone, 
                      contact_person, status, created_date, created_by, source, 
                      sales_person_id, country, updated_at
        `, [company_name, tenant_id, onmicrosoft_domain, email, phone, contact_person, status, created_by, source, sales_person_id, country]);
        
        // Return the full object with joins
        return this.findById(result.rows[0].id);
    }

    static async update(id, customerData) {
        const { 
            company_name, 
            tenant_id, 
            onmicrosoft_domain,
            email, 
            phone, 
            contact_person, 
            status,
            sales_person_id,
            country
        } = customerData;

        const result = await db.query(`
            UPDATE insomea_tech.customers 
            SET company_name = $1, tenant_id = $2, onmicrosoft_domain = $3, email = $4, 
                phone = $5, contact_person = $6, status = $7, sales_person_id = $8,
                country = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING id, company_name, tenant_id, onmicrosoft_domain, email, phone, 
                      contact_person, status, created_date, created_by, source, 
                      sales_person_id, country, updated_at
        `, [company_name, tenant_id, onmicrosoft_domain, email, phone, contact_person, status, sales_person_id, country, id]);
        
        // Return the full object with joins
        return this.findById(id);
    }

    static async delete(id) {
        const result = await db.query(`
            DELETE FROM insomea_tech.customers 
            WHERE id = $1
            RETURNING id
        `, [id]);
        return result.rows[0];
    }
}

module.exports = Customer;