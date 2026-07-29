const db = require('./database');

class User {
    static async findAll() {
        const result = await db.query(`
            SELECT id, email, name, role, status, created_at, updated_at 
            FROM insomea_tech.users 
            ORDER BY created_at DESC
        `);
        return result.rows;
    }

    static async findById(id) {
        const result = await db.query(`
            SELECT id, email, name, role, status, created_at, updated_at 
            FROM insomea_tech.users 
            WHERE id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await db.query(`
            SELECT id, email, name, role, status, created_at, updated_at 
            FROM insomea_tech.users 
            WHERE email = $1
        `, [email]);
        return result.rows[0];
    }

    static async findByEmailCaseInsensitive(email) {
        const result = await db.query(`
            SELECT id, email, name, role, status, created_at, updated_at 
            FROM insomea_tech.users 
            WHERE LOWER(email) = LOWER($1)
        `, [email]);
        return result.rows[0];
    }

    static async create(userData) {
        const { email, name, role, status = 'Active' } = userData;
        const result = await db.query(`
            INSERT INTO insomea_tech.users (email, name, role, status)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, name, role, status, created_at, updated_at
        `, [email, name, role, status]);
        return result.rows[0];
    }

    static async update(id, userData) {
        const { email, name, role, status } = userData;
        const result = await db.query(`
            UPDATE insomea_tech.users 
            SET email = $1, name = $2, role = $3, status = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING id, email, name, role, status, created_at, updated_at
        `, [email, name, role, status, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(`
            DELETE FROM insomea_tech.users 
            WHERE id = $1
            RETURNING id
        `, [id]);
        return result.rows[0];
    }
}

module.exports = User;