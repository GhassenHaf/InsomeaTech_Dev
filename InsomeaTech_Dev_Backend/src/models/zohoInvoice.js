const db = require('./database');

class ZohoInvoice {
    static async findAll() {
        const result = await db.query(`
            SELECT id, zoho_invoice_id, zoho_invoice_number, json_zoho, xml_no_sign, xml_with_sign, ttn_ref, ttn_code, status, user_id, errors, created_at, updated_at 
            FROM insomea_tech.zoho_invoices 
            ORDER BY created_at DESC
        `);
        return result.rows;
    }

    static async findById(id) {
        const result = await db.query(`
            SELECT id, zoho_invoice_id, zoho_invoice_number, json_zoho, xml_no_sign, xml_with_sign, ttn_ref, ttn_code, status, user_id, errors, created_at, updated_at 
            FROM insomea_tech.zoho_invoices 
            WHERE id = $1
        `, [id]);
        return result.rows[0];
    }

    static async create(invoiceData) {
        const { 
            zoho_invoice_id,
            zoho_invoice_number,
            json_zoho, 
            xml_no_sign, 
            xml_with_sign, 
            ttn_ref, 
            ttn_code, 
            status = 'Draft', 
            user_id,
            errors
        } = invoiceData;

        const result = await db.query(`
            INSERT INTO insomea_tech.zoho_invoices (
                zoho_invoice_id, zoho_invoice_number, json_zoho, xml_no_sign, xml_with_sign, ttn_ref, ttn_code, status, user_id, errors
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [zoho_invoice_id, zoho_invoice_number, json_zoho, xml_no_sign, xml_with_sign, ttn_ref, ttn_code, status, user_id, errors]);
        
        return result.rows[0];
    }

    static async update(id, invoiceData) {
        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(invoiceData)) {
            if (value !== undefined) {
                fields.push(`${key} = $${index}`);
                values.push(value);
                index++;
            }
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE insomea_tech.zoho_invoices 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${index}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await db.query(`
            DELETE FROM insomea_tech.zoho_invoices 
            WHERE id = $1
            RETURNING id
        `, [id]);
        return result.rows[0];
    }

    static async appendErrorLog(id, logEntry) {
        // Generate a unique key based on timestamp
        const logKey = `log_${new Date().getTime()}`;
        const logData = { [logKey]: logEntry };

        const query = `
            UPDATE insomea_tech.zoho_invoices 
            SET errors = COALESCE(errors, '{}'::jsonb) || $1::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const result = await db.query(query, [JSON.stringify(logData), id]);
        return result.rows[0];
    }
}

module.exports = ZohoInvoice;
