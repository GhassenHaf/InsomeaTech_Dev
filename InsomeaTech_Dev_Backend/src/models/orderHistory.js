const db = require('./database');

class OrderHistory {
    static async findAllByOrderId(orderId) {
        const result = await db.query(`
            SELECT 
                oh.id, oh.changed_date, oh.old_status, oh.new_status, oh.change_type, 
                oh.field_changed, oh.old_value, oh.new_value, oh.notes,
                oh.order_id, oh.order_line_id, oh.changed_by,
                u.name as changed_by_name
            FROM insomea_tech.order_history oh
            LEFT JOIN insomea_tech.users u ON oh.changed_by = u.id
            WHERE oh.order_id = $1
            ORDER BY oh.changed_date DESC
        `, [orderId]);
        return result.rows;
    }

    static async create(orderHistoryData) {
        const { 
            order_id, 
            order_line_id, 
            changed_by, 
            old_status, 
            new_status, 
            change_type, 
            field_changed, 
            old_value, 
            new_value, 
            notes 
        } = orderHistoryData;

        const result = await db.query(`
            INSERT INTO insomea_tech.order_history (
                order_id, order_line_id, changed_by, old_status, new_status, 
                change_type, field_changed, old_value, new_value, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, changed_date, old_status, new_status, change_type, 
                     field_changed, old_value, new_value, notes, order_id, order_line_id, changed_by
        `, [order_id, order_line_id, changed_by, old_status, new_status, change_type, field_changed, old_value, new_value, notes]);
        return result.rows[0];
    }
}

module.exports = OrderHistory;