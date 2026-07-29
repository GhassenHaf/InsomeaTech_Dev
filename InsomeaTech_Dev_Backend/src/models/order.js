const db = require('./database');

class Order {
    static async findAll(filters = {}) {
        let query = `
            SELECT 
                o.id, o.order_number, o.order_date, o.status_order, o.lpo_url, o.so_url, o.proof_tech_url, 
                o.notes, o.created_date, o.created_by, o.last_modified_date, o.last_modified_by,
                o.po_number, o.disti_po_url,
                u.name as sales_person_name,
                tu.name as technical_user_name,
                c.company_name as customer_name
            FROM insomea_tech.orders o
            LEFT JOIN insomea_tech.users u ON o.sales_person_id = u.id
            LEFT JOIN insomea_tech.users tu ON o.technical_user_id = tu.id
            LEFT JOIN insomea_tech.customers c ON o.customer_id = c.id
        `;
        const params = [];
        let paramIndex = 1;
        let whereClause = '';

        if (filters.status_order) {
            whereClause += ` WHERE o.status_order = $${paramIndex}`;
            params.push(filters.status_order);
            paramIndex++;
        }

        if (filters.customer_id) {
            if (whereClause) {
                whereClause += ` AND o.customer_id = $${paramIndex}`;
            } else {
                whereClause += ` WHERE o.customer_id = $${paramIndex}`;
            }
            params.push(filters.customer_id);
            paramIndex++;
        }

        if (filters.search) {
            const searchCondition = ` WHERE o.order_number ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex + 1}`;
            if (whereClause) {
                whereClause += ` AND (${searchCondition.replace('WHERE', '')}`;
            } else {
                whereClause = searchCondition;
            }
            params.push(`%${filters.search}%`, `%${filters.search}%`);
            paramIndex += 2;
        }

        query += whereClause + ` ORDER BY o.created_date DESC`;
        
        const result = await db.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await db.query(`
            SELECT 
                o.id, o.order_number, o.order_date, o.status_order, o.lpo_url, o.so_url, o.proof_tech_url, 
                o.notes, o.created_date, o.created_by, o.last_modified_date, o.last_modified_by,
                o.sales_person_id, o.technical_user_id, o.customer_id,
                o.po_number, o.disti_po_url,
                u.name as sales_person_name,
                tu.name as technical_user_name,
                c.company_name as customer_name,
                c.tenant_id as customer_tenant_id
            FROM insomea_tech.orders o
            LEFT JOIN insomea_tech.users u ON o.sales_person_id = u.id
            LEFT JOIN insomea_tech.users tu ON o.technical_user_id = tu.id
            LEFT JOIN insomea_tech.customers c ON o.customer_id = c.id
            WHERE o.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async create(orderData) {
        const { 
            order_number, 
            order_date, 
            status_order = 'WaitingForFinanceApproval', 
            lpo_url, 
            so_url, 
            proof_tech_url, 
            notes, 
            created_by, 
            sales_person_id, 
            technical_user_id, 
            customer_id 
        } = orderData;

        const result = await db.query(`
            INSERT INTO insomea_tech.orders (
                order_number, order_date, status_order, lpo_url, so_url, proof_tech_url, 
                notes, created_by, sales_person_id, technical_user_id, customer_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, order_number, order_date, status_order, lpo_url, so_url, proof_tech_url, 
                     notes, created_date, created_by, last_modified_date, last_modified_by,
                     sales_person_id, technical_user_id, customer_id, po_number, disti_po_url
        `, [order_number, order_date, status_order, lpo_url, so_url, proof_tech_url, notes, created_by, sales_person_id, technical_user_id, customer_id]);
        return result.rows[0];
    }

    static async update(id, orderData) {
        const allowedFields = [
            'status_order', 'lpo_url', 'so_url', 'proof_tech_url', 
            'notes', 'last_modified_by', 'technical_user_id',
            'po_number', 'disti_po_url'
        ];
        
        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const field of allowedFields) {
            if (orderData[field] !== undefined) {
                updates.push(`${field} = $${paramIndex}`);
                values.push(orderData[field]);
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        updates.push(`last_modified_date = CURRENT_TIMESTAMP`);
        values.push(id); // Add ID for WHERE clause

        const query = `
            UPDATE insomea_tech.orders 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, order_number, order_date, status_order, lpo_url, so_url, proof_tech_url, 
                     notes, created_date, created_by, last_modified_date, last_modified_by,
                     sales_person_id, technical_user_id, customer_id, po_number, disti_po_url
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async financeApprove(id, poNumber, distiPoUrl, userId) {
        const result = await db.query(`
            UPDATE insomea_tech.orders
            SET po_number = $1,
                disti_po_url = $2,
                status_order = 'ToBeProvisioned',
                last_modified_by = (SELECT email FROM insomea_tech.users WHERE id = $3),
                last_modified_date = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [poNumber, distiPoUrl, userId, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(`
            DELETE FROM insomea_tech.orders 
            WHERE id = $1
            RETURNING id
        `, [id]);
        return result.rows[0];
    }

    static async findAll(filters = {}) {
        let query = `
            SELECT 
                o.id, o.order_number, o.order_date, o.status_order, o.lpo_url, o.so_url, o.proof_tech_url, 
                o.notes, o.created_date, o.created_by, o.last_modified_date, o.last_modified_by,
                o.sales_person_id, o.technical_user_id, o.customer_id,
                u.name as sales_person_name,
                tu.name as technical_user_name,
                c.company_name as customer_name
            FROM insomea_tech.orders o
            LEFT JOIN insomea_tech.users u ON o.sales_person_id = u.id
            LEFT JOIN insomea_tech.users tu ON o.technical_user_id = tu.id
            LEFT JOIN insomea_tech.customers c ON o.customer_id = c.id
        `;
        const params = [];
        let paramIndex = 1;
        let whereClause = '';

        if (filters.customer_id) {
            whereClause += ` WHERE o.customer_id = $${paramIndex}`;
            params.push(filters.customer_id);
            paramIndex++;
        }

        if (filters.status_order) {
            if (whereClause) {
                whereClause += ` AND o.status_order = $${paramIndex}`;
            } else {
                whereClause += ` WHERE o.status_order = $${paramIndex}`;
            }
            params.push(filters.status_order);
            paramIndex++;
        }

        if (filters.search) {
            const searchCondition = ` WHERE o.order_number ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex + 1}`;
            if (whereClause) {
                whereClause += ` AND (${searchCondition.replace('WHERE', '')}`;
            } else {
                whereClause = searchCondition;
            }
            params.push(`%${filters.search}%`, `%${filters.search}%`);
            paramIndex += 2;
        }

        query += whereClause + ` ORDER BY o.created_date DESC`;
        
        const result = await db.query(query, params);
        return result.rows;
    }
}

module.exports = Order;