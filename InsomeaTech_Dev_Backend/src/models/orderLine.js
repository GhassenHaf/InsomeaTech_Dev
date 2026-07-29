const db = require('./database');

class OrderLine {
    static async findAllByOrderId(orderId) {
        const result = await db.query(`
            SELECT 
                ol.id, ol.quantity, ol.status, ol.expiration_date, ol.activated_date, ol.notes,
                ol.order_id, ol.product_id, ol.disti_id, ol.activated_by,
                p.name as product_name, p.sku as product_sku, p.segment, p.billing_cycle, p.term,
                d.name as disti_name,
                u.name as activated_by_name
            FROM insomea_tech.order_lines ol
            LEFT JOIN insomea_tech.products p ON ol.product_id = p.id
            LEFT JOIN insomea_tech.distis d ON ol.disti_id = d.id
            LEFT JOIN insomea_tech.users u ON ol.activated_by = u.id
            WHERE ol.order_id = $1
        `, [orderId]);
        return result.rows;
    }

    static async findById(id) {
        const result = await db.query(`
            SELECT 
                ol.id, ol.quantity, ol.status, ol.expiration_date, ol.activated_date, ol.notes,
                ol.order_id, ol.product_id, ol.disti_id, ol.activated_by,
                p.name as product_name, p.sku as product_sku, p.segment, p.billing_cycle, p.term,
                d.name as disti_name,
                u.name as activated_by_name
            FROM insomea_tech.order_lines ol
            LEFT JOIN insomea_tech.products p ON ol.product_id = p.id
            LEFT JOIN insomea_tech.distis d ON ol.disti_id = d.id
            LEFT JOIN insomea_tech.users u ON ol.activated_by = u.id
            WHERE ol.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async create(orderLineData) {
        const { 
            order_id, 
            product_id, 
            disti_id, 
            quantity, 
            status = 'Pending', 
            expiration_date, 
            notes 
        } = orderLineData;

        const result = await db.query(`
            INSERT INTO insomea_tech.order_lines (
                order_id, product_id, disti_id, quantity, status, expiration_date, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, order_id, product_id, disti_id, quantity, status, expiration_date, 
                     activated_date, notes
        `, [order_id, product_id, disti_id, quantity, status, expiration_date, notes]);
        return result.rows[0];
    }

        static async update(id, orderLineData) {
            const allowedFields = [
                'quantity', 'status', 'expiration_date', 'activated_date', 
                'notes', 'activated_by', 'disti_id'
            ];
            
            const updates = [];
            const values = [];
            let paramIndex = 1;
    
            for (const field of allowedFields) {
                if (orderLineData[field] !== undefined) {
                    updates.push(`${field} = $${paramIndex}`);
                    values.push(orderLineData[field]);
                    paramIndex++;
                }
            }
    
            if (updates.length === 0) {
                return this.findById(id);
            }
    
            values.push(id); // Add ID for WHERE clause
    
            const query = `
                UPDATE insomea_tech.order_lines 
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING id, order_id, product_id, disti_id, quantity, status, expiration_date, 
                         activated_date, notes
            `;
    
            const result = await db.query(query, values);
            return result.rows[0];
        }
    static async updateStatus(id, status, activatedBy = null) {
        let query;
        let params;

        if (status === 'Activated') {
            query = `
                UPDATE insomea_tech.order_lines 
                SET status = $1, 
                    activated_date = CURRENT_TIMESTAMP,
                    activated_by = $3
                WHERE id = $2
                RETURNING id, status, activated_date, activated_by
            `;
            params = [status, id, activatedBy];
        } else {
            query = `
                UPDATE insomea_tech.order_lines 
                SET status = $1
                WHERE id = $2
                RETURNING id, status, activated_date, activated_by
            `;
            // For other statuses, we don't update activated_by, so we only need two params
            params = [status, id];
        }

        const result = await db.query(query, params);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(`
            DELETE FROM insomea_tech.order_lines 
            WHERE id = $1
            RETURNING id
        `, [id]);
        return result.rows[0];
    }
}

module.exports = OrderLine;