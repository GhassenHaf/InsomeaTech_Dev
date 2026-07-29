const db = require('./database');

class Disti {
    static async findAll(filters = {}) {
        let query = `SELECT id, name, email_support, phone, partner_link, status, notes, created_at, updated_at FROM insomea_tech.distis`;
        const params = [];
        let paramIndex = 1;
        let whereClause = '';

        if (filters.status) {
            whereClause += ` WHERE status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.search) {
            const searchCondition = ` WHERE name ILIKE $${paramIndex} OR email_support ILIKE $${paramIndex + 1}`;
            if (whereClause) {
                whereClause += ` AND (${searchCondition.replace('WHERE', '')}`;
            } else {
                whereClause = searchCondition;
            }
            params.push(`%${filters.search}%`, `%${filters.search}%`);
            paramIndex += 2;
        }

        query += whereClause + ` ORDER BY created_at DESC`;
        
        const result = await db.query(query, params);
        return result.rows;
    }

    static async findById(id) {
        const result = await db.query(`
            SELECT id, name, email_support, phone, partner_link, status, notes, created_at, updated_at 
            FROM insomea_tech.distis 
            WHERE id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findByNameCaseInsensitive(name) {
        const result = await db.query(`
            SELECT id, name, email_support, phone, partner_link, status, notes, created_at, updated_at 
            FROM insomea_tech.distis 
            WHERE LOWER(name) = LOWER($1)
        `, [name]);
        return result.rows[0];
    }

    static async create(distiData) {
        const { 
            name, 
            email_support, 
            phone, 
            partner_link, 
            status = 'Active', 
            notes 
        } = distiData;

        const result = await db.query(`
            INSERT INTO insomea_tech.distis (name, email_support, phone, partner_link, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, email_support, phone, partner_link, status, notes, created_at, updated_at
        `, [name, email_support, phone, partner_link, status, notes]);
        return result.rows[0];
    }

    static async update(id, distiData) {
        const { 
            name, 
            email_support, 
            phone, 
            partner_link, 
            status, 
            notes 
        } = distiData;

        const result = await db.query(`
            UPDATE insomea_tech.distis 
            SET name = $1, email_support = $2, phone = $3, partner_link = $4, 
                status = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING id, name, email_support, phone, partner_link, status, notes, created_at, updated_at
        `, [name, email_support, phone, partner_link, status, notes, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(`
            DELETE FROM insomea_tech.distis 
            WHERE id = $1
            RETURNING id
        `, [id]);
        return result.rows[0];
    }
}

module.exports = Disti;