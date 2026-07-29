const db = require('./database');

class Product {
    static async findAll(filters = {}) {
        let baseQuery = `FROM insomea_tech.products`;
        let countQuery = `SELECT COUNT(*) as total FROM insomea_tech.products`;
        let selectQuery = `SELECT id, name, sku, description, billing_cycle, term, category, list_price, segment, status, created_at, updated_at`;
        
        const params = [];
        let paramIndex = 1;
        let whereClause = '';

        if (filters.status) {
            whereClause += whereClause ? ` AND status = $${paramIndex}` : ` WHERE status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.category) {
            whereClause += whereClause ? ` AND category = $${paramIndex}` : ` WHERE category = $${paramIndex}`;
            params.push(filters.category);
            paramIndex++;
        }

        if (filters.segment) {
            whereClause += whereClause ? ` AND segment = $${paramIndex}` : ` WHERE segment = $${paramIndex}`;
            params.push(filters.segment);
            paramIndex++;
        }

        if (filters.billing_cycle) {
            whereClause += whereClause ? ` AND billing_cycle = $${paramIndex}` : ` WHERE billing_cycle = $${paramIndex}`;
            params.push(filters.billing_cycle);
            paramIndex++;
        }

        if (filters.term) {
            whereClause += whereClause ? ` AND term = $${paramIndex}` : ` WHERE term = $${paramIndex}`;
            params.push(filters.term);
            paramIndex++;
        }

        if (filters.search) {
            const searchCondition = `(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex + 1})`;
            whereClause += whereClause ? ` AND ${searchCondition}` : ` WHERE ${searchCondition}`;
            params.push(`%${filters.search}%`, `%${filters.search}%`);
            paramIndex += 2;
        }

        // Add where clause to queries
        if (whereClause) {
            baseQuery += whereClause;
            countQuery += whereClause;
        }

        // Get total count
        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);

        // Add sorting and pagination
        let query = `${selectQuery} ${baseQuery} ORDER BY created_at DESC`;
        
        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(filters.limit);
            paramIndex++;
        }

        if (filters.offset) {
            query += ` OFFSET $${paramIndex}`;
            params.push(filters.offset);
            paramIndex++;
        }
        
        const result = await db.query(query, params);
        return { products: result.rows, total };
    }

    static async findById(id) {
        const result = await db.query(`
            SELECT id, name, sku, description, billing_cycle, term, category, list_price, segment, status, created_at, updated_at 
            FROM insomea_tech.products 
            WHERE id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findBySku(sku) {
        const result = await db.query(`
            SELECT id, name, sku, description, billing_cycle, term, category, list_price, segment, status, created_at, updated_at 
            FROM insomea_tech.products 
            WHERE sku = $1
        `, [sku]);
        return result.rows[0];
    }

    static async create(productData) {
        const { 
            name, 
            sku, 
            description, 
            billing_cycle, 
            term, 
            category, 
            list_price,
            segment,
            status = 'Active' 
        } = productData;

        const result = await db.query(`
            INSERT INTO insomea_tech.products (name, sku, description, billing_cycle, term, category, list_price, segment, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, name, sku, description, billing_cycle, term, category, list_price, segment, status, created_at, updated_at
        `, [name, sku, description, billing_cycle, term, category, list_price, segment, status]);
        return result.rows[0];
    }

    static async update(id, productData) {
        const { 
            name, 
            sku, 
            description, 
            billing_cycle, 
            term, 
            category, 
            list_price,
            segment,
            status 
        } = productData;

        const result = await db.query(`
            UPDATE insomea_tech.products 
            SET name = $1, sku = $2, description = $3, billing_cycle = $4, term = $5, 
                category = $6, list_price = $7, segment = $8, status = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING id, name, sku, description, billing_cycle, term, category, list_price, segment, status, created_at, updated_at
        `, [name, sku, description, billing_cycle, term, category, list_price, segment, status, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(`
            DELETE FROM insomea_tech.products 
            WHERE id = $1
            RETURNING id
        `, [id]);
        return result.rows[0];
    }
}

module.exports = Product;