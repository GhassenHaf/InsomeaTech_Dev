const db = require('./database');

class CustomerProduct {
    static async findAll(filters = {}) {
        let query = `
            SELECT 
                cp.id, cp.quantity, cp.start_date, cp.expiration_date, cp.billing_cycle, 
                cp.term, cp.status, cp.notes, cp.created_date, cp.last_modified_date,
                cp.customer_id, cp.product_id, cp.order_line_id,
                c.company_name as customer_name,
                c.sales_person_id,
                u_sales.name as sales_person_name,
                p.name as product_name, p.sku as product_sku, p.segment,
                ol.order_id,
                o.order_number,
                d.name as disti_name
            FROM insomea_tech.customer_products cp
            LEFT JOIN insomea_tech.customers c ON cp.customer_id = c.id
            LEFT JOIN insomea_tech.users u_sales ON c.sales_person_id = u_sales.id
            LEFT JOIN insomea_tech.products p ON cp.product_id = p.id
            LEFT JOIN insomea_tech.order_lines ol ON cp.order_line_id = ol.id
            LEFT JOIN insomea_tech.distis d ON ol.disti_id = d.id
            LEFT JOIN insomea_tech.orders o ON ol.order_id = o.id
        `;
        const params = [];
        let paramIndex = 1;
        let whereClause = '';

        if (filters.status) {
            whereClause += ` WHERE cp.status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.customer_id) {
            if (whereClause) {
                whereClause += ` AND cp.customer_id = $${paramIndex}`;
            } else {
                whereClause += ` WHERE cp.customer_id = $${paramIndex}`;
            }
            params.push(filters.customer_id);
            paramIndex++;
        }

        if (filters.product_id) {
            if (whereClause) {
                whereClause += ` AND cp.product_id = $${paramIndex}`;
            } else {
                whereClause = ` WHERE cp.product_id = $${paramIndex}`;
            }
            params.push(filters.product_id);
            paramIndex++;
        }

        if (filters.expiringSoon) {
            const dateCondition = ` WHERE cp.expiration_date <= CURRENT_DATE + INTERVAL '${filters.expiringSoon} days'`;
            if (whereClause) {
                whereClause += dateCondition;
            } else {
                whereClause = dateCondition;
            }
        }

        query += whereClause + ` ORDER BY cp.expiration_date ASC`;
        
        const result = await db.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await db.query(`
            SELECT 
                cp.id, cp.quantity, cp.start_date, cp.expiration_date, cp.billing_cycle, 
                cp.term, cp.status, cp.notes, cp.created_date, cp.last_modified_date,
                cp.customer_id, cp.product_id, cp.order_line_id,
                c.company_name as customer_name,
                c.sales_person_id,
                u_sales.name as sales_person_name,
                p.name as product_name, p.sku as product_sku, p.segment,
                ol.order_id,
                o.order_number,
                d.name as disti_name
            FROM insomea_tech.customer_products cp
            LEFT JOIN insomea_tech.customers c ON cp.customer_id = c.id
            LEFT JOIN insomea_tech.users u_sales ON c.sales_person_id = u_sales.id
            LEFT JOIN insomea_tech.products p ON cp.product_id = p.id
            LEFT JOIN insomea_tech.order_lines ol ON cp.order_line_id = ol.id
            LEFT JOIN insomea_tech.distis d ON ol.disti_id = d.id
            LEFT JOIN insomea_tech.orders o ON ol.order_id = o.id
            WHERE cp.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async create(customerProductData) {
        const { 
            quantity, 
            start_date, 
            expiration_date, 
            billing_cycle, 
            term, 
            status = 'Active', 
            notes, 
            customer_id, 
            product_id, 
            order_line_id 
        } = customerProductData;

        const result = await db.query(`
            INSERT INTO insomea_tech.customer_products (
                quantity, start_date, expiration_date, billing_cycle, term, 
                status, notes, customer_id, product_id, order_line_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, quantity, start_date, expiration_date, billing_cycle, term, 
                     status, notes, created_date, last_modified_date,
                     customer_id, product_id, order_line_id
        `, [quantity, start_date, expiration_date, billing_cycle, term, status, notes, customer_id, product_id, order_line_id]);
        return result.rows[0];
    }

    static async update(id, customerProductData) {
        const { 
            quantity, 
            start_date, 
            expiration_date, 
            billing_cycle, 
            term, 
            status, 
            notes 
        } = customerProductData;

        const result = await db.query(`
            UPDATE insomea_tech.customer_products 
            SET quantity = $1, start_date = $2, expiration_date = $3, billing_cycle = $4, 
                term = $5, status = $6, notes = $7, 
                last_modified_date = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING id, quantity, start_date, expiration_date, billing_cycle, term, 
                     status, notes, created_date, last_modified_date
        `, [quantity, start_date, expiration_date, billing_cycle, term, status, notes, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(`
            DELETE FROM insomea_tech.customer_products 
            WHERE id = $1
            RETURNING id
        `, [id]);
        return result.rows[0];
    }
}

module.exports = CustomerProduct;