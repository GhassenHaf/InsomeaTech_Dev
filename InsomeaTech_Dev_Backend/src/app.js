require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const db = require('./models/database');
const passport = require('./config/auth');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const distiRoutes = require('./routes/distiRoutes');
const orderRoutes = require('./routes/orderRoutes');
const orderLineRoutes = require('./routes/orderLineRoutes');
const customerProductRoutes = require('./routes/customerProductRoutes');
const auditRoutes = require('./routes/auditRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const zohoInvoiceRoutes = require('./routes/zohoInvoiceRoutes');

const app = express();

// Trust reverse proxy headers from Azure App Service
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Body parsing middleware (must precede auth routes to handle form_post callbacks)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Determine if running in a secure environment
const isSecure = process.env.NODE_ENV === 'production' || (process.env.AZURE_CALLBACK_URL && process.env.AZURE_CALLBACK_URL.startsWith('https'));

// Session configuration using Azure PostgreSQL store
app.use(session({
    store: new PgSession({
        pool: db.pool || db,
        schemaName: 'insomea_tech',
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Dynamic CORS configuration allowing preflight requests and credentials
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://app-insomea-frontend-dev-d3g2f5ayf6bcc5g4.swedencentral-01.azurewebsites.net'
].map(url => url ? url.replace(/\/$/, '') : '').filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, server-to-server, postman)
        if (!origin) return callback(null, true);

        const cleanOrigin = origin.replace(/\/$/, '');
        if (allowedOrigins.includes(cleanOrigin)) {
            return callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            return callback(null, false); // Return false instead of throwing Error to prevent 500 without headers
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));


app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
        success: false,
        error: "Too many requests, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Swagger UI setup
try {
    const swaggerDocument = fs.readFileSync(path.join(__dirname, '../swagger.yaml'), 'utf8');
    const yaml = require('js-yaml');
    const swaggerSpec = yaml.load(swaggerDocument);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} catch (err) {
    console.warn('Swagger specification load skipped:', err.message);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/distributors', distiRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orderlines', orderLineRoutes);
app.use('/api/customerproducts', customerProductRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/zoho-invoices', zohoInvoiceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        success: false
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found', success: false });
});

module.exports = app;
