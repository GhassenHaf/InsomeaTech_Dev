require('dotenv').config();
const { Pool } = require('pg');

async function updateCustomerEmails() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('Fetching customers...');
        const result = await pool.query('SELECT id, company_name FROM insomea_tech.customers');
        const customers = result.rows;

        console.log(`Found ${customers.length} customers. Starting update...`);

        for (const customer of customers) {
            // 1. Lowercase
            // 2. Replace accented chars (optional but good practice)
            // 3. Remove non-alphanumeric chars
            const sanitizedName = customer.company_name
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                .replace(/[^a-z0-9]/g, ''); // Remove spaces and special chars

            const generatedEmail = `${sanitizedName}@insomea.com`;

            console.log(`Updating [${customer.company_name}] -> ${generatedEmail}`);

            await pool.query(
                'UPDATE insomea_tech.customers SET email = $1 WHERE id = $2',
                [generatedEmail, customer.id]
            );
        }

        console.log('\nSUCCESS: All customer emails have been updated.');
    } catch (error) {
        console.error('\nERROR during update:', error.message);
    } finally {
        await pool.end();
    }
}

updateCustomerEmails();
