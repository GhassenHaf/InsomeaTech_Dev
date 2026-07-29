require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
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

// Trust proxy is required when running behind a reverse proxy (like Nginx, IIS, Azure App Service)
// This ensures that req.protocol is 'https' and cookies with 'secure: true' work correctly
app.set('trust proxy', 1);

// Determine if we are in a secure environment
// If NODE_ENV is production OR if the callback URL is HTTPS, we should treat cookies as secure for Azure AD compatibility
const isSecure = process.env.NODE_ENV === 'production' || (process.env.AZURE_CALLBACK_URL && process.env.AZURE_CALLBACK_URL.startsWith('https'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET ,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: isSecure, 
        sameSite: isSecure ? 'none' : 'lax', // 'none' is required for Azure AD OIDC POST callbacks
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        success: false,
        error: "Too many requests, please try again later."
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Read the swagger YAML file
const swaggerDocument = fs.readFileSync(path.join(__dirname, '../swagger.yaml'), 'utf8');

// Parse YAML to JSON
const yaml = require('js-yaml');
const swaggerSpec = yaml.load(swaggerDocument);

// Swagger UI middleware
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

// Error handling middleware
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