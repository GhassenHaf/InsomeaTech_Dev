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

// Database connection pool
let pool;

async function connectDB() {
    try {
        // Validate environment variables
        const requiredEnvVars = [
            'DB_HOST',
            'DB_PORT', 
            'DB_NAME',
            'DB_USER',
            'DB_PASSWORD'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }

        // Ensure password is a string
        const dbPassword = process.env.DB_PASSWORD || '';
        if (typeof dbPassword !== 'string' || dbPassword.trim() === '') {
            throw new Error('DB_PASSWORD must be a non-empty string');
        }

        logger.info('Attempting to connect to PostgreSQL...');
        logger.info(`Host: ${process.env.DB_HOST}`);
        logger.info(`Database: ${process.env.DB_NAME}`);
        logger.info(`User: ${process.env.DB_USER}`);

        pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: dbPassword, // Ensure this is a string
            ssl: process.env.DB_SSL === 'true' ? {
                rejectUnauthorized: false
            } : false,
            connectionTimeoutMillis: 5000,
            query_timeout: 60000,
            max: parseInt(process.env.DB_POOL_MAX) || 10,
            min: parseInt(process.env.DB_POOL_MIN) || 2,
            idleTimeoutMillis: 30000,
        });

        // Test connection
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        
        logger.info('PostgreSQL database connected successfully');
        logger.info(`Connected to: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
        logger.info(`Schema: ${process.env.DB_SCHEMA || 'public'}`);
        
        return pool;
    } catch (error) {
        logger.error('Database connection failed:', error.message);
        logger.error('Please check your .env file configuration');
        throw error;
    }
}

function getPool() {
    if (!pool) {
        throw new Error('Database not connected');
    }
    return pool;
}

module.exports = {
    connectDB,
    getPool
};