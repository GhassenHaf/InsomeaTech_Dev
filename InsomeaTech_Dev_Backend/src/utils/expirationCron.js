const cron = require('node-cron');
const CustomerProduct = require('../models/customerProduct');
const User = require('../models/user');
const emailService = require('./emailService');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/cron.log' })
    ]
});

// Function to check for expiring products and send emails
async function checkExpiringProducts() {
    try {
        logger.info('Starting daily check for expiring products (60 days window)...');

        // 1. Get all customer products expiring in the next 60 days
        // Note: We'll modify CustomerProduct.findAll to support a date range filter
        const expiringProducts = await CustomerProduct.findAll({ expiringSoon: 60 });

        if (expiringProducts.length === 0) {
            logger.info('No products expiring in the next 60 days.');
            return;
        }

        // 2. Group products by Sales Person
        const productsBySalesPerson = {};

        for (const product of expiringProducts) {
            // Use sales_person_id from the customer joined in CustomerProduct
            // We need to ensure CustomerProduct model joins with Customer to get sales_person_id
            const salesPersonId = product.sales_person_id;
            
            if (!salesPersonId) {
                logger.warn(`Product ${product.id} has no assigned sales person for customer ${product.customer_name}`);
                continue;
            }

            if (!productsBySalesPerson[salesPersonId]) {
                productsBySalesPerson[salesPersonId] = {
                    email: '', // Will fetch below
                    name: product.sales_person_name,
                    products: []
                };
            }
            productsBySalesPerson[salesPersonId].products.push(product);
        }

        // 3. For each Sales Person, fetch their email and send one summary email
        for (const salesPersonId in productsBySalesPerson) {
            const group = productsBySalesPerson[salesPersonId];
            
            // Get sales person details (to get email)
            const salesPerson = await User.findById(salesPersonId);
            if (!salesPerson || !salesPerson.email) {
                logger.error(`Could not find email for Sales Person ID: ${salesPersonId}`);
                continue;
            }

            // Build Email Content (Table of products)
            let productRows = '';
            for (const p of group.products) {
                productRows += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${p.customer_name}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${p.product_name}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${new Date(p.expiration_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${p.quantity}</td>
                    </tr>
                `;
            }

            const htmlContent = `
                <h3>Daily Expiration Digest</h3>
                <p>Hello ${salesPerson.name},</p>
                <p>The following products managed by you are expiring in the next 60 days:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Customer</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Product</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Expiration Date</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productRows}
                    </tbody>
                </table>
                <hr>
                <p>This is an automated notification from Insomea Tech.</p>
            `;

            await emailService.sendEmail(
                salesPerson.email, 
                `[Action Required] Expiring Licenses Digest - ${new Date().toLocaleDateString()}`, 
                htmlContent
            );
        }

        logger.info('Daily expiration check completed.');
    } catch (error) {
        logger.error('Error in checkExpiringProducts cron job:', error);
    }
}

// Schedule the task to run every day at 8:00 AM
// cron.schedule('0 8 * * *', () => { ... });
// For testing purposes, we can provide a way to trigger it

module.exports = {
    checkExpiringProducts,
    init: () => {
        // Run every day at 10:00 AM
        cron.schedule('0 10 * * *', () => {
            checkExpiringProducts();
        });
        logger.info('Expiration Cron Job scheduled for 10:00 daily');
    }
};