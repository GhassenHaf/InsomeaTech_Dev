const axios = require('axios');
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
        new winston.transports.File({ filename: 'logs/email.log' })
    ]
});

class EmailService {
    constructor() {
        this.tenantId = process.env.EMAIL_TENANT_ID;
        this.clientId = process.env.EMAIL_CLIENT_ID;
        this.clientSecret = process.env.EMAIL_CLIENT_SECRET;
        this.senderEmail = process.env.EMAIL_SENDER_ADDRESS;
        
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        // Check if token exists and is not expired (with 5 min buffer)
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) {
            return this.accessToken;
        }

        try {
            const params = new URLSearchParams();
            params.append('client_id', this.clientId);
            params.append('scope', 'https://graph.microsoft.com/.default');
            params.append('client_secret', this.clientSecret);
            params.append('grant_type', 'client_credentials');

            const url = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
            
            const response = await axios.post(url, params);
            
            this.accessToken = response.data.access_token;
            // expires_in is in seconds
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
            
            return this.accessToken;
        } catch (error) {
            logger.error('Error getting Graph API access token:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Microsoft Graph');
        }
    }

    async sendEmail(to, subject, htmlContent) {
        try {
            const token = await this.getAccessToken();
            const url = `https://graph.microsoft.com/v1.0/users/${this.senderEmail}/sendMail`;

            const emailPayload = {
                message: {
                    subject: subject,
                    body: {
                        contentType: 'HTML',
                        content: htmlContent
                    },
                    toRecipients: (Array.isArray(to) ? to : [to]).map(email => ({
                        emailAddress: {
                            address: email
                        }
                    }))
                },
                saveToSentItems: 'true'
            };

            await axios.post(url, emailPayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            logger.info('Email sent successfully', { to, subject });
            return { success: true };
        } catch (error) {
            console.error('Error sending email:', error);
            logger.error('Error sending email via Graph API:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    // Helper to send order notification
    async sendOrderNotification(recipients, order, action) {
        const subject = `Order Notification: Order #${order.order_number} ${action}`;
        const portalUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const orderLink = `${portalUrl}/pages/order/${order.id}`;
        
        // Determine status color
        let statusColor = '#4ac2ad'; // Default Teal
        if (order.status_order === 'Cancelled') statusColor = '#dc3545';
        else if (order.status_order === 'WaitingForFinanceApproval') statusColor = '#ffc107';
        else if (order.status_order === 'Done') statusColor = '#28a745';

        let notesSection = '';
        if (order.notes) {
            const formattedNotes = order.notes.replace(/\n/g, '<br>');
            const notesBg = action.toLowerCase().includes('cancelled') ? '#f8d7da' : '#f8f9fa';
            const notesBorder = action.toLowerCase().includes('cancelled') ? '#f5c6cb' : '#e9ecef';
            const notesText = action.toLowerCase().includes('cancelled') ? '#721c24' : '#495057';
            
            notesSection = `
                <div style="margin-top: 25px; padding: 15px; background-color: ${notesBg}; border-left: 4px solid ${notesBorder}; border-radius: 4px; color: ${notesText};">
                    <strong style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Notes / Reason</strong><br>
                    <div style="margin-top: 8px; font-size: 15px; line-height: 1.5;">${formattedNotes}</div>
                </div>
            `;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; }
                    .header { background-color: #2c3e50; padding: 25px; text-align: center; }
                    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
                    .content { padding: 30px; color: #333333; }
                    .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; color: #ffffff; font-weight: bold; font-size: 14px; background-color: ${statusColor}; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
                    .info-item { margin-bottom: 15px; }
                    .label { display: block; font-size: 12px; color: #888888; text-transform: uppercase; margin-bottom: 4px; }
                    .value { font-size: 16px; font-weight: 500; color: #2c3e50; }
                    .action-button { display: inline-block; margin-top: 30px; padding: 12px 24px; background-color: #4ac2ad; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; }
                    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Order</h1>
                    </div>
                    <div class="content">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin: 0; color: #2c3e50; font-size: 20px;">${action}</h2>
                            <span class="status-badge">${order.status_order}</span>
                        </div>
                        
                        <div style="background-color: #fafafa; padding: 20px; border-radius: 6px; border: 1px solid #eeeeee;">
                            <div class="info-item">
                                <span class="label">Order Number</span>
                                <span class="value">#${order.order_number}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Customer</span>
                                <span class="value">${order.customer_name || 'N/A'}</span>
                            </div>
                            <div class="info-item" style="margin-bottom: 0;">
                                <span class="label">Updated By</span>
                                <span class="value">${order.last_modified_by || order.created_by}</span>
                            </div>
                        </div>

                        ${notesSection}

                        <div style="text-align: center;">
                            <a href="${orderLink}" class="action-button" style="color: #ffffff;">View Order Details</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Insomea Tech CRM. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return this.sendEmail(recipients, subject, htmlContent);
    }
}

module.exports = new EmailService();