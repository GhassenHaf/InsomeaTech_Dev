const { Pool } = require('pg');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/database.log' })
    ]
});

const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        logger.error(`Missing required environment variable: ${envVar}`);
        // throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

const dbPassword = process.env.DB_PASSWORD || '';
if (typeof dbPassword !== 'string' || dbPassword.trim() === '') {
    logger.error('DB_PASSWORD must be a non-empty string');
    // throw new Error('DB_PASSWORD must be a non-empty string');
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: dbPassword,
    ssl:{
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000,
    query_timeout: 60000,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug('Executed query', { text: text.slice(0, 50) + '...', duration, rows: res.rowCount });
            return res;
        } catch (err) {
            logger.error('Error executing query', { text: text.slice(0, 50) + '...', error: err.message });
            throw err;
        }
    },
    async connect() {
        try {
            const client = await pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            logger.info('PostgreSQL database connected successfully');
            logger.info(`Connected to: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
            logger.info(`Schema: ${process.env.DB_SCHEMA || 'public'}`);
        } catch (error) {
            logger.error('Database connection failed:', error.message);
            logger.error('Please check your .env file configuration');
            throw error;
        }
    },
    async getClient() {
        return await pool.connect();
    }
};
