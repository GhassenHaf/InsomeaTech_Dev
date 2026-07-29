const db = require('./database');

class AuditLog {
    static async findAll(filters = {}) {
        let query = `
            SELECT 
                al.id, al.entity_type, al.entity_id, al.action, al.timestamp, 
                al.changes, al.ip_address, al.user_id,
                u.name as user_name
            FROM insomea_tech.audit_logs al
            LEFT JOIN insomea_tech.users u ON al.user_id = u.id
        `;
        const params = [];
        let paramIndex = 1;
        let whereClause = '';

        if (filters.entity_type) {
            whereClause += ` WHERE al.entity_type = $${paramIndex}`;
            params.push(filters.entity_type);
            paramIndex++;
        }

        if (filters.action) {
            if (whereClause) {
                whereClause += ` AND al.action = $${paramIndex}`;
            } else {
                whereClause += ` WHERE al.action = $${paramIndex}`;
            }
            params.push(filters.action);
            paramIndex++;
        }

        if (filters.user_id) {
            if (whereClause) {
                whereClause += ` AND al.user_id = $${paramIndex}`;
            } else {
                whereClause = ` WHERE al.user_id = $${paramIndex}`;
            }
            params.push(filters.user_id);
            paramIndex++;
        }

        if (filters.date_from) {
            const dateCondition = ` WHERE al.timestamp >= $${paramIndex}`;
            if (whereClause) {
                whereClause += dateCondition;
            } else {
                whereClause = dateCondition;
            }
            params.push(filters.date_from);
            paramIndex++;
        }

        if (filters.date_to) {
            const dateCondition = ` WHERE al.timestamp <= $${paramIndex}`;
            if (whereClause) {
                whereClause += dateCondition;
            } else {
                whereClause = dateCondition;
            }
            params.push(filters.date_to);
            paramIndex++;
        }

        query += whereClause + ` ORDER BY al.timestamp DESC`;
        
        const result = await db.query(query, params);
        return result.rows;
    }

    static async create(auditLogData) {
        const { 
            entity_type, 
            entity_id, 
            action, 
            changes, 
            ip_address, 
            user_id 
        } = auditLogData;

        const result = await db.query(`
            INSERT INTO insomea_tech.audit_logs (
                entity_type, entity_id, action, changes, ip_address, user_id
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, entity_type, entity_id, action, timestamp, changes, ip_address, user_id
        `, [entity_type, entity_id, action, changes, ip_address, user_id]);
        return result.rows[0];
    }
}

module.exports = AuditLog;