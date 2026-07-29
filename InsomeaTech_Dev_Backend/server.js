require('dotenv').config(); // Add this at the very top
const app = require('./src/app');
const db = require('./src/models/database'); // Import database connection
const expirationCron = require('./src/utils/expirationCron');
const SystemSetting = require('./src/models/systemSetting');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await db.connect();
        
        // Initialize settings table
        await SystemSetting.initTable();

        // Initialize cron jobs
        expirationCron.init();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();